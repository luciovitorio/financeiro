import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const transactionSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  amount: z.number().positive('Valor deve ser positivo'),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.string(),
  categoryId: z.string().optional().nullable(),
  bankAccountId: z.string(),
  notes: z.string().optional(),
  isPaid: z.boolean().optional()
})

type RouteContext = {
  params: Promise<{ id: string }>
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

    const { id } = await context.params
    const workspaceId = (session.user as any).workspaceId
    
    const transaction = await prisma.transaction.findFirst({
      where: { id, workspaceId },
      include: {
        category: true,
        bankAccount: true
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar transação' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const data = transactionSchema.parse(body)

    const workspaceId = (session.user as any).workspaceId

    // Get existing transaction
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, workspaceId }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    const wasPaid = existingTransaction.isPaid
    const isNowPaid = (data as any).isPaid ?? wasPaid // Default to existing if not sent

    // Calculate balance impacts
    const oldBalanceImpact = wasPaid 
      ? (existingTransaction.type === 'INCOME' ? existingTransaction.amount : -existingTransaction.amount)
      : 0

    const newBalanceImpact = isNowPaid
      ? (data.type === 'INCOME' ? data.amount : -data.amount)
      : 0

    // Check if bank account changed
    const bankAccountChanged = existingTransaction.bankAccountId !== data.bankAccountId
    
    // Prepare transaction operations
    const dbOperations: any[] = []

    // 1. Revert old impact on OLD bank account (if it was paid)
    if (wasPaid) {
      dbOperations.push(
        prisma.bankAccount.update({
          where: { id: existingTransaction.bankAccountId },
          data: { currentBalance: { decrement: oldBalanceImpact } }
        })
      )
    }

    // 2. Apply new impact on NEW bank account (if it is now paid)
    if (isNowPaid) {
      // Verify new bank account exists if it changed
      if (bankAccountChanged) {
        const newBankAccount = await prisma.bankAccount.findFirst({
          where: { id: data.bankAccountId, workspaceId }
        })
        if (!newBankAccount) {
          return NextResponse.json({ error: 'Conta bancária não encontrada' }, { status: 404 })
        }
      }

      dbOperations.push(
        prisma.bankAccount.update({
          where: { id: data.bankAccountId },
          data: { currentBalance: { increment: newBalanceImpact } }
        })
      )
    }

    // 3. Update Transaction Record
    dbOperations.push(
      prisma.transaction.update({
        where: { id },
        data: {
          description: data.description,
          amount: data.amount,
          type: data.type,
          date: new Date(data.date),
          notes: data.notes,
          categoryId: data.categoryId || null,
          bankAccountId: data.bankAccountId,
          isPaid: isNowPaid,
          paidAt: isNowPaid && !wasPaid ? new Date() : (isNowPaid ? existingTransaction.paidAt : null)
        }
      })
    )

    await prisma.$transaction(dbOperations)

    const updatedTransaction = await prisma.transaction.findUnique({
      where: { id },
      include: { category: true, bankAccount: true }
    })

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar transação' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await context.params
    const workspaceId = (session.user as any).workspaceId

    const existingTransaction = await prisma.transaction.findFirst({
      where: { id, workspaceId }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    // Revert balance change
    const balanceChange = existingTransaction.type === 'INCOME' 
      ? -existingTransaction.amount 
      : existingTransaction.amount

    await prisma.$transaction([
      prisma.bankAccount.update({
        where: { id: existingTransaction.bankAccountId },
        data: { currentBalance: { increment: balanceChange } }
      }),
      prisma.transaction.delete({
        where: { id }
      })
    ])

    return NextResponse.json({ message: 'Transação deletada com sucesso' })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar transação' },
      { status: 500 }
    )
  }
}
