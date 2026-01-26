"use client";

import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  ArrowUpRight,
  Plus,
  Smartphone,
  Clock,
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useDashboardData } from "@/hooks/use-financial-data";
import DashboardLoading from "./loading";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useDashboardData();
  const [showValues, setShowValues] = React.useState(true);

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  if (isLoading) {
    return <DashboardLoading />;
  }

  // Safe defaults if data is missing for some reason
  const {
    totalBalance = 0,
    income = 0,
    expense = 0,
    pendingCount = 0,
    weeklyChartData = [],
    goals = [],
    expensesChartData = [],
    incomeChartData = [],
  } = data || {};

  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Visão geral das finanças de {session?.user?.name || "Usuário"}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link href="/transactions">
            <Button
              className="bg-primary-700 hover:bg-primary-800 gap-2 text-sm"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Transação</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary-700 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-primary-100 text-sm">Saldo Total</p>
                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="text-primary-100 hover:text-white transition-colors p-1"
                    aria-label={
                      showValues ? "Ocultar valores" : "Mostrar valores"
                    }
                  >
                    {showValues ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {showValues
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(totalBalance)
                    : "R$ ••••••"}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs text-primary-100">
                    Atualizado agora
                  </span>
                </div>
              </div>
              <div className="bg-white/20 p-2 rounded-full shrink-0">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600 text-sm">Receitas (Mês)</p>
                  <button
                    onClick={() => setShowValues(!showValues)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    aria-label={
                      showValues ? "Ocultar valores" : "Mostrar valores"
                    }
                  >
                    {showValues ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
                  {showValues
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(income)
                    : "R$ ••••••"}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  <span className="text-xs text-gray-500">
                    Referente a {format(today, "MMMM", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <div className="bg-emerald-50 p-2 rounded-full shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-gray-600 text-sm mb-2">Despesas (Mês)</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 tracking-tight">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(expense)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-gray-500">
                    Referente a {format(today, "MMMM", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <div className="bg-red-50 p-2 rounded-full shrink-0">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-gray-600 text-sm mb-2">Pendentes</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {pendingCount}
                </p>
                <p className="text-xs text-gray-500 mt-2">Transações a pagar</p>
              </div>
              <div className="bg-gray-100 p-2 rounded-full shrink-0">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Analytics Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Movimentação (7 Dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyChart data={weeklyChartData} />
            </CardContent>
          </Card>

          {/* Category Pie Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <CategoryPieChart
                  data={expensesChartData}
                  title="Gastos por Categoria"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <CategoryPieChart
                  data={incomeChartData}
                  title="Receitas por Categoria"
                />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions / Recent (Placeholder for now, could be RecentTransactions List) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Atalhos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/banks"
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Gerenciar Contas
                    </p>
                    <p className="text-xs text-gray-500">
                      Adicionar ou editar bancos
                    </p>
                  </div>
                </Link>
                <Link
                  href="/credit-cards"
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Cartões de Crédito
                    </p>
                    <p className="text-xs text-gray-500">
                      Ver faturas e limites
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Reminders - "Configurar Categorias" as requested */}
          <Card className="bg-gray-50 border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Lembretes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    Configurar Categorias
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Organize suas transações por categoria
                  </p>
                  <Link href="/categories">
                    <Button className="w-full bg-primary-700 hover:bg-primary-800 gap-2">
                      <Plus className="h-4 w-4" />
                      Começar Agora
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goals / Meus Objetivos - Real Data */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">
                Meus Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {goals.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-4">
                    Nenhum objetivo criado
                  </p>
                  <Link href="/goals">
                    <Button
                      className="bg-primary-700 hover:bg-primary-800 gap-2 text-sm"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      Criar Objetivo
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal: any) => {
                    const progress = Math.min(
                      (goal.currentAmount / goal.targetAmount) * 100,
                      100,
                    );
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700 truncate">
                            {goal.title}
                          </span>
                          <span className="text-gray-500">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: goal.color,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-right">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(goal.currentAmount)}{" "}
                          de{" "}
                          {new Intl.NumberFormat("pt-BR", {
                            notation: "compact",
                          }).format(goal.targetAmount)}
                        </p>
                      </div>
                    );
                  })}
                  <div className="pt-2">
                    <Link href="/goals">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                      >
                        Ver Todos
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile App Promo */}
          <Card className="bg-gradient-to-br from-primary-700 to-primary-900 text-white border-0">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="bg-white/20 p-3 rounded-full mb-3">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">Baixe nosso App</h3>
                <p className="text-sm text-primary-100 mb-4">
                  Disponível em breve para iOS e Android
                </p>
                <Button className="w-full bg-white text-primary-700 hover:bg-gray-100">
                  Em Breve
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
