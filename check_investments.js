const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkInvestmentAccounts() {
  console.log("🔍 Checking Investment Accounts...\n");

  const accounts = await prisma.bankAccount.findMany({
    where: { isInvestment: true },
    include: {
      transactions: {
        where: {
          description: {
            contains: "Rendimento",
          },
        },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  for (const account of accounts) {
    console.log(`\n📊 Account: ${account.name}`);
    console.log(`   ID: ${account.id}`);
    console.log(`   Current Balance: R$ ${account.currentBalance.toFixed(2)}`);
    console.log(`   Initial Balance: R$ ${account.initialBalance.toFixed(2)}`);
    console.log(`   CDI Percentage: ${account.cdiPercentage}%`);
    console.log(`   Last Yield Update: ${account.lastYieldUpdate}`);
    console.log(`   Created At: ${account.createdAt}`);

    console.log(
      `\n   📈 Recent Yield Transactions (${account.transactions.length}):`,
    );
    for (const tx of account.transactions) {
      console.log(
        `      - ${tx.date.toISOString().split("T")[0]}: R$ ${tx.amount.toFixed(2)} - ${tx.description}`,
      );
    }

    const totalYield = account.transactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
    console.log(
      `   💰 Total Yield from transactions: R$ ${totalYield.toFixed(2)}`,
    );
    console.log(
      `   🎯 Difference (Current - Initial): R$ ${(account.currentBalance - account.initialBalance).toFixed(2)}`,
    );
  }

  await prisma.$disconnect();
}

checkInvestmentAccounts().catch(console.error);
