"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeeklyChartProps {
  data: { day: string; income: number; expense: number; fullDay?: string }[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f0f0f0"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          stroke="#9ca3af"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          stroke="#9ca3af"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `R$ ${value}`}
          width={80}
        />
        <Tooltip
          cursor={{ fill: "var(--color-primary-50)", opacity: 0.5 }}
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
          labelFormatter={(label, payload) => {
            if (payload && payload.length > 0 && payload[0].payload.fullDay) {
              return payload[0].payload.fullDay;
            }
            return label;
          }}
          itemSorter={(item) => {
            // Sort so income appears first (return negative for income)
            return item.dataKey === "income" ? -1 : 1;
          }}
          formatter={(value: number, name: string) => [
            new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(value),
            name === "income" ? "Entradas" : "Saídas",
          ]}
        />
        <Bar
          dataKey="income"
          fill="var(--primary)"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
        <Bar
          dataKey="expense"
          fill="#ef4444"
          radius={[4, 4, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
