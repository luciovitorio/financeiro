import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    
    const purchase = await prisma.installmentPurchase.findFirst({
      where: { id, workspaceId },
      include: {
        category: true,
        bankAccount: true,
        transactions: {
          orderBy: { installmentNumber: 'asc' }
        }
      }
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Parcelamento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Error fetching installment purchase:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar parcelamento' },
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

    const purchase = await prisma.installmentPurchase.findFirst({
      where: { id, workspaceId },
      include: {
        transactions: true
      }
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Parcelamento não encontrado' },
        { status: 404 }
      )
    }

    // Calculate how much was deducted from balance (due transactions)
    const now = new Date()
    const dueTransactions = purchase.transactions.filter(t => new Date(t.date) <= now)
    const totalDeducted = dueTransactions.reduce((sum, t) => sum + t.amount, 0)

    // Delete purchase and restore balance in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all related transactions first
      await tx.transaction.deleteMany({
        where: { installmentPurchaseId: id }
      })

      // Delete the purchase
      await tx.installmentPurchase.delete({
        where: { id }
      })

      // Restore balance
      if (totalDeducted > 0) {
        await tx.bankAccount.update({
          where: { id: purchase.bankAccountId },
          data: { currentBalance: { increment: totalDeducted } }
        })
      }
    })

    return NextResponse.json({ message: 'Parcelamento deletado com sucesso' })
  } catch (error) {
    console.error('Error deleting installment purchase:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar parcelamento' },
      { status: 500 }
    )
  }
}
