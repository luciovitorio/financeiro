import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  workspaceName: z.string().optional(),
  inviteCode: z.string().optional()
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, workspaceName, inviteCode } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já existe com este email' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    let workspace

    // Check if joining existing workspace via invite code
    if (inviteCode) {
      workspace = await prisma.workspace.findUnique({
        where: { inviteCode }
      })

      if (!workspace) {
        return NextResponse.json(
          { error: 'Código de convite inválido' },
          { status: 400 }
        )
      }
    } else {
      // Create new workspace
      workspace = await prisma.workspace.create({
        data: {
          name: workspaceName || `${name}'s Workspace`
        }
      })
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        workspaceId: workspace.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Usuário criado com sucesso',
      user
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}
