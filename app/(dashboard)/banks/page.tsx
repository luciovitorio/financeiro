"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import BanksLoading from "./loading";
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
  Plus,
  Wallet,
  CreditCard,
  Landmark,
  PiggyBank,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
} from "@/hooks/use-financial-data";

const ICON_OPTIONS = [
  { value: "Wallet", label: "Carteira", Icon: Wallet },
  { value: "CreditCard", label: "Cartão", Icon: CreditCard },
  { value: "Landmark", label: "Banco", Icon: Landmark },
  { value: "PiggyBank", label: "Poupança", Icon: PiggyBank },
];

const COLOR_OPTIONS = [
  { value: "#059669", label: "Verde" },
  { value: "#0ea5e9", label: "Azul" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#f59e0b", label: "Laranja" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#6b7280", label: "Cinza" },
];

interface BankAccount {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  color: string;
  icon: string;
  createdAt: string;
  // Investment fields
  isInvestment?: boolean;
  cdiPercentage?: number | null;
  maturityDate?: string | null;
  lastYieldUpdate?: string | null;
  totalInvested?: number; // Added for tax simulation
}

export default function BanksPage() {
  const { data: session } = useSession();
  const { data: accounts = [], isLoading } = useBankAccounts();

  const createMutation = useCreateBankAccount();
  const updateMutation = useUpdateBankAccount();
  const deleteMutation = useDeleteBankAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null,
  );

  // Redeem Dialog State
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [redeemAccount, setRedeemAccount] = useState<BankAccount | null>(null);
  const [redeemAmount, setRedeemAmount] = useState<number>(0);
  const [destinationBankId, setDestinationBankId] = useState<string>(""); // Force selection

  // Tax Simulation State
  const [simulation, setSimulation] = useState<{
    taxRate: number;
    taxAmount: number;
    netAmount: number;
    profit: number;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState("#059669");
  const [selectedIcon, setSelectedIcon] = useState("Wallet");

  // Investment State
  const [isInvestment, setIsInvestment] = useState(false);
  const [cdiPercentage, setCdiPercentage] = useState<number>(100);
  const [maturityDate, setMaturityDate] = useState("");

  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (redeemAccount && redeemAmount > 0) {
      // Simulate Tax
      const principal =
        redeemAccount.totalInvested ?? redeemAccount.initialBalance;
      const totalProfit = Math.max(0, redeemAccount.currentBalance - principal);
      const ratio = redeemAmount / redeemAccount.currentBalance;
      const profitProportion = totalProfit * ratio;

      const days = Math.floor(
        (new Date().getTime() - new Date(redeemAccount.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      let rate = 0.225;
      if (days > 720) rate = 0.15;
      else if (days > 360) rate = 0.175;
      else if (days > 180) rate = 0.2;

      const tax = profitProportion * rate;

      setSimulation({
        taxRate: rate,
        taxAmount: tax,
        netAmount: redeemAmount - tax,
        profit: profitProportion,
      });
    } else {
      setSimulation(null);
    }
  }, [redeemAmount, redeemAccount]);

  const handleRedeemClick = (account: BankAccount) => {
    setRedeemAccount(account);
    setRedeemAmount(0);
    setDestinationBankId("external");
    setRedeemDialogOpen(true);
  };

  const handleRedeemConfirm = async () => {
    if (!redeemAccount || redeemAmount <= 0) return;

    // Note: Redeem logic might be complex enough to keep as a one-off fetch or move to a specific hook separately
    // For now, keeping fetch but wrapped in try/catch to maintain existing logic
    try {
      const res = await fetch(`/api/banks/${redeemAccount.id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: redeemAmount,
          destinationBankId:
            destinationBankId === "external" ? null : destinationBankId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Resgate realizado! Líquido: R$ ${data.netAmount.toFixed(2)}`,
        );
        // Invalidate queries manually since we didn't use a mutation hook for this specific action yet
        // Ideally we should create a useRedeemInvestment hook
        window.location.reload(); // Quick fix or invalidate queries
        setRedeemDialogOpen(false);
      } else {
        toast.error(data.error || "Erro no resgate");
      }
    } catch (e) {
      toast.error("Erro de conexão");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const data = {
      name,
      initialBalance: initialBalance,
      color: selectedColor,
      icon: selectedIcon,
      isInvestment,
      cdiPercentage: isInvestment ? cdiPercentage : null,
      maturityDate: isInvestment && maturityDate ? maturityDate : null,
    };

    try {
      if (editingAccount) {
        await updateMutation.mutateAsync({ id: editingAccount.id, data });
        toast.success("Conta atualizada com sucesso!");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Conta criada com sucesso!");
      }
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar conta");
      toast.error("Erro ao salvar conta");
    }
  };

  const handleDeleteClick = (id: string) => {
    setAccountToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;

    try {
      await deleteMutation.mutateAsync(accountToDelete);
      toast.success("Conta deletada com sucesso!");
    } catch (err) {
      console.error("Error deleting account:", err);
      toast.error("Erro ao deletar conta");
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setName(account.name);
    setInitialBalance(account.initialBalance);
    setSelectedColor(account.color);
    setSelectedIcon(account.icon);

    setIsInvestment(!!account.isInvestment);
    setCdiPercentage(account.cdiPercentage || 100);
    setMaturityDate(
      account.maturityDate
        ? new Date(account.maturityDate).toISOString().split("T")[0]
        : "",
    );

    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAccount(null);
    setName("");
    setInitialBalance(0);
    setSelectedColor("#059669");
    setSelectedIcon("Wallet");

    setIsInvestment(false);
    setCdiPercentage(100);
    setMaturityDate("");

    setError("");
  };

  const getIconComponent = (iconName: string) => {
    const option = ICON_OPTIONS.find((opt) => opt.value === iconName);
    return option?.Icon || Wallet;
  };

  const totalBalance = accounts.reduce(
    (sum: number, acc: BankAccount) => sum + acc.currentBalance,
    0,
  );
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return <BanksLoading />;
  }

  return (
    <>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Contas Bancárias
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Gerencie suas contas e acompanhe seus saldos
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-primary-600 hover:bg-primary-700 gap-2 text-sm"
                  size="sm"
                  onClick={() => handleCloseDialog()}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nova Conta</span>
                  <span className="sm:hidden">Nova</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingAccount ? "Editar Conta" : "Nova Conta Bancária"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAccount
                      ? "Atualize as informações da conta bancária"
                      : "Adicione uma nova conta para começar a controlar suas finanças"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Conta</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Nubank, Banco do Brasil"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Saldo Inicial</Label>
                    <CurrencyInput
                      value={initialBalance}
                      onValueChange={setInitialBalance}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ícone</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {ICON_OPTIONS.map((option) => {
                        const IconComponent = option.Icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setSelectedIcon(option.value)}
                            className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                              selectedIcon === option.value
                                ? "border-primary-600 bg-primary-50"
                                : "border-gray-200 hover:border-primary-300"
                            }`}
                          >
                            <IconComponent className="h-6 w-6 mx-auto text-gray-700" />
                            <p className="text-xs mt-1 text-gray-600">
                              {option.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedColor(option.value)}
                          className={`h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                            selectedColor === option.value
                              ? "border-gray-900 ring-2 ring-gray-300"
                              : "border-gray-200"
                          }`}
                          style={{ backgroundColor: option.value }}
                          title={option.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isInvestment"
                        checked={isInvestment}
                        onChange={(e) => setIsInvestment(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <Label htmlFor="isInvestment">
                        Esta é uma conta de investimento?
                      </Label>
                    </div>

                    {isInvestment && (
                      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                        <div className="space-y-2">
                          <Label>Porcentagem do CDI (%)</Label>
                          <Input
                            type="number"
                            value={cdiPercentage}
                            onChange={(e) =>
                              setCdiPercentage(Number(e.target.value))
                            }
                            placeholder="Ex: 100"
                          />
                          <p className="text-xs text-gray-500">
                            Quanto rende em relação ao CDI (ex: 110%)
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Vencimento (Opcional)</Label>
                            <Input
                              type="date"
                              value={maturityDate}
                              onChange={(e) => setMaturityDate(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                      {error}
                    </div>
                  )}

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
                      className="bg-primary-600 hover:bg-primary-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Salvando..."
                        : editingAccount
                          ? "Atualizar"
                          : "Criar Conta"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm mb-2">Saldo Total</p>
                <p className="text-4xl font-bold">
                  R${" "}
                  {totalBalance.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-primary-100 text-sm mt-2">
                  {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
                </p>
              </div>
              <div className="bg-white/20 p-4 rounded-full">
                <Wallet className="h-10 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Wallet className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma conta cadastrada
              </h3>
              <p className="text-gray-600 mb-4">
                Comece adicionando uma conta bancária para controlar suas
                finanças
              </p>
              <Button
                className="bg-primary-600 hover:bg-primary-700 gap-2"
                onClick={() => {
                  setEditingAccount(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Adicionar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account: BankAccount) => {
              const IconComponent = getIconComponent(account.icon);
              const balanceDiff =
                account.currentBalance - account.initialBalance;

              return (
                <Card
                  key={account.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        <IconComponent
                          className="h-6 w-6"
                          style={{ color: account.color }}
                        />
                      </div>
                      <div className="flex gap-1">
                        {account.isInvestment && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                            title="Resgatar Investimento"
                            onClick={() => handleRedeemClick(account)}
                          >
                            <TrendingDown className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-3 flex items-center justify-between">
                      <span>{account.name}</span>
                      {account.isInvestment && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 font-normal">
                          Rendendo {account.cdiPercentage}% CDI
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Saldo Atual</p>
                        <p className="text-2xl font-bold text-gray-900">
                          R${" "}
                          {account.currentBalance.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      {balanceDiff !== 0 && (
                        <div className="flex items-center gap-2">
                          {balanceDiff > 0 ? (
                            <>
                              <TrendingUp className="h-4 w-4 text-emerald-600" />
                              <span className="text-sm text-emerald-600 font-medium">
                                + R${" "}
                                {Math.abs(balanceDiff).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              <span className="text-sm text-red-600 font-medium">
                                - R${" "}
                                {Math.abs(balanceDiff).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Redeem Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resgatar Investimento</DialogTitle>
            <DialogDescription>
              Informe o valor e o destino. O IR será calculado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor do Resgate (Bruto)</Label>
              <CurrencyInput
                value={redeemAmount}
                onValueChange={setRedeemAmount}
                placeholder="R$ 0,00"
              />
              <p className="text-xs text-gray-500">
                Saldo Disponível: R$ {redeemAccount?.currentBalance.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Destino</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={destinationBankId}
                onChange={(e) => setDestinationBankId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecione um destino...
                </option>
                <option value="external">Saque Externo / Outro</option>
                {accounts
                  .filter((a: BankAccount) => a.id !== redeemAccount?.id)
                  .map((a: BankAccount) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>

            {simulation && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Lucro Proporcional:</span>
                  <span className="font-medium text-emerald-600">
                    R$ {simulation.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Alíquota IR ({(simulation.taxRate * 100).toFixed(1)}%):
                  </span>
                  <span className="font-medium text-red-600">
                    - R$ {simulation.taxAmount.toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Valor Líquido:</span>
                  <span className="text-emerald-700">
                    R$ {simulation.netAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRedeemDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-primary-600 hover:bg-primary-700"
              onClick={handleRedeemConfirm}
              disabled={
                redeemAmount <= 0 ||
                redeemAmount > (redeemAccount?.currentBalance || 0) ||
                !destinationBankId
              }
            >
              Confirmar Resgate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta bancária?
              <br />
              <br />
              <strong className="text-red-600">
                ATENÇÃO: Todas as transações, parcelas e metas vinculadas a esta
                conta também serão excluídas permanentemente.
              </strong>
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
