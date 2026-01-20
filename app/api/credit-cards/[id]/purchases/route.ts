import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string }>
}

const purchaseSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  totalAmount: z.number().positive('Valor deve ser positivo'),
  installments: z.number().int().min(1).max(48).default(1),
  purchaseDate: z.string(),
  categoryId: z.string().optional().nullable()
})

// Helper function to get or create invoice
async function getOrCreateInvoiceInTx(
  tx: typeof prisma,
  creditCardId: string,
  purchaseDate: Date,
  closingDay: number,
  dueDay: number
) {
  const purchaseDay = purchaseDate.getDate()
  let invoiceMonth = purchaseDate.getMonth() + 1
  let invoiceYear = purchaseDate.getFullYear()
  
  if (purchaseDay > closingDay) {
    invoiceMonth++
    if (invoiceMonth > 12) {
      invoiceMonth = 1
      invoiceYear++
    }
  }
  
  const closingDate = new Date(invoiceYear, invoiceMonth - 1, closingDay)
  const dueDate = new Date(invoiceYear, invoiceMonth - 1, dueDay)
  
  if (dueDay < closingDay) {
    dueDate.setMonth(dueDate.getMonth() + 1)
  }
  
  let invoice = await tx.creditCardInvoice.findUnique({
    where: {
      creditCardId_month_year: {
        creditCardId,
        month: invoiceMonth,
        year: invoiceYear
      }
    }
  })
  
  if (!invoice) {
    invoice = await tx.creditCardInvoice.create({
      data: {
        creditCardId,
        month: invoiceMonth,
        year: invoiceYear,
        closingDate,
        dueDate,
        totalAmount: 0,
        status: 'OPEN'
      }
    })
  }
  
  return invoice
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id: creditCardId } = await context.params
    const workspaceId = (session.user as any).workspaceId

    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, workspaceId }
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      )
    }

    const purchases = await prisma.creditCardPurchase.findMany({
      where: { creditCardId },
      include: {
        category: true,
        invoice: true
      },
      orderBy: { purchaseDate: 'desc' }
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar compras' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id: creditCardId } = await context.params
    const workspaceId = (session.user as any).workspaceId
    const body = await request.json()
    const data = purchaseSchema.parse(body)

    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, workspaceId }
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      )
    }

    const purchaseDate = new Date(data.purchaseDate)
    const installmentAmount = data.totalAmount / data.installments

    const purchases = await prisma.$transaction(async (tx) => {
      const createdPurchases = []
      let parentId: string | null = null
      
      for (let i = 0; i < data.installments; i++) {
        const installmentDate = new Date(purchaseDate)
        installmentDate.setMonth(installmentDate.getMonth() + i)
        
        const invoice = await getOrCreateInvoiceInTx(
          tx as typeof prisma,
          creditCardId,
          installmentDate,
          card.closingDay,
          card.dueDay
        )
        
        const description = data.installments > 1
          ? `${data.description} (${i + 1}/${data.installments})`
          : data.description
        
        const purchase = await tx.creditCardPurchase.create({
          data: {
            description,
            totalAmount: installmentAmount,
            installments: data.installments,
            currentInstallment: i + 1,
            purchaseDate,
            creditCardId,
            invoiceId: invoice.id,
            categoryId: data.categoryId || null,
            parentPurchaseId: parentId
          }
        })
        
        if (i === 0) {
          parentId = purchase.id
        }
        
        await tx.creditCardInvoice.update({
          where: { id: invoice.id },
          data: { totalAmount: { increment: installmentAmount } }
        })
        
        createdPurchases.push(purchase)
      }
      
      return createdPurchases
    })

    return NextResponse.json(purchases[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating purchase:', error)
    return NextResponse.json(
      { error: 'Erro ao criar compra' },
      { status: 500 }
    )
  }
}
