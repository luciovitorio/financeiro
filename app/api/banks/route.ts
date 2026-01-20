import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bankAccountSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  initialBalance: z.number(),
  color: z.string().default('#059669'),
  icon: z.string().default('Wallet'),
  isInvestment: z.boolean().default(false),
  cdiPercentage: z.number().optional().nullable(),
  maturityDate: z.string().optional().nullable()
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const workspaceId = (session.user as any).workspaceId

    const accounts = await prisma.bankAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar contas' },
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
    const { 
      name, 
      initialBalance, 
      color, 
      icon,
      isInvestment,
      cdiPercentage,
      maturityDate
    } = bankAccountSchema.parse(body)

    const workspaceId = (session.user as any).workspaceId

    const maturityDateObj = maturityDate ? new Date(maturityDate) : null

    const account = await prisma.bankAccount.create({
      data: {
        name,
        initialBalance,
        currentBalance: initialBalance,
        totalInvested: initialBalance, // Initialize principal
        color,
        icon,
        workspaceId,
        isInvestment,
        cdiPercentage,
        maturityDate: maturityDateObj
      }
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating bank account:', error)
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    )
  }
}
