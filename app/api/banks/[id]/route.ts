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
    
    const account = await prisma.bankAccount.findFirst({
      where: {
        id,
        workspaceId
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error fetching bank account:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar conta' },
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

    // Verify account belongs to user's workspace
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        id,
        workspaceId
      }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      )
    }

    // Calculate balance difference
    const balanceDiff = initialBalance - existingAccount.initialBalance
    const newCurrentBalance = existingAccount.currentBalance + balanceDiff

    const maturityDateObj = maturityDate ? new Date(maturityDate) : null

    const account = await prisma.bankAccount.update({
      where: { id },
      data: {
        name,
        initialBalance,
        currentBalance: newCurrentBalance,
        color,
        icon,
        isInvestment,
        cdiPercentage,
        maturityDate: maturityDateObj
      }
    })

    return NextResponse.json(account)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating bank account:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar conta' },
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

    // Verify account belongs to user's workspace
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        id,
        workspaceId
      }
    })

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      )
    }

    await prisma.bankAccount.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Conta deletada com sucesso' })
  } catch (error) {
    console.error('Error deleting bank account:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar conta' },
      { status: 500 }
    )
  }
}
