const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('--- Credit Cards ---')
  const cards = await prisma.creditCard.findMany()
  console.log(cards)

  console.log('\n--- Credit Card Purchases ---')
  const purchases = await prisma.creditCardPurchase.findMany({
    include: { invoice: true }
  })
  console.log(JSON.stringify(purchases, null, 2))

  console.log('\n--- Transactions (checking for confusion) ---')
  const transactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  })
  console.log(transactions)
  
  console.log('\n--- Invoices ---')
  const invoices = await prisma.creditCardInvoice.findMany()
  console.log(invoices)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
