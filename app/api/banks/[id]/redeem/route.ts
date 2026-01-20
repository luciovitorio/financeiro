
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const redeemSchema = z.object({
  amount: z.number().min(0.01),
  destinationBankId: z.string().optional().nullable()
})

const routeContextSchema = z.object({
  params: z.promise(z.object({
    id: z.string()
  }))
})

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { amount, destinationBankId } = redeemSchema.parse(body)
    const workspaceId = (session.user as any).workspaceId

    // 1. Fetch Source Account
    const account = await prisma.bankAccount.findFirst({
      where: { id, workspaceId }
    })

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    if (amount > account.currentBalance) {
      return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
    }

    // 2. Calculate Tax
    const principal = account.totalInvested ?? account.initialBalance
    const totalProfit = Math.max(0, account.currentBalance - principal)
    const withdrawRatio = amount / account.currentBalance
    const proportionalProfit = totalProfit * withdrawRatio

    // Days since creation
    const daysSinceCreation = Math.floor((new Date().getTime() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      
    let taxRate = 0.225
    if (daysSinceCreation > 720) taxRate = 0.15
    else if (daysSinceCreation > 360) taxRate = 0.175
    else if (daysSinceCreation > 180) taxRate = 0.20

    const taxAmount = proportionalProfit * taxRate
    const netAmount = amount - taxAmount

    // 3. Transactions
    await prisma.$transaction(async (tx) => {
      // A. Tax Expense
      if (taxAmount > 0.009) { // Centavos check
         await tx.transaction.create({
          data: {
            description: `IR sobre Resgate (${(taxRate * 100).toFixed(1)}%)`,
            amount: taxAmount,
            type: 'EXPENSE',
            date: new Date(),
            workspaceId,
            bankAccountId: account.id,
            createdById: (session.user as any).id
            // category: left empty (system expense)
          }
         })
      }

      // B. Withdraw/Transfer the Net Amount
      if (destinationBankId) {
        // Transfer to another account
        const destAccount = await tx.bankAccount.findFirst({
            where: { id: destinationBankId, workspaceId }
        })

        if (!destAccount) throw new Error('Conta destino não encontrada')

        // Debit Source (Net Amount)
        // Actually, we need to debit the FULL amount from source eventually.
        // If we created a Tax Expense of 'taxAmount', we only need to debit 'netAmount' via Transfer.
        // Total debit = taxAmount + netAmount = amount. Correct.

        await tx.transaction.create({
            data: {
                description: `Resgate Investimento -> ${destAccount.name}`,
                amount: netAmount,
                type: 'EXPENSE', // Outflow from source
                date: new Date(),
                workspaceId,
                bankAccountId: account.id,
                createdById: (session.user as any).id
            }
        })

        // Credit Destination
        await tx.transaction.create({
            data: {
                description: `Resgate de ${account.name}`,
                amount: netAmount,
                type: 'INCOME', // Inflow to dest
                date: new Date(),
                workspaceId,
                bankAccountId: destAccount.id,
                createdById: (session.user as any).id
            }
        })

        // Update Destination Balance
        await tx.bankAccount.update({
            where: { id: destAccount.id },
            data: { currentBalance: { increment: netAmount } }
        })

      } else {
          // Simple Withdrawal (External)
          await tx.transaction.create({
            data: {
                description: 'Resgate Investimento',
                amount: netAmount,
                type: 'EXPENSE',
                date: new Date(),
                workspaceId,
                bankAccountId: account.id,
                createdById: (session.user as any).id
            }
        })
      }

      // C. Update Source Account (Balance and Principal)
      // Balance reduces by full 'amount' (tax + net)
      // Principal reduces by 'principal * withdrawRatio'
      const principalReduction = principal * withdrawRatio
      
      await tx.bankAccount.update({
        where: { id: account.id },
        data: {
            currentBalance: { decrement: amount },
            totalInvested: { decrement: principalReduction }
        }
      })
    })

    return NextResponse.json({ success: true, netAmount, taxAmount })

  } catch (error) {
    console.error('Redeem error:', error)
    return NextResponse.json({ error: 'Erro no resgate' }, { status: 500 })
  }
}
