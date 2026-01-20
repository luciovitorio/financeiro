"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import TransactionsLoading from "./loading";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar as CalendarIcon,
  Wallet,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useTransactions,
  useBankAccounts,
  useCategories,
  useTransactionSummary,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useToggleTransactionPaid,
} from "@/hooks/use-financial-data";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  isPaid: boolean;
  paidAt?: string | null;
  notes?: string;
  category?: { id: string; name: string; color: string; icon: string } | null;
  bankAccount: { id: string; name: string; color: string };
  createdBy?: { name: string };
}

export default function TransactionsPage() {
  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(new Date());
  const [filterBankAccount, setFilterBankAccount] = useState<string>("all");

  const filterMonth = filterDate ? String(filterDate.getMonth() + 1) : "";
  const filterYear = filterDate ? String(filterDate.getFullYear()) : "";

  // Queries
  const { data: transactions = [], isLoading: isLoadingTransactions } =
    useTransactions({
      month: filterMonth,
      year: filterYear,
      type: filterType,
      status: filterStatus,
      bankAccountId: filterBankAccount,
    });

  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: categories = [] } = useCategories();
  const { data: summaryData } = useTransactionSummary({
    month: filterMonth,
    year: filterYear,
    type: filterType,
    status: filterStatus,
    bankAccountId: filterBankAccount,
  });

  // Mutations
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const togglePaidMutation = useToggleTransactionPaid();

  // Local State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(
    null,
  );

  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [date, setDate] = useState<Date>(new Date());
  const [categoryId, setCategoryId] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState("");

  const previousBalance = summaryData?.previousBalance || 0;
  const creditCardBill = summaryData?.creditCardBill || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      description,
      amount,
      type,
      date: format(date, "yyyy-MM-dd"),
      categoryId: categoryId === "none" ? null : categoryId,
      bankAccountId,
      isPaid,
      notes,
    };

    try {
      if (editingTransaction) {
        await updateMutation.mutateAsync({ id: editingTransaction.id, data });
        toast.success("Transação atualizada!");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Transação criada!");
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar transação");
    }
  };

  const handleTogglePaid = async (transaction: Transaction) => {
    try {
      const newStatus = !transaction.isPaid;
      await togglePaidMutation.mutateAsync({
        id: transaction.id,
        isPaid: transaction.isPaid,
      });

      toast.success(
        newStatus
          ? transaction.type === "INCOME"
            ? "Recebimento confirmado!"
            : "Pagamento confirmado!"
          : "Pagamento desmarcado!",
      );
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      await deleteMutation.mutateAsync(transactionToDelete);
      toast.success("Transação deletada!");
    } catch (error) {
      toast.error("Erro ao deletar transação");
    } finally {
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDescription(transaction.description);
    setAmount(transaction.amount);
    setType(transaction.type);

    const dateStr = transaction.date.split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);
    setDate(new Date(year, month - 1, day));

    setCategoryId(transaction.category?.id || "none");
    setBankAccountId(transaction.bankAccount.id);
    setIsPaid(transaction.isPaid);
    setNotes(transaction.notes || "");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTransaction(null);
    setDescription("");
    setAmount(0);
    setType("EXPENSE");
    setDate(new Date());
    setCategoryId("none");
    setBankAccountId(bankAccounts[0]?.id || "");
    setIsPaid(true);
    setNotes("");
  };

  const handleNewTransaction = () => {
    handleCloseDialog(); // Resets form
    setDialogOpen(true);
  };

  const filteredCategories = categories.filter((c: any) => c.type === type);

  const totals = transactions.reduce(
    (acc: any, t: Transaction) => {
      if (t.type === "INCOME") {
        if (t.isPaid) acc.income += t.amount;
      } else {
        acc.expense += t.amount;
        if (!t.isPaid) acc.pendingExpense += t.amount;
      }
      return acc;
    },
    { income: 0, expense: 0, pendingExpense: 0 },
  );

  const getStatusInfo = (transaction: Transaction) => {
    if (transaction.isPaid)
      return { label: "Pago", color: "text-emerald-600", icon: CheckCircle2 };

    const dueDate = new Date(transaction.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateTime = dueDate.getTime();
    const todayTime = today.getTime();

    const dateStr = transaction.date.split("T")[0];
    const [y, m, d] = dateStr.split("-").map(Number);
    const due = new Date(y, m - 1, d);

    if (due < today)
      return { label: "Atrasado", color: "text-red-600", icon: Clock };
    return { label: "Pendente", color: "text-gray-500", icon: Clock };
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Use Skeleton while loading
  if (isLoadingTransactions) {
    return <TransactionsLoading />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Transações
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Registre e acompanhe suas receitas e despesas
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary-700 hover:bg-primary-800 gap-2 text-sm"
                size="sm"
                onClick={handleNewTransaction}
                disabled={bankAccounts.length === 0}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Transação</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Editar Transação" : "Nova Transação"}
                </DialogTitle>
                <DialogDescription>
                  {editingTransaction
                    ? "Atualize os dados da transação"
                    : "Registre uma nova receita ou despesa"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setType("EXPENSE");
                        setCategoryId("");
                      }}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        type === "EXPENSE"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-gray-200 hover:border-red-300"
                      }`}
                    >
                      <TrendingDown className="h-4 w-4" />
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setType("INCOME");
                        setCategoryId("");
                      }}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                        type === "INCOME"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      <TrendingUp className="h-4 w-4" />
                      Receita
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <CurrencyInput
                      value={amount}
                      onValueChange={setAmount}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Data de{" "}
                      {type === "INCOME"
                        ? "Recebimento"
                        : "Pagamento/Vencimento"}
                    </Label>
                    <DatePicker
                      date={date}
                      onDateChange={(d) => d && setDate(d)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Supermercado, Salário"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Select
                      value={bankAccountId}
                      onValueChange={setBankAccountId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sem categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem categoria</SelectItem>
                        {filteredCategories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="isPaid"
                    checked={isPaid}
                    onCheckedChange={(checked) => setIsPaid(checked as boolean)}
                  />
                  <Label
                    htmlFor="isPaid"
                    className="cursor-pointer font-medium"
                  >
                    {type === "INCOME" ? "Recebido" : "Pago"}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Input
                    id="notes"
                    placeholder="Detalhes adicionais"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSubmitting || !bankAccountId || amount <= 0}
                  >
                    {isSubmitting
                      ? "Salvando..."
                      : editingTransaction
                        ? "Atualizar"
                        : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Warning if no bank accounts */}
        {bankAccounts.length === 0 && !isLoadingTransactions && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800">
                  Você precisa criar uma conta bancária antes de registrar
                  transações.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filtros:</span>
          </div>
          <div className="w-[180px]">
            <DatePicker
              date={filterDate}
              onDateChange={setFilterDate}
              formatStr="MMMM 'de' yyyy"
              placeholder="Selecione o mês"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="INCOME">Receitas</SelectItem>
              <SelectItem value="EXPENSE">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: Todos</SelectItem>
              <SelectItem value="paid">Realizado</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterBankAccount}
            onValueChange={setFilterBankAccount}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Contas</SelectItem>
              {bankAccounts.map((account: any) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-800">
                    Receitas
                  </p>

                  <div className="flex flex-col gap-1 text-sm text-emerald-600/80">
                    <div className="flex justify-between gap-4">
                      <span>Mês atual:</span>
                      <span>
                        R${" "}
                        {totals.income.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Saldo anterior:</span>
                      <span>
                        R${" "}
                        {previousBalance.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-emerald-200">
                    <p className="text-xs text-emerald-600 font-semibold uppercase">
                      Receita Total
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      R${" "}
                      {(totals.income + previousBalance).toLocaleString(
                        "pt-BR",
                        { minimumFractionDigits: 2 },
                      )}
                    </p>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-800">Despesas</p>

                  <div className="flex flex-col gap-1 text-sm text-red-600/80">
                    <div className="flex justify-between gap-4">
                      <span>Despesas do mês:</span>
                      <span>
                        R${" "}
                        {totals.expense.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Pendentes:</span>
                      <span>
                        R${" "}
                        {totals.pendingExpense.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-red-200">
                    <p className="text-xs text-red-600 font-semibold uppercase">
                      Prévia do Cartão
                    </p>
                    <p className="text-2xl font-bold text-red-700">
                      R${" "}
                      {creditCardBill.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card
            className={`${totals.income - totals.expense >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p
                    className={`text-sm font-medium ${totals.income - totals.expense >= 0 ? "text-blue-800" : "text-orange-800"}`}
                  >
                    Saldo
                  </p>

                  <div
                    className={`flex flex-col gap-1 text-sm ${totals.income - totals.expense >= 0 ? "text-blue-600/80" : "text-orange-600/80"}`}
                  >
                    <div className="flex justify-between gap-4">
                      <span>Saldo do mês:</span>
                      <span>
                        R${" "}
                        {(totals.income - totals.expense).toLocaleString(
                          "pt-BR",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`pt-2 mt-2 border-t ${totals.income - totals.expense >= 0 ? "border-blue-200" : "border-orange-200"}`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase ${totals.income - totals.expense >= 0 ? "text-blue-600" : "text-orange-600"}`}
                    >
                      Saldo Total
                    </p>
                    <p
                      className={`text-2xl font-bold ${totals.income - totals.expense >= 0 ? "text-blue-700" : "text-orange-700"}`}
                    >
                      R${" "}
                      {(
                        previousBalance +
                        totals.income -
                        totals.expense
                      ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <CalendarIcon
                  className={`h-8 w-8 ${totals.income - totals.expense >= 0 ? "text-blue-500" : "text-orange-500"}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction List */}
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <CalendarIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma transação encontrada
              </h3>
              <p className="text-gray-600 mb-4">
                Registre suas receitas e despesas para acompanhar suas finanças
              </p>
              {bankAccounts.length > 0 && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  onClick={handleNewTransaction}
                >
                  <Plus className="h-4 w-4" />
                  Registrar Primeira Transação
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {transactions.map((transaction: Transaction) => {
                  const statusInfo = getStatusInfo(transaction);
                  const StatusIcon: any = statusInfo.icon;

                  return (
                    <div
                      key={transaction.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 transition-colors gap-4 sm:gap-0"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            transaction.type === "INCOME"
                              ? "bg-emerald-100"
                              : "bg-red-100"
                          }`}
                        >
                          {transaction.type === "INCOME" ? (
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {transaction.description}
                            </span>
                            <span
                              className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${transaction.isPaid ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                            >
                              {transaction.isPaid ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  Pago
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" />
                                  Pendente
                                </>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(transaction.date), "dd/MM/yyyy")}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              {transaction.bankAccount.name}
                            </span>
                            {transaction.category && (
                              <>
                                <span>•</span>
                                <span
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                                  style={{
                                    backgroundColor: `${transaction.category.color}20`,
                                    color: transaction.category.color,
                                  }}
                                >
                                  {transaction.category.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-6 mt-2 sm:mt-0 w-full sm:w-auto">
                        <span
                          className={`text-lg font-bold whitespace-nowrap ${
                            transaction.type === "INCOME"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "EXPENSE" ? "- " : "+ "}
                          R${" "}
                          {transaction.amount.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title={
                              transaction.isPaid
                                ? "Marcar como não pago"
                                : "Marcar como pago"
                            }
                            onClick={() => handleTogglePaid(transaction)}
                          >
                            <CheckCircle2
                              className={`h-4 w-4 ${transaction.isPaid ? "text-emerald-600 fill-emerald-100" : ""}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteClick(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A transação será
                permanentemente removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
