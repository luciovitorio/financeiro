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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const bankAccountId = searchParams.get('bankAccountId')

    const status = searchParams.get('status') // 'paid', 'pending', or null

    const workspaceId = (session.user as any).workspaceId

    // Build filters
    const where: any = { workspaceId }
    
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      where.type = type
    }
    
    if (bankAccountId) {
      where.bankAccountId = bankAccountId
    }

    if (status === 'paid') {
      where.isPaid = true
    } else if (status === 'pending') {
      where.isPaid = false
    }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0)
      where.date = {
        gte: startDate,
        lte: endDate
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        bankAccount: true,
        createdBy: {
          select: { name: true }
        }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar transações' },
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
    const data = transactionSchema.parse(body)

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

    // Calculate new balance
    const balanceChange = data.type === 'INCOME' ? data.amount : -data.amount
    const newBalance = bankAccount.currentBalance + balanceChange

    // Create transaction and update balance in a transaction
    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          description: data.description,
          amount: data.amount,
          type: data.type,
          date: new Date(data.date),
          notes: data.notes,
          categoryId: data.categoryId || null,
          bankAccountId: data.bankAccountId,
          workspaceId,
          createdById: userId,
          isPaid: (data as any).isPaid ?? true, // Default to true for backward compatibility
          paidAt: (data as any).isPaid ? new Date() : null
        },
        include: {
          category: true,
          bankAccount: true
        }
      }),
      // Only update balance if isPaid is true
      ...((data as any).isPaid !== false ? [
        prisma.bankAccount.update({
          where: { id: data.bankAccountId },
          data: { 
            currentBalance: newBalance,
            totalInvested: ((bankAccount as any).isInvestment && data.type === 'INCOME') 
              ? { increment: data.amount } 
              : undefined
          } as any
        })
      ] : [])
    ])

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Erro ao criar transação' },
      { status: 500 }
    )
  }
}
