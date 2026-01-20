import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{ id: string }>
}

// Mark a transaction as paid
export async function POST(
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
    
    // Verify transaction belongs to workspace
    const transaction = await prisma.transaction.findFirst({
      where: { id, workspaceId }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    if (transaction.isPaid) {
      return NextResponse.json(
        { error: 'Transação já foi paga' },
        { status: 400 }
      )
    }

    // Get bank account
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: transaction.bankAccountId }
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Conta bancária não encontrada' },
        { status: 404 }
      )
    }

    // Mark as paid and update balance
    const balanceChange = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount

    await prisma.$transaction([
      prisma.transaction.update({
        where: { id },
        data: { 
          isPaid: true,
          paidAt: new Date()
        }
      }),
      prisma.bankAccount.update({
        where: { id: transaction.bankAccountId },
        data: { currentBalance: { increment: balanceChange } }
      })
    ])

    return NextResponse.json({ message: 'Transação marcada como paga' })
  } catch (error) {
    console.error('Error marking transaction as paid:', error)
    return NextResponse.json(
      { error: 'Erro ao marcar transação como paga' },
      { status: 500 }
    )
  }
}

// Unmark a transaction as paid
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
    
    const transaction = await prisma.transaction.findFirst({
      where: { id, workspaceId }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    if (!transaction.isPaid) {
      return NextResponse.json(
        { error: 'Transação não está marcada como paga' },
        { status: 400 }
      )
    }

    // Revert balance change
    const balanceChange = transaction.type === 'INCOME' ? -transaction.amount : transaction.amount

    await prisma.$transaction([
      prisma.transaction.update({
        where: { id },
        data: { 
          isPaid: false,
          paidAt: null
        }
      }),
      prisma.bankAccount.update({
        where: { id: transaction.bankAccountId },
        data: { currentBalance: { increment: balanceChange } }
      })
    ])

    return NextResponse.json({ message: 'Pagamento desmarcado' })
  } catch (error) {
    console.error('Error unmarking transaction as paid:', error)
    return NextResponse.json(
      { error: 'Erro ao desmarcar pagamento' },
      { status: 500 }
    )
  }
}
