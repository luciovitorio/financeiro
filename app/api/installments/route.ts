import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const installmentSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  totalAmount: z.number().positive('Valor deve ser positivo'),
  totalInstallments: z.number().int().min(2, 'Mínimo de 2 parcelas').max(48, 'Máximo de 48 parcelas'),
  startDate: z.string(),
  bankAccountId: z.string(),
  categoryId: z.string().optional().nullable()
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const workspaceId = (session.user as any).workspaceId

    const purchases = await prisma.installmentPurchase.findMany({
      where: { workspaceId },
      include: {
        category: true,
        bankAccount: true,
        transactions: {
          orderBy: { date: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate progress for each purchase
    const purchasesWithProgress = purchases.map(purchase => {
      const paidInstallments = purchase.transactions.filter(t => t.isPaid).length
      const overdueInstallments = purchase.transactions.filter(t => 
        !t.isPaid && new Date(t.date) < new Date()
      ).length
      
      return {
        ...purchase,
        paidInstallments,
        overdueInstallments,
        remainingInstallments: purchase.totalInstallments - paidInstallments,
        installmentAmount: purchase.totalAmount / purchase.totalInstallments,
        paidAmount: (purchase.totalAmount / purchase.totalInstallments) * paidInstallments,
        remainingAmount: (purchase.totalAmount / purchase.totalInstallments) * (purchase.totalInstallments - paidInstallments)
      }
    })

    return NextResponse.json(purchasesWithProgress)
  } catch (error) {
    console.error('Error fetching installment purchases:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar parcelamentos' },
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
    const data = installmentSchema.parse(body)

    const workspaceId = (session.user as any).workspaceId
    const userId = (session.user as any).id

    // Verify bank account belongs to workspace
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: data.bankAccountId, workspaceId }
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Conta bancária não encontrada' },
        { status: 404 }
      )
    }

    const installmentAmount = data.totalAmount / data.totalInstallments
    const startDate = new Date(data.startDate)

    // Create installment purchase and all transactions in a single transaction
    const purchase = await prisma.$transaction(async (tx) => {
      // Create the installment purchase
      const newPurchase = await tx.installmentPurchase.create({
        data: {
          description: data.description,
          totalAmount: data.totalAmount,
          totalInstallments: data.totalInstallments,
          startDate,
          workspaceId,
          bankAccountId: data.bankAccountId,
          categoryId: data.categoryId || null
        }
      })

      // Create transactions for each installment
      const transactions = []
      for (let i = 0; i < data.totalInstallments; i++) {
        const transactionDate = new Date(startDate)
        transactionDate.setMonth(transactionDate.getMonth() + i)

        const transaction = await tx.transaction.create({
          data: {
            description: `${data.description} (${i + 1}/${data.totalInstallments})`,
            amount: installmentAmount,
            type: 'EXPENSE',
            date: transactionDate,
            workspaceId,
            bankAccountId: data.bankAccountId,
            categoryId: data.categoryId || null,
            createdById: userId,
            installmentPurchaseId: newPurchase.id,
            installmentNumber: i + 1
          }
        })
        transactions.push(transaction)
      }

      return newPurchase
    })

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating installment purchase:', error)
    return NextResponse.json(
      { error: 'Erro ao criar parcelamento' },
      { status: 500 }
    )
  }
}
