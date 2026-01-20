import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const goalUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().optional().nullable(),
  color: z.string().optional()
})

interface RouteContext {
  params: Promise<{ id: string }>
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
    const workspaceId = (session.user as any).workspaceId

    const body = await request.json()
    const data = goalUpdateSchema.parse(body)

    // Verify ownership
    const existingGoal = await prisma.goal.findFirst({
      where: { id, workspaceId }
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Objetivo não encontrado' }, { status: 404 })
    }

    const updateData: any = { ...data }
    if (data.deadline) {
      updateData.deadline = new Date(data.deadline)
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(goal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erro ao atualizar objetivo' },
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

    // Verify ownership and get goal with storage account
    const existingGoal = await prisma.goal.findFirst({
      where: { id, workspaceId },
      include: { storageAccount: true }
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Objetivo não encontrado' }, { status: 404 })
    }

    // Find all transactions related to this goal
    const relatedTransactions = await prisma.transaction.findMany({
      where: {
        workspaceId,
        OR: [
          { description: { contains: `Depósito em Objetivo: ${existingGoal.title}` } },
          { description: { contains: `Resgate de Objetivo: ${existingGoal.title}` } }
        ]
      }
    })

    // Build operations to reverse all transactions
    const operations: any[] = []

    for (const tx of relatedTransactions) {
      // Reverse the bank account balance
      // If it was EXPENSE (deposit into goal), add back to account
      // If it was INCOME (withdraw from goal), subtract from account
      const reverseAmount = tx.type === 'EXPENSE' ? tx.amount : -tx.amount
      
      operations.push(
        prisma.bankAccount.update({
          where: { id: tx.bankAccountId },
          data: { currentBalance: { increment: reverseAmount } }
        })
      )
    }

    // If there's a storage account, return money from it
    if (existingGoal.storageAccountId && existingGoal.currentAmount > 0) {
      operations.push(
        prisma.bankAccount.update({
          where: { id: existingGoal.storageAccountId },
          data: { currentBalance: { decrement: existingGoal.currentAmount } }
        })
      )
    }

    // Delete all related transactions
    operations.push(
      prisma.transaction.deleteMany({
        where: {
          id: { in: relatedTransactions.map(t => t.id) }
        }
      })
    )

    // Delete the goal
    operations.push(
      prisma.goal.delete({
        where: { id }
      })
    )

    // Execute all in a transaction
    await prisma.$transaction(operations)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir objetivo' },
      { status: 500 }
    )
  }
}
