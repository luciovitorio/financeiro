"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  TrendingUp,
  Calendar,
  Coins,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import GoalsLoading from "./loading";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useBankAccounts,
} from "@/hooks/use-financial-data";

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  color: string;
  createdAt: string;
}

const COLORS = [
  "#3b82f6", // Azul
  "#ef4444", // Vermelho
  "#10b981", // Verde
  "#f59e0b", // Amarelo
  "#8b5cf6", // Roxo
  "#ec4899", // Rosa
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

export default function GoalsPage() {
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: bankAccounts = [] } = useBankAccounts();

  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const deleteMutation = useDeleteGoal();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  // Bank Accounts for deposit/withdraw
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [storageAccountId, setStorageAccountId] = useState("");
  const [depositAmount, setDepositAmount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setTargetAmount(0);
    setCurrentAmount(0);
    setDeadline("");
    setColor(COLORS[0]);
    setStorageAccountId("");
    setIsEditing(false);
    setSelectedGoal(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (goal: Goal) => {
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount);
    setCurrentAmount(goal.currentAmount);
    setDeadline(
      goal.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : "",
    );
    setColor(goal.color);
    setIsEditing(true);
    setSelectedGoal(goal);
    setCreateDialogOpen(true);
  };

  const handleOpenDeposit = (goal: Goal) => {
    setSelectedGoal(goal);
    setDepositAmount(0);
    // Default to first account if available
    if (bankAccounts.length > 0) setSelectedAccountId(bankAccounts[0].id);
    setDepositDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title,
      targetAmount,
      currentAmount: isEditing ? undefined : currentAmount,
      deadline: deadline || null,
      color,
      storageAccountId:
        storageAccountId && storageAccountId !== "none"
          ? storageAccountId
          : null,
    };

    try {
      if (isEditing && selectedGoal) {
        await updateMutation.mutateAsync({ id: selectedGoal.id, data });
        toast.success("Objetivo atualizado!");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Objetivo criado!");
      }
      setCreateDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar objetivo");
    }
  };

  const handleDeposit = async () => {
    if (!selectedGoal || depositAmount === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/goals/${selectedGoal.id}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: depositAmount,
          bankAccountId: selectedAccountId,
        }),
      });

      if (res.ok) {
        toast.success(
          depositAmount > 0 ? "Depósito realizado!" : "Retirada realizada!",
        );
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        queryClient.invalidateQueries({ queryKey: ["bankAccounts"] }); // Balance affected
        setDepositDialogOpen(false);
      } else {
        toast.error("Erro ao atualizar saldo");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGoal) return;

    try {
      await deleteMutation.mutateAsync(selectedGoal.id);
      toast.success("Objetivo excluído");
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  // --- UI Helpers ---
  const calculateProgress = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getDaysRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const days = differenceInDays(new Date(deadlineStr), new Date());
    if (days < 0) return "Vencido";
    return `${days} dias restantes`;
  };

  const isSubmittingForm = createMutation.isPending || updateMutation.isPending;

  if (goalsLoading) {
    return <GoalsLoading />;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Objetivos
          </h1>
          <p className="text-gray-600 mt-1">
            Conquiste seus sonhos financeiros
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-primary-600 hover:bg-primary-700 text-white gap-2 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Novo Objetivo
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum objetivo ainda
            </h3>
            <p className="text-gray-600 mb-4">
              Crie sua primeira meta financeira!
            </p>
            <Button
              className="bg-primary-600 hover:bg-primary-700 gap-2"
              onClick={handleOpenCreate}
            >
              <Plus className="h-4 w-4" />
              Criar Objetivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal: Goal) => {
            const progress = calculateProgress(
              goal.currentAmount,
              goal.targetAmount,
            );
            const daysLeft = getDaysRemaining(goal.deadline);

            return (
              <Card
                key={goal.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: goal.color }}
                />
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex bg-gray-50 p-2 rounded-lg">
                      <Target
                        className="h-5 w-5"
                        style={{ color: goal.color }}
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-blue-600"
                        onClick={() => handleOpenEdit(goal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                        onClick={() => {
                          setSelectedGoal(goal);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {goal.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    {goal.deadline ? (
                      <>
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(goal.deadline), "dd 'de' MMMM", {
                            locale: ptBR,
                          })}
                        </span>
                      </>
                    ) : (
                      <span>Sem data limite</span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {progress}%
                      </span>
                      <span className="text-gray-500">
                        R$ {goal.currentAmount.toLocaleString("pt-BR")} de R${" "}
                        {goal.targetAmount.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: goal.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        daysLeft === "Vencido"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {daysLeft || "Em andamento"}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                      onClick={() => handleOpenDeposit(goal)}
                    >
                      <Coins className="h-4 w-4" />
                      Depositar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Objetivo" : "Novo Objetivo"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Objetivo</Label>
              <Input
                placeholder="Ex: Viagem para Europa"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Meta</Label>
                <CurrencyInput
                  value={targetAmount}
                  onValueChange={setTargetAmount}
                  placeholder="R$ 0,00"
                />
              </div>
              {!isEditing && (
                <div className="space-y-2">
                  <Label>Saldo Inicial</Label>
                  <CurrencyInput
                    value={currentAmount}
                    onValueChange={setCurrentAmount}
                    placeholder="R$ 0,00"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data Limite (Opcional)</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Conta de Armazenamento (Opcional)</Label>
              <Select
                value={storageAccountId}
                onValueChange={setStorageAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Conta onde o dinheiro reservado será guardado
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c
                        ? "border-gray-900 scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingForm}
                style={{ backgroundColor: color }}
              >
                {isSubmittingForm ? "Salvando..." : "Salvar Objetivo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DEPOSIT DIALOG */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Atualizar Saldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor (Use negativo para sacar)</Label>
              <CurrencyInput
                value={Math.abs(depositAmount)}
                onValueChange={(val) =>
                  setDepositAmount(depositAmount < 0 ? -val : val)
                }
                placeholder="R$ 0,00"
                className={
                  depositAmount < 0 ? "text-red-600" : "text-green-600"
                }
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                size="sm"
                variant={depositAmount > 0 ? "default" : "outline"}
                className={
                  depositAmount > 0 ? "bg-green-600 hover:bg-green-700" : ""
                }
                onClick={() => setDepositAmount(Math.abs(depositAmount))}
              >
                Depositar (+)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={depositAmount < 0 ? "default" : "outline"}
                className={
                  depositAmount < 0 ? "bg-red-600 hover:bg-red-700" : ""
                }
                onClick={() => setDepositAmount(-Math.abs(depositAmount))}
              >
                Sacar (-)
              </Button>
            </div>

            <div className="space-y-2">
              <Label>
                {depositAmount >= 0
                  ? "Origem do Dinheiro"
                  : "Destino do Dinheiro"}
              </Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} (R${" "}
                      {account.currentBalance.toLocaleString("pt-BR")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleDeposit}
            disabled={submitting || depositAmount === 0}
            className="w-full"
          >
            Confirmar
          </Button>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente o objetivo "{selectedGoal?.title}" e
              todo o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
