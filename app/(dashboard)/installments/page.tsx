'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  CreditCard,
  Trash2,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  isPaid: boolean
  paidAt: string | null
  installmentNumber: number
}

interface InstallmentPurchase {
  id: string
  description: string
  totalAmount: number
  totalInstallments: number
  startDate: string
  paidInstallments: number
  overdueInstallments: number
  remainingInstallments: number
  installmentAmount: number
  paidAmount: number
  remainingAmount: number
  category?: { id: string; name: string; color: string } | null
  bankAccount: { id: string; name: string; color: string }
  transactions: Transaction[]
}

interface BankAccount {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
}

export default function InstallmentsPage() {
  const [purchases, setPurchases] = useState<InstallmentPurchase[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  
  // Form state
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [totalInstallments, setTotalInstallments] = useState('')
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [categoryId, setCategoryId] = useState<string>('none')
  const [bankAccountId, setBankAccountId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [purchaseToDelete, setPurchaseToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [purchasesRes, banksRes, catsRes] = await Promise.all([
        fetch('/api/installments'),
        fetch('/api/banks'),
        fetch('/api/categories')
      ])
      
      if (purchasesRes.ok) setPurchases(await purchasesRes.json())
      if (banksRes.ok) setBankAccounts(await banksRes.json())
      if (catsRes.ok) setCategories(await catsRes.json())
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          totalAmount,
          totalInstallments: parseInt(totalInstallments),
          startDate: format(startDate, 'yyyy-MM-dd'),
          categoryId: categoryId === 'none' ? null : categoryId,
          bankAccountId
        })
      })

      if (response.ok) {
        fetchData()
        handleCloseDialog()
        toast.success('Parcelamento criado com sucesso!')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao criar parcelamento')
      }
    } catch (err) {
      toast.error('Erro ao criar parcelamento')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayTransaction = async (transactionId: string, isPaid: boolean) => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/pay`, {
        method: isPaid ? 'DELETE' : 'POST'
      })

      if (response.ok) {
        fetchData()
        toast.success(isPaid ? 'Pagamento desmarcado!' : 'Parcela marcada como paga!')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao atualizar pagamento')
      }
    } catch (err) {
      toast.error('Erro ao atualizar pagamento')
    }
  }

  const handleDeleteClick = (id: string) => {
    setPurchaseToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return

    try {
      const response = await fetch(`/api/installments/${purchaseToDelete}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchData()
        toast.success('Parcelamento deletado!')
      } else {
        toast.error('Erro ao deletar parcelamento')
      }
    } catch (err) {
      toast.error('Erro ao deletar parcelamento')
    } finally {
      setDeleteDialogOpen(false)
      setPurchaseToDelete(null)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setDescription('')
    setTotalAmount(0)
    setTotalInstallments('')
    setStartDate(new Date())
    setCategoryId('none')
    setBankAccountId(bankAccounts[0]?.id || '')
  }

  const toggleExpand = (id: string) => {
    setExpandedPurchase(expandedPurchase === id ? null : id)
  }

  const getTransactionStatus = (transaction: Transaction) => {
    if (transaction.isPaid) return 'paid'
    const dueDate = new Date(transaction.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dueDate < today) return 'overdue'
    return 'pending'
  }

  const expenseCategories = categories.filter(c => c.type === 'EXPENSE')
  
  const totals = purchases.reduce((acc, p) => ({
    total: acc.total + p.totalAmount,
    paid: acc.paid + p.paidAmount,
    remaining: acc.remaining + p.remainingAmount,
    overdue: acc.overdue + (p.overdueInstallments || 0)
  }), { total: 0, paid: 0, remaining: 0, overdue: 0 })

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Parcelamentos</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Acompanhe suas compras parceladas
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary-600 hover:bg-primary-700 gap-2 text-sm" 
                size="sm"
                disabled={bankAccounts.length === 0}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Parcelamento</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Parcelamento</DialogTitle>
                <DialogDescription>
                  Registre uma compra parcelada para acompanhar as parcelas
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: iPhone, TV, Notebook"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor Total</Label>
                    <CurrencyInput
                      value={totalAmount}
                      onValueChange={setTotalAmount}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installments">Nº de Parcelas</Label>
                    <Input
                      id="installments"
                      type="number"
                      min="2"
                      max="48"
                      placeholder="Ex: 12"
                      value={totalInstallments}
                      onChange={(e) => setTotalInstallments(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {totalAmount > 0 && totalInstallments && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Valor da parcela: <span className="font-semibold text-gray-900">
                        R$ {(totalAmount / parseInt(totalInstallments || '1')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primeira Parcela</Label>
                    <DatePicker
                      date={startDate}
                      onDateChange={(d) => d && setStartDate(d)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conta</Label>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting || !bankAccountId || totalAmount <= 0}
                  >
                    {submitting ? 'Criando...' : 'Criar Parcelamento'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Warning if no bank accounts */}
        {bankAccounts.length === 0 && !loading && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800">
                  Você precisa criar uma conta bancária antes de registrar parcelamentos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-purple-600">Total</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-700">
                    R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-emerald-600">Pago</p>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-700">
                    R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-orange-600">A Pagar</p>
                  <p className="text-lg sm:text-2xl font-bold text-orange-700">
                    R$ {totals.remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          {totals.overdue > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-red-600">Em Atraso</p>
                    <p className="text-lg sm:text-2xl font-bold text-red-700">
                      {totals.overdue} parcela{totals.overdue > 1 ? 's' : ''}
                    </p>
                  </div>
                  <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Purchases List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Carregando parcelamentos...</p>
          </div>
        ) : purchases.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum parcelamento encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                Registre suas compras parceladas para acompanhar as parcelas
              </p>
              {bankAccounts.length > 0 && (
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Parcelamento
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const progressPercent = (purchase.paidInstallments / purchase.totalInstallments) * 100
              const isExpanded = expandedPurchase === purchase.id
              
              return (
                <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{purchase.description}</h3>
                          {purchase.category && (
                            <span 
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ 
                                backgroundColor: `${purchase.category.color}20`,
                                color: purchase.category.color 
                              }}
                            >
                              {purchase.category.name}
                            </span>
                          )}
                          {(purchase.overdueInstallments || 0) > 0 && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                              {purchase.overdueInstallments} em atraso
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Início: {format(new Date(purchase.startDate), 'MMM/yyyy', { locale: ptBR })}
                          <span className="mx-1">•</span>
                          {purchase.bankAccount.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleExpand(purchase.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(purchase.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">
                          {purchase.paidInstallments} de {purchase.totalInstallments} parcelas pagas
                        </span>
                        <span className="font-medium text-gray-900">
                          {Math.round(progressPercent)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Values */}
                    <div className="grid grid-cols-3 gap-4 text-center pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Parcela</p>
                        <p className="font-semibold text-gray-900">
                          R$ {purchase.installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pago</p>
                        <p className="font-semibold text-emerald-600">
                          R$ {purchase.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Restante</p>
                        <p className="font-semibold text-orange-600">
                          R$ {purchase.remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Expanded transactions list */}
                    {isExpanded && purchase.transactions && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Parcelas</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {purchase.transactions.map((transaction) => {
                            const status = getTransactionStatus(transaction)
                            
                            return (
                              <div 
                                key={transaction.id}
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  status === 'paid' ? 'bg-emerald-50' :
                                  status === 'overdue' ? 'bg-red-50' : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    status === 'paid' ? 'bg-emerald-200 text-emerald-700' :
                                    status === 'overdue' ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {transaction.installmentNumber}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Parcela {transaction.installmentNumber}/{purchase.totalInstallments}
                                    </p>
                                    <p className={`text-xs ${
                                      status === 'paid' ? 'text-emerald-600' :
                                      status === 'overdue' ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                      {status === 'paid' 
                                        ? `Pago em ${format(new Date(transaction.paidAt!), 'dd/MM/yyyy')}`
                                        : `Vence em ${format(new Date(transaction.date), 'dd/MM/yyyy')}`
                                      }
                                      {status === 'overdue' && ' (Em atraso)'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-gray-900">
                                    R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <Button
                                    variant={status === 'paid' ? 'outline' : 'default'}
                                    size="sm"
                                    className={status === 'paid' 
                                      ? 'h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50' 
                                      : 'h-8 bg-emerald-600 hover:bg-emerald-700'
                                    }
                                    onClick={() => handlePayTransaction(transaction.id, transaction.isPaid)}
                                  >
                                    {status === 'paid' ? (
                                      <>
                                        <X className="h-3 w-3 mr-1" />
                                        Desfazer
                                      </>
                                    ) : (
                                      <>
                                        <Check className="h-3 w-3 mr-1" />
                                        Pagar
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este parcelamento? Todas as transações relacionadas também serão excluídas e o saldo da conta será restaurado.
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
  )
}
