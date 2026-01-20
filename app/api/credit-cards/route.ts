import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const creditCardSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastDigits: z.string().length(4, 'Deve ter 4 dígitos').optional().nullable(),
  limit: z.number().positive('Limite deve ser positivo'),
  closingDay: z.number().int().min(1).max(28, 'Dia deve ser entre 1 e 28'),
  dueDay: z.number().int().min(1).max(28, 'Dia deve ser entre 1 e 28'),
  color: z.string().optional()
})

// Helper function to get or create invoice for a given date
export async function getOrCreateInvoice(
  creditCardId: string,
  purchaseDate: Date,
  closingDay: number,
  dueDay: number
) {
  // Determine which invoice this purchase belongs to
  const purchaseDay = purchaseDate.getDate()
  let invoiceMonth = purchaseDate.getMonth() + 1 // 1-indexed
  let invoiceYear = purchaseDate.getFullYear()
  
  // If purchase is after closing day, it goes to next month's invoice
  if (purchaseDay > closingDay) {
    invoiceMonth++
    if (invoiceMonth > 12) {
      invoiceMonth = 1
      invoiceYear++
    }
  }
  
  // Calculate closing and due dates for this invoice
  const closingDate = new Date(invoiceYear, invoiceMonth - 1, closingDay)
  const dueDate = new Date(invoiceYear, invoiceMonth - 1, dueDay)
  
  // If due day is before closing day, due date is in the next month
  if (dueDay < closingDay) {
    dueDate.setMonth(dueDate.getMonth() + 1)
  }
  
  // Try to find existing invoice or create new one
  let invoice = await prisma.creditCardInvoice.findUnique({
    where: {
      creditCardId_month_year: {
        creditCardId,
        month: invoiceMonth,
        year: invoiceYear
      }
    }
  })
  
  if (!invoice) {
    invoice = await prisma.creditCardInvoice.create({
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const workspaceId = (session.user as any).workspaceId

    const cards = await prisma.creditCard.findMany({
      where: { workspaceId },
      include: {
        invoices: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
          include: {
            purchases: {
              include: { category: true },
              orderBy: { purchaseDate: 'desc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate used amount and available limit for each card
    const cardsWithBalance = cards.map(card => {
      const currentInvoiceTotal = card.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
      return {
        ...card,
        usedAmount: currentInvoiceTotal,
        availableLimit: card.limit - currentInvoiceTotal
      }
    })

    return NextResponse.json(cardsWithBalance)
  } catch (error) {
    console.error('Error fetching credit cards:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cartões' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const data = creditCardSchema.parse(body)

    const workspaceId = (session.user as any).workspaceId

    const card = await prisma.creditCard.create({
      data: {
        name: data.name,
        lastDigits: data.lastDigits || null,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        color: data.color || '#8B5CF6',
        workspaceId
      }
    })

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating credit card:', error)
    return NextResponse.json(
      { error: 'Erro ao criar cartão' },
      { status: 500 }
    )
  }
}
