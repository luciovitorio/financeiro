import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const goalSchema = z.object({
  title: z.string().min(2, 'O título deve ter pelo menos 2 caracteres'),
  targetAmount: z.number().positive('A meta deve ser positiva'),
  currentAmount: z.number().min(0).default(0),
  deadline: z.string().optional().nullable(),
  color: z.string().optional().default('#3b82f6'),
  storageAccountId: z.string().optional().nullable()
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const workspaceId = (session.user as any).workspaceId

    const goals = await prisma.goal.findMany({
      where: { workspaceId },
      orderBy: { deadline: 'asc' },
      include: { storageAccount: true }
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar objetivos' },
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
    const data = goalSchema.parse(body)

    const workspaceId = (session.user as any).workspaceId

    // Parse deadline date if present
    const deadline = data.deadline ? new Date(data.deadline) : null

    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        deadline,
        color: data.color,
        storageAccountId: data.storageAccountId || null,
        workspaceId
      }
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: 'Erro ao criar objetivo' },
      { status: 500 }
    )
  }
}
