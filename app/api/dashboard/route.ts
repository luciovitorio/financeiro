import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = (session.user as any).workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
  }

  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Current Calendar Week (Monday to Sunday)
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // execute all queries in parallel
  const [
    bankAccounts,
    monthlyTransactions,
    pendingCount,
    weeklyTransactions,
    goals,
    categoryTransactions,
  ] = await Promise.all([
    // 1. Total Balance
    prisma.bankAccount.findMany({
      where: { workspaceId },
      select: { currentBalance: true },
    }),
    // 2. Monthly Income & Expenses
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        workspaceId,
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    // 3. Pending Transactions (Count)
    prisma.transaction.count({
      where: {
        workspaceId,
        isPaid: false,
        date: { lte: monthEnd },
      },
    }),
    // 4. Weekly Data (Current Calendar Week)
    prisma.transaction.findMany({
      where: {
        workspaceId,
        date: { gte: currentWeekStart, lte: currentWeekEnd },
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
    }),
    // 5. Goals
    prisma.goal.findMany({
      where: { workspaceId },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    // 6. Transactions by Category (for pie charts)
    prisma.transaction.findMany({
      where: {
        workspaceId,
        date: { gte: monthStart, lte: monthEnd },
        categoryId: { not: null },
      },
      select: {
        amount: true,
        type: true,
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    }),
  ]);

  // Process Data
  const totalBalance = bankAccounts.reduce(
    (acc, account) => acc + account.currentBalance,
    0,
  );

  const income =
    monthlyTransactions.find((t) => t.type === "INCOME")?._sum.amount || 0;
  const expense =
    monthlyTransactions.find((t) => t.type === "EXPENSE")?._sum.amount || 0;

  // Process weekly data (Mon-Sun)
  const weeklyDataMap = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < 7; i++) {
    const d = addDays(currentWeekStart, i);
    const dateKey = format(d, "yyyy-MM-dd");
    weeklyDataMap.set(dateKey, { income: 0, expense: 0 });
  }

  weeklyTransactions.forEach((t) => {
    const dateKey = format(t.date, "yyyy-MM-dd");
    if (weeklyDataMap.has(dateKey)) {
      const current = weeklyDataMap.get(dateKey)!;
      if (t.type === "INCOME") {
        current.income += t.amount;
      } else {
        current.expense += t.amount;
      }
    }
  });

  const weeklyChartData = Array.from(weeklyDataMap.entries()).map(
    ([dateStr, { income, expense }]) => {
      const date = new Date(dateStr);
      date.setHours(12);
      return {
        // Use 3 letters (EEE) to avoid duplicates (Seg, Ter, Qua...)
        day: format(date, "EEE", { locale: ptBR })
          .replace(".", "")
          .toUpperCase(),
        fullDay: format(date, "EEEE", { locale: ptBR }),
        income,
        expense,
      };
    },
  );

  // Process category data for pie charts
  const expensesByCategory: Record<
    string,
    { name: string; value: number; color: string }
  > = {};
  const incomeByCategory: Record<
    string,
    { name: string; value: number; color: string }
  > = {};

  // Color palette for categories (vibrant, distinct colors)
  const colorPalette = [
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#06b6d4",
    "#6366f1",
    "#84cc16",
    "#f43f5e",
  ];

  categoryTransactions.forEach((t) => {
    if (!t.category) return;

    const categoryId = t.category.id;
    if (t.type === "EXPENSE") {
      if (!expensesByCategory[categoryId]) {
        // Use category color or assign from palette if default
        const categoryCount = Object.keys(expensesByCategory).length;
        const color =
          t.category.color !== "#6b7280"
            ? t.category.color
            : colorPalette[categoryCount % colorPalette.length];

        expensesByCategory[categoryId] = {
          name: t.category.name,
          value: 0,
          color,
        };
      }
      expensesByCategory[categoryId].value += t.amount;
    } else {
      if (!incomeByCategory[categoryId]) {
        // Use category color or assign from palette if default
        const categoryCount = Object.keys(incomeByCategory).length;
        const color =
          t.category.color !== "#6b7280"
            ? t.category.color
            : colorPalette[categoryCount % colorPalette.length];

        incomeByCategory[categoryId] = {
          name: t.category.name,
          value: 0,
          color,
        };
      }
      incomeByCategory[categoryId].value += t.amount;
    }
  });

  const expensesChartData = Object.values(expensesByCategory);
  const incomeChartData = Object.values(incomeByCategory);

  return NextResponse.json({
    totalBalance,
    income,
    expense,
    pendingCount,
    weeklyChartData,
    goals,
    expensesChartData,
    incomeChartData,
  });
}
