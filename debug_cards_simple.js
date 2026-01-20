const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const purchases = await prisma.creditCardPurchase.findMany({
    select: {
      description: true,
      totalAmount: true,
      invoice: {
        select: {
          month: true,
          year: true,
          status: true
        }
      }
    }
  })
  console.log(JSON.stringify(purchases, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
