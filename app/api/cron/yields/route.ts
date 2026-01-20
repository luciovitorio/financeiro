import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDailyCDI } from '@/lib/bcb'

export async function POST(request: Request) {
  try {
    // Security check: simple API Key check if needed, or allow public for local dev triggering
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

    const cdiData = await getDailyCDI()
    if (!cdiData) {
      return NextResponse.json({ error: 'Falha ao buscar taxa CDI' }, { status: 500 })
    }

    // CDI value comes as daily percentage already (e.g. 0.05)
    // Formula: Yield = Balance * (CDI * percentage_of_cdi / 100) / 100
    // Actually CDI value from BCB is usually % p.d. (percent per day) or % a.d?
    // BCB Code 12 is "% a.d." (percent per day). Example: 0.050788
    // So if I have R$ 1000, yield is 1000 * (0.050788/100) = R$ 0.50
    // And apply the multiplier (e.g. 110% of CDI)

    const investmentAccounts = await prisma.bankAccount.findMany({
      where: {
        isInvestment: true,
        currentBalance: { gt: 0 } // Only positive balance yields
      }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let processedCount = 0

    for (const account of investmentAccounts) {
      // Skip if updated today already
      if (account.lastYieldUpdate) {
        const lastUpdate = new Date(account.lastYieldUpdate)
        lastUpdate.setHours(0, 0, 0, 0)
        if (lastUpdate.getTime() === today.getTime()) {
          continue
        }
      }

      // Check CDIPercentage
      const percentageOfCDI = account.cdiPercentage || 100
      
      // Calculate yield
      // CDI Value is percentage (e.g. 0.05). Need to divide by 100 to get decimal.
      // And multiply by percentage of CDI (100% = 1, 110% = 1.1)
      const cdiRate = cdiData.value / 100
      const multiplier = percentageOfCDI / 100
      
      const dailyYieldRate = cdiRate * multiplier
      const grossYield = account.currentBalance * dailyYieldRate

      // Create Transaction (GROSS)
      // Income Tax will be collected on withdrawal
      if (grossYield >= 0.01) {
        // Find a user to assign the transaction (workspace owner or first user)
        const user = await prisma.user.findFirst({
          where: { workspaceId: account.workspaceId }
        })

        if (!user) continue // Should not happen if workspace has users

        // Create Transaction
        await prisma.transaction.create({
          data: {
            description: `Rendimento Diário (${percentageOfCDI}% CDI)`,
            amount: grossYield,
            type: 'INCOME',
            date: new Date(),
            workspaceId: account.workspaceId,
            bankAccountId: account.id,
            createdById: user.id,
          }
        })

        // Update Account
        await prisma.bankAccount.update({
          where: { id: account.id },
          data: {
            currentBalance: { increment: grossYield },
            lastYieldUpdate: new Date()
          }
        })
        
        processedCount++
      } else {
        // Just update date to avoid re-checking today
         await prisma.bankAccount.update({
          where: { id: account.id },
          data: { lastYieldUpdate: new Date() }
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount,
      cdiDate: cdiData.date,
      cdiValue: cdiData.value 
    })

  } catch (error) {
    console.error('Yield Cron Error:', error)
    return NextResponse.json({ error: 'Erro no processamento' }, { status: 500 })
  }
}
