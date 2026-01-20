import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const depositSchema = z.object({
  amount: z.number(), // Can be positive (deposit) or negative (withdraw)
  bankAccountId: z.string().optional()
})

interface RouteContext {
  params: Promise<{ id: string }>
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

    const { id } = await context.params
    const workspaceId = (session.user as any).workspaceId
    const userId = (session.user as any).id

    const body = await request.json()
    const { amount, bankAccountId } = depositSchema.parse(body)

    // Verify ownership and get storage account
    const existingGoal = await prisma.goal.findFirst({
      where: { id, workspaceId },
      include: { storageAccount: true }
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Objetivo não encontrado' }, { status: 404 })
    }

    // Source account is required for transfers
    if (bankAccountId) {
      const sourceAccount = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, workspaceId }
      })

      if (!sourceAccount) {
        return NextResponse.json({ error: 'Conta de origem não encontrada' }, { status: 404 })
      }

      const operations: any[] = [
        // 1. Update Goal amount
        prisma.goal.update({
          where: { id },
          data: { currentAmount: { increment: amount } }
        }),
        // 2. Deduct from source account
        prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: { decrement: amount } }
        })
      ]

      // 3. If there's a storage account, add to it
      if (existingGoal.storageAccountId) {
        operations.push(
          prisma.bankAccount.update({
            where: { id: existingGoal.storageAccountId },
            data: { currentBalance: { increment: amount } }
          })
        )
      }

      // 4. Create Transaction Record (visible)
      operations.push(
        prisma.transaction.create({
          data: {
            description: amount > 0 
              ? `Depósito em Objetivo: ${existingGoal.title}`
              : `Resgate de Objetivo: ${existingGoal.title}`,
            amount: Math.abs(amount),
            type: amount > 0 ? 'EXPENSE' : 'INCOME',
            date: new Date(),
            workspaceId,
            bankAccountId,
            createdById: userId,
            categoryId: null,
            isPaid: true,
            paidAt: new Date()
          }
        })
      )

      await prisma.$transaction(operations)
    } else {
      // Just update goal if no bank account provided (manual adjustment)
      await prisma.goal.update({
        where: { id },
        data: { currentAmount: { increment: amount } }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }
    console.error('Error in deposit:', error)
    return NextResponse.json(
      { error: 'Erro ao processar transação' },
      { status: 500 }
    )
  }
}
