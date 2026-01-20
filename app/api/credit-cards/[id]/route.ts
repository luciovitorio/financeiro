import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string }>
}

const updateCardSchema = z.object({
  name: z.string().min(2).optional(),
  lastDigits: z.string().length(4).optional().nullable(),
  limit: z.number().positive().optional(),
  closingDay: z.number().int().min(1).max(28).optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  color: z.string().optional()
})

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
    
    const card = await prisma.creditCard.findFirst({
      where: { id, workspaceId },
      include: {
        invoices: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          include: {
            purchases: {
              include: { category: true }
            }
          }
        }
      }
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      )
    }

    // Calculate used amount
    const openInvoices = card.invoices.filter(inv => inv.status !== 'PAID')
    const usedAmount = openInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)

    return NextResponse.json({
      ...card,
      usedAmount,
      availableLimit: card.limit - usedAmount
    })
  } catch (error) {
    console.error('Error fetching credit card:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cartão' },
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
    const workspaceId = (session.user as any).workspaceId
    const body = await request.json()
    const data = updateCardSchema.parse(body)

    const existingCard = await prisma.creditCard.findFirst({
      where: { id, workspaceId }
    })

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      )
    }

    const card = await prisma.creditCard.update({
      where: { id },
      data: {
        name: data.name ?? existingCard.name,
        lastDigits: data.lastDigits !== undefined ? data.lastDigits : existingCard.lastDigits,
        limit: data.limit ?? existingCard.limit,
        closingDay: data.closingDay ?? existingCard.closingDay,
        dueDay: data.dueDay ?? existingCard.dueDay,
        color: data.color ?? existingCard.color
      }
    })

    return NextResponse.json(card)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating credit card:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar cartão' },
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

    const card = await prisma.creditCard.findFirst({
      where: { id, workspaceId }
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      )
    }

    await prisma.creditCard.delete({ where: { id } })

    return NextResponse.json({ message: 'Cartão deletado com sucesso' })
  } catch (error) {
    console.error('Error deleting credit card:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar cartão' },
      { status: 500 }
    )
  }
}
