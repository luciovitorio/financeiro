"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DatePicker } from "@/components/ui/date-picker"; // Ensure this exists or use standard input date
import CreditCardsLoading from "./loading";
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
  CreditCard as CreditCardIcon,
  Trash2,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreditCards,
  useCreateCreditCard,
  useDeleteCreditCard,
  useBankAccounts,
  useCategories,
} from "@/hooks/use-financial-data";

// Types
interface CreditCardInvoice {
  id: string;
  month: number;
  year: number;
  closingDate: string;
  dueDate: string;
  totalAmount: number;
  status: "OPEN" | "CLOSED" | "PAID";
  paidAt: string | null;
  purchases: CreditCardPurchase[];
}

interface CreditCardPurchase {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  currentInstallment: number;
  purchaseDate: string;
  category?: { name: string; color: string } | null;
}

interface CreditCard {
  id: string;
  name: string;
  lastDigits: string | null;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  usedAmount: number;
  availableLimit: number;
  invoices: CreditCardInvoice[];
}

interface BankAccount {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}

const COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#6366F1",
  "#14B8A6",
];

export default function CreditCardsPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: cards = [], isLoading: cardsLoading } = useCreditCards();
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: categories = [] } = useCategories();

  // Mutations
  const createCardMutation = useCreateCreditCard();
  const deleteCardMutation = useDeleteCreditCard();

  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<CreditCardInvoice | null>(null);

  // Card form state
  const [cardName, setCardName] = useState("");
  const [lastDigits, setLastDigits] = useState("");
  const [cardLimit, setCardLimit] = useState<number>(0);
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [cardColor, setCardColor] = useState("#8B5CF6");

  // Purchase form state
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [purchaseDesc, setPurchaseDesc] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [purchaseInstallments, setPurchaseInstallments] = useState("1");
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [purchaseCategoryId, setPurchaseCategoryId] = useState("none");
  const [submitting, setSubmitting] = useState(false);

  // Pay invoice state
  const [invoiceToPay, setInvoiceToPay] = useState<{
    card: CreditCard;
    invoice: CreditCardInvoice;
  } | null>(null);
  const [payAccountId, setPayAccountId] = useState("");

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createCardMutation.mutateAsync({
        name: cardName,
        lastDigits: lastDigits || null,
        limit: cardLimit,
        closingDay: parseInt(closingDay),
        dueDay: parseInt(dueDay),
        color: cardColor,
      });

      handleCloseCardDialog();
      toast.success("Cartão criado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar cartão");
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/credit-cards/${selectedCard.id}/purchases`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: purchaseDesc,
            totalAmount: purchaseAmount,
            installments: parseInt(purchaseInstallments),
            purchaseDate: format(purchaseDate, "yyyy-MM-dd"),
            categoryId:
              purchaseCategoryId === "none" ? null : purchaseCategoryId,
          }),
        },
      );

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["creditCards"] });
        handleClosePurchaseDialog();
        toast.success("Compra registrada!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Erro ao registrar compra");
      }
    } catch {
      toast.error("Erro ao registrar compra");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!invoiceToPay || !payAccountId) return;
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/credit-cards/${invoiceToPay.card.id}/invoices/${invoiceToPay.invoice.id}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankAccountId: payAccountId }),
        },
      );

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["creditCards"] });
        queryClient.invalidateQueries({ queryKey: ["bankAccounts"] }); // Balances change
        setPayDialogOpen(false);
        setInvoiceToPay(null);
        setPayAccountId("");
        toast.success("Lançamento pago!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Erro ao pagar lançamento");
      }
    } catch {
      toast.error("Erro ao pagar lançamento");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;

    try {
      await deleteCardMutation.mutateAsync(cardToDelete);
      toast.success("Cartão deletado!");
    } catch {
      toast.error("Erro ao deletar cartão");
    } finally {
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    }
  };

  const handleCloseCardDialog = () => {
    setCardDialogOpen(false);
    setCardName("");
    setLastDigits("");
    setCardLimit(0);
    setClosingDay("");
    setDueDay("");
    setCardColor("#8B5CF6");
  };

  const handleClosePurchaseDialog = () => {
    setPurchaseDialogOpen(false);
    setPurchaseDesc("");
    setPurchaseAmount(0);
    setPurchaseInstallments("1");
    setPurchaseDate(new Date());
    setPurchaseCategoryId("none");
  };

  const openPurchaseDialog = (card: CreditCard) => {
    setSelectedCard(card);
    setPurchaseDialogOpen(true);
  };

  const openPayDialog = (card: CreditCard, invoice: CreditCardInvoice) => {
    setInvoiceToPay({ card, invoice });
    setPayDialogOpen(true);
  };

  const expenseCategories = categories.filter(
    (c: Category) => c.type === "EXPENSE",
  );
  const monthNames = [
    "",
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];

  // Helper function to get invoice status label and styling
  const getInvoiceStatus = (
    invoice: CreditCardInvoice,
    allInvoices?: CreditCardInvoice[],
  ) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // Already paid
    if (invoice.status === "PAID") {
      return {
        label: "Pago",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
        badge: "✓",
      };
    }

    // Overdue: due date has passed and not paid
    if (dueDate < today) {
      return {
        label: "Em Atraso",
        color: "text-red-600",
        bgColor: "bg-red-100",
        badge: "!",
      };
    }

    // Find the first unpaid invoice that hasn't passed due date (this is the "Aberta" one)
    if (allInvoices) {
      const sortedInvoices = [...allInvoices]
        .filter((inv) => inv.status !== "PAID")
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        );

      // Find first invoice that is not overdue (due date >= today)
      const nextOpenInvoice = sortedInvoices.find((inv) => {
        const invDueDate = new Date(inv.dueDate);
        invDueDate.setHours(0, 0, 0, 0);
        return invDueDate >= today;
      });

      // If this invoice is the next one to pay, it's "Aberta"
      if (nextOpenInvoice && nextOpenInvoice.id === invoice.id) {
        return {
          label: "Aberta",
          color: "text-purple-600",
          bgColor: "bg-purple-100",
          badge: "●",
        };
      }
    }

    // Otherwise it's a future invoice
    return {
      label: "Futuro",
      color: "text-gray-400",
      bgColor: "bg-gray-100",
      badge: "○",
    };
  };

  if (cardsLoading) {
    return <CreditCardsLoading />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Cartões de Crédito
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Gerencie seus cartões e lançamentos
            </p>
          </div>
          <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary-600 hover:bg-primary-700 gap-2 text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Cartão</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Cartão de Crédito</DialogTitle>
                <DialogDescription>
                  Adicione um novo cartão para controlar seus gastos
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCard} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Cartão</Label>
                  <Input
                    placeholder="Ex: Nubank, Inter, C6"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Últimos 4 dígitos</Label>
                    <Input
                      placeholder="1234"
                      maxLength={4}
                      value={lastDigits}
                      onChange={(e) =>
                        setLastDigits(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Limite</Label>
                    <CurrencyInput
                      value={cardLimit}
                      onValueChange={setCardLimit}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dia do Fechamento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      placeholder="Ex: 15"
                      value={closingDay}
                      onChange={(e) => setClosingDay(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia do Vencimento</Label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      placeholder="Ex: 23"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCardColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          cardColor === color
                            ? "ring-2 ring-offset-2 ring-gray-900 scale-110"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseCardDialog}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700"
                    disabled={createCardMutation.isPending || cardLimit <= 0}
                  >
                    {createCardMutation.isPending
                      ? "Criando..."
                      : "Criar Cartão"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards List */}
        {cards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <CreditCardIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum cartão cadastrado
              </h3>
              <p className="text-gray-600 mb-4">
                Adicione seus cartões de crédito para controlar os lançamentos
              </p>
              <Button
                className="bg-primary-600 hover:bg-primary-700 gap-2"
                onClick={() => setCardDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Adicionar Primeiro Cartão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cards.map((card: CreditCard) => {
              const isExpanded = expandedCard === card.id;
              const currentInvoice = card.invoices.find(
                (inv) => inv.status === "OPEN",
              );
              const usagePercent = (card.usedAmount / card.limit) * 100;

              return (
                <Card key={card.id} className="overflow-hidden">
                  {/* Card Header */}
                  <div
                    className="p-4 text-white"
                    style={{ backgroundColor: card.color }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCardIcon className="h-6 w-6" />
                        <div>
                          <h3 className="font-semibold">{card.name}</h3>
                          {card.lastDigits && (
                            <p className="text-sm opacity-80">
                              •••• {card.lastDigits}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={() => openPurchaseDialog(card)}
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedCard(null);
                              setSelectedInvoice(null);
                            } else {
                              setExpandedCard(card.id);
                              // Auto-select the "Aberta" invoice (next one to pay)
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);

                              // Sort unpaid invoices by due date
                              const sortedUnpaid = [...card.invoices]
                                .filter((inv) => inv.status !== "PAID")
                                .sort(
                                  (a, b) =>
                                    new Date(a.dueDate).getTime() -
                                    new Date(b.dueDate).getTime(),
                                );

                              // Find the first invoice that hasn't passed due date (this is "Aberta")
                              const openInvoice =
                                sortedUnpaid.find((inv) => {
                                  const dueDate = new Date(inv.dueDate);
                                  dueDate.setHours(0, 0, 0, 0);
                                  return dueDate >= today;
                                }) ||
                                sortedUnpaid[0] ||
                                card.invoices[card.invoices.length - 1];

                              if (openInvoice) setSelectedInvoice(openInvoice);
                            }
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          onClick={() => {
                            setCardToDelete(card.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="pt-4">
                    {/* Limit usage bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">
                          R${" "}
                          {card.usedAmount.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          usado
                        </span>
                        <span className="font-medium text-gray-900">
                          Limite: R${" "}
                          {card.limit.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${usagePercent > 80 ? "bg-red-500" : "bg-purple-500"}`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Disponível: R${" "}
                        {card.availableLimit.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    {/* Current invoice info */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Fecha dia {card.closingDay} • Vence dia{" "}
                            {card.dueDay}
                          </span>
                        </div>
                      </div>
                      {currentInvoice && (
                        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">
                              Lançamento atual (
                              {monthNames[currentInvoice.month]}/
                              {currentInvoice.year})
                            </p>
                            <p className="text-xs text-gray-400">
                              Vence:{" "}
                              {format(
                                new Date(currentInvoice.dueDate),
                                "dd/MM/yyyy",
                              )}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-purple-600">
                            R${" "}
                            {currentInvoice.totalAmount.toLocaleString(
                              "pt-BR",
                              { minimumFractionDigits: 2 },
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Expanded: Invoices as Tabs */}
                    {isExpanded && (
                      <div className="mt-4">
                        {card.invoices.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            Nenhum lançamento ainda
                          </p>
                        ) : (
                          <>
                            {/* Month Tabs */}
                            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto pb-px">
                              {card.invoices.map((invoice) => {
                                const status = getInvoiceStatus(
                                  invoice,
                                  card.invoices,
                                );
                                return (
                                  <button
                                    key={invoice.id}
                                    onClick={() =>
                                      setSelectedInvoice((prev) =>
                                        prev?.id === invoice.id
                                          ? null
                                          : invoice,
                                      )
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                                      selectedInvoice?.id === invoice.id
                                        ? `${status.bgColor} ${status.color} border-b-2 border-current`
                                        : `${status.color} hover:${status.bgColor}`
                                    }`}
                                  >
                                    <span className="text-xs">
                                      {status.badge}
                                    </span>
                                    {monthNames[invoice.month]}/{invoice.year}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Selected Invoice Content */}
                            {selectedInvoice &&
                              card.invoices.find(
                                (inv) => inv.id === selectedInvoice.id,
                              ) &&
                              (() => {
                                const invoiceStatus = getInvoiceStatus(
                                  selectedInvoice,
                                  card.invoices,
                                );
                                return (
                                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                                    {/* Invoice Header */}
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-semibold text-gray-900">
                                            Lançamento{" "}
                                            {monthNames[selectedInvoice.month]}/
                                            {selectedInvoice.year}
                                          </h4>
                                          <span
                                            className={`text-xs px-2 py-0.5 rounded ${invoiceStatus.bgColor} ${invoiceStatus.color}`}
                                          >
                                            {invoiceStatus.label}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                          Vence:{" "}
                                          {format(
                                            new Date(selectedInvoice.dueDate),
                                            "dd/MM/yyyy",
                                          )}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <p className="text-xs text-gray-500">
                                            Total
                                          </p>
                                          <p
                                            className={`text-lg font-bold ${invoiceStatus.color}`}
                                          >
                                            R${" "}
                                            {selectedInvoice.totalAmount.toLocaleString(
                                              "pt-BR",
                                              { minimumFractionDigits: 2 },
                                            )}
                                          </p>
                                        </div>
                                        {invoiceStatus.label !== "Pago" &&
                                          invoiceStatus.label !== "Futuro" && (
                                            <Button
                                              size="sm"
                                              className={
                                                invoiceStatus.label ===
                                                "Em Atraso"
                                                  ? "bg-red-600 hover:bg-red-700"
                                                  : "bg-emerald-600 hover:bg-emerald-700"
                                              }
                                              onClick={() =>
                                                openPayDialog(
                                                  card,
                                                  selectedInvoice,
                                                )
                                              }
                                            >
                                              Pagar
                                            </Button>
                                          )}
                                      </div>
                                    </div>

                                    {/* Purchases List */}
                                    {selectedInvoice.purchases &&
                                    selectedInvoice.purchases.length > 0 ? (
                                      <div className="space-y-2">
                                        {selectedInvoice.purchases.map(
                                          (purchase) => (
                                            <div
                                              key={purchase.id}
                                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"
                                            >
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <p className="font-medium text-gray-900">
                                                    {purchase.description}
                                                  </p>
                                                  {purchase.category && (
                                                    <span
                                                      className="px-2 py-0.5 rounded text-xs"
                                                      style={{
                                                        backgroundColor: `${purchase.category.color}20`,
                                                        color:
                                                          purchase.category
                                                            .color,
                                                      }}
                                                    >
                                                      {purchase.category.name}
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                  {format(
                                                    new Date(
                                                      purchase.purchaseDate,
                                                    ),
                                                    "dd/MM/yyyy",
                                                  )}
                                                  {purchase.installments >
                                                    1 && (
                                                    <span className="ml-2 text-purple-600">
                                                      Parcela{" "}
                                                      {
                                                        purchase.currentInstallment
                                                      }
                                                      /{purchase.installments}
                                                    </span>
                                                  )}
                                                </p>
                                              </div>
                                              <p className="font-semibold text-gray-900">
                                                R${" "}
                                                {purchase.totalAmount.toLocaleString(
                                                  "pt-BR",
                                                  { minimumFractionDigits: 2 },
                                                )}
                                              </p>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 text-center py-4">
                                        Nenhuma compra neste lançamento
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Compra</DialogTitle>
            <DialogDescription>
              Registre uma compra no cartão {selectedCard?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePurchase} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: iPhone, Supermercado"
                value={purchaseDesc}
                onChange={(e) => setPurchaseDesc(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Total</Label>
                <CurrencyInput
                  value={purchaseAmount}
                  onValueChange={setPurchaseAmount}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  max="48"
                  value={purchaseInstallments}
                  onChange={(e) => setPurchaseInstallments(e.target.value)}
                  required
                />
              </div>
            </div>

            {purchaseAmount > 0 && parseInt(purchaseInstallments) > 1 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  {purchaseInstallments}x de{" "}
                  <span className="font-semibold text-gray-900">
                    R${" "}
                    {(
                      purchaseAmount / parseInt(purchaseInstallments)
                    ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Data da Compra</Label>
              <div className="block">
                <DatePicker
                  date={purchaseDate}
                  onDateChange={(date) => date && setPurchaseDate(date)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria (Opcional)</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={purchaseCategoryId}
                onChange={(e) => setPurchaseCategoryId(e.target.value)}
              >
                <option value="none">Selecione uma categoria...</option>
                {expenseCategories.map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClosePurchaseDialog}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={submitting || purchaseAmount <= 0}
              >
                {submitting ? "Registrando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Invoice Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar Lançamento</DialogTitle>
            <DialogDescription>
              Pagamento do lançamento{" "}
              {invoiceToPay &&
                `${monthNames[invoiceToPay.invoice.month]}/${invoiceToPay.invoice.year}`}{" "}
              de R$ {invoiceToPay?.invoice.totalAmount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pagar com qual conta?</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={payAccountId}
                onChange={(e) => setPayAccountId(e.target.value)}
              >
                <option value="">Selecione uma conta...</option>
                {bankAccounts.map((account: BankAccount) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              {payAccountId &&
                bankAccounts.find(
                  (a: BankAccount) => a.id === payAccountId,
                ) && (
                  <p className="text-xs text-gray-500">
                    Saldo atual não verificado nesta tela (será validado no
                    backend).
                  </p>
                )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handlePayInvoice}
              disabled={!payAccountId || submitting}
            >
              {submitting ? "Pagando..." : "Confirmar Pagamento"}
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
              Tem certeza que deseja excluir este cartão? Todas os lançamentos
              associados serão excluídos.
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
