import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string; invoiceId: string }>
}

const payInvoiceSchema = z.object({
  bankAccountId: z.string()
})

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id: creditCardId, invoiceId } = await context.params
    const workspaceId = (session.user as any).workspaceId
    const body = await request.json()
    const data = payInvoiceSchema.parse(body)

    // Verify card belongs to workspace
    const card = await prisma.creditCard.findFirst({
      where: { id: creditCardId, workspaceId }
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Cartão não encontrado' },
        { status: 404 }
      )
    }

    // Verify invoice
    const invoice = await prisma.creditCardInvoice.findFirst({
      where: { id: invoiceId, creditCardId }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Fatura não encontrada' },
        { status: 404 }
      )
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Fatura já foi paga' },
        { status: 400 }
      )
    }

    // Verify bank account
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: data.bankAccountId, workspaceId }
    })

    if (!bankAccount) {
      return NextResponse.json(
        { error: 'Conta bancária não encontrada' },
        { status: 404 }
      )
    }

    // Pay the invoice and deduct from bank account
    await prisma.$transaction([
      prisma.creditCardInvoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paidFromAccountId: data.bankAccountId
        }
      }),
      prisma.bankAccount.update({
        where: { id: data.bankAccountId },
        data: { currentBalance: { decrement: invoice.totalAmount } }
      })
    ])

    return NextResponse.json({ message: 'Fatura paga com sucesso' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error paying invoice:', error)
    return NextResponse.json(
      { error: 'Erro ao pagar fatura' },
      { status: 500 }
    )
  }
}
