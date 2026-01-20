import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await request.json()
  const workspaceId = (session.user as any).workspaceId

  if (!data.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  try {
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: data.name
      }
    })

    return NextResponse.json(updatedWorkspace)
  } catch (error) {
    return NextResponse.json({ error: 'Error updating workspace' }, { status: 500 })
  }
}
