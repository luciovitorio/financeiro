"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CategoriesLoading from "./loading";
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
  Tag,
  ShoppingCart,
  Home,
  Car,
  Utensils,
  Briefcase,
  Heart,
  Gift,
  Zap,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/use-financial-data";

const ICON_OPTIONS = [
  { value: "Tag", label: "Tag", Icon: Tag },
  { value: "ShoppingCart", label: "Compras", Icon: ShoppingCart },
  { value: "Home", label: "Casa", Icon: Home },
  { value: "Car", label: "Carro", Icon: Car },
  { value: "Utensils", label: "Alimentação", Icon: Utensils },
  { value: "Briefcase", label: "Trabalho", Icon: Briefcase },
  { value: "Heart", label: "Saúde", Icon: Heart },
  { value: "Gift", label: "Presentes", Icon: Gift },
  { value: "Zap", label: "Energia", Icon: Zap },
];

const COLOR_OPTIONS = [
  { value: "#059669", label: "Verde" },
  { value: "#0ea5e9", label: "Azul" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#f59e0b", label: "Laranja" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#6b7280", label: "Cinza" },
  { value: "#84cc16", label: "Lima" },
];

interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
  icon: string;
  createdAt: string;
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [selectedColor, setSelectedColor] = useState("#059669");
  const [selectedIcon, setSelectedIcon] = useState("Tag");

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name,
      type,
      color: selectedColor,
      icon: selectedIcon,
    };

    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data });
        toast.success("Categoria atualizada!");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Categoria criada!");
      }
      handleCloseDialog();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar categoria");
    }
  };

  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteMutation.mutateAsync(categoryToDelete);
      toast.success("Categoria deletada!");
    } catch (err) {
      toast.error("Erro ao deletar categoria");
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setSelectedColor(category.color);
    setSelectedIcon(category.icon);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setName("");
    setType("EXPENSE");
    setSelectedColor("#059669");
    setSelectedIcon("Tag");
  };

  const handleNewCategory = () => {
    setType(activeTab);
    setEditingCategory(null);
    setName("");
    setSelectedColor("#059669");
    setSelectedIcon("Tag");
    setDialogOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    const option = ICON_OPTIONS.find((opt) => opt.value === iconName);
    return option?.Icon || Tag;
  };

  const incomeCategories = categories.filter((c: any) => c.type === "INCOME");
  const expenseCategories = categories.filter((c: any) => c.type === "EXPENSE");
  const filteredCategories =
    activeTab === "INCOME" ? incomeCategories : expenseCategories;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return <CategoriesLoading />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Categorias
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Organize suas receitas e despesas por categoria
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary-600 hover:bg-primary-700 gap-2 text-sm"
                size="sm"
                onClick={handleNewCategory}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Categoria</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory
                    ? "Atualize as informações da categoria"
                    : "Crie uma nova categoria para organizar suas finanças"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Categoria</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Alimentação, Salário"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("EXPENSE")}
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
                      onClick={() => setType("INCOME")}
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

                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {ICON_OPTIONS.map((option) => {
                      const IconComponent = option.Icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedIcon(option.value)}
                          className={`p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                            selectedIcon === option.value
                              ? "border-emerald-600 bg-emerald-50"
                              : "border-gray-200 hover:border-emerald-300"
                          }`}
                          title={option.label}
                        >
                          <IconComponent className="h-5 w-5 mx-auto text-gray-700" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {COLOR_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedColor(option.value)}
                        className={`h-8 rounded-lg border-2 transition-all hover:scale-110 ${
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
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Salvando..."
                      : editingCategory
                        ? "Atualizar"
                        : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("EXPENSE")}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === "EXPENSE"
                ? "border-red-500 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Despesas ({expenseCategories.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("INCOME")}
            className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === "INCOME"
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Receitas ({incomeCategories.length})
            </div>
          </button>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Tag className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma categoria de{" "}
                {activeTab === "INCOME" ? "receita" : "despesa"}
              </h3>
              <p className="text-gray-600 mb-4">
                Crie categorias para organizar suas finanças
              </p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                onClick={handleNewCategory}
              >
                <Plus className="h-4 w-4" />
                Criar Primeira Categoria
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredCategories.map((category: any) => {
              const IconComponent = getIconComponent(category.icon);

              return (
                <Card
                  key={category.id}
                  className="hover:shadow-lg transition-shadow group"
                >
                  <CardContent className="pt-6 text-center relative">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(category.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div
                      className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent
                        className="h-6 w-6"
                        style={{ color: category.color }}
                      />
                    </div>
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {category.name}
                    </p>
                  </CardContent>
                </Card>
              );
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
              Tem certeza que deseja excluir esta categoria? As transações
              associadas não serão afetadas.
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
