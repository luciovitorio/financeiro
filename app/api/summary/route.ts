import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')
  const bankAccountId = searchParams.get('bankAccountId')
  
  const workspaceId = (session.user as any).workspaceId

  if (!month || !year) {
    return NextResponse.json({ error: 'Month and Year required' }, { status: 400 })
  }

  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)

  const where: any = {
    workspaceId,
    date: {
      lt: startDate
    },
    isPaid: true
  }

  if (bankAccountId && bankAccountId !== 'all') {
    where.bankAccountId = bankAccountId
  }

  const [income, expense, creditCardPurchases] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { ...where, type: 'INCOME' }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { ...where, type: 'EXPENSE' }
    }),
    prisma.creditCardPurchase.aggregate({
      _sum: { totalAmount: true },
      where: {
        creditCard: { workspaceId },
        invoice: {
          month: parseInt(month),
          year: parseInt(year)
        }
      }
    })
  ])

  const previousBalance = (income._sum.amount || 0) - (expense._sum.amount || 0)
  const creditCardBill = creditCardPurchases._sum.totalAmount || 0

  return NextResponse.json({ previousBalance, creditCardBill })
}
