import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  productCount: number;
}

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
}

export default function CategoryManager({ open, onOpenChange, categories, onUpdateCategories }: CategoryManagerProps) {
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      productCount: 0
    };

    onUpdateCategories([...categories, newCategory]);
    setNewCategoryName('');
    toast({
      title: "Categoría agregada",
      description: `La categoría "${newCategory.name}" ha sido agregada`
    });
  };

  const handleDeleteCategory = (category: Category) => {
    if (category.productCount > 0) {
      setCategoryToDelete(category);
      return;
    }

    onUpdateCategories(categories.filter(cat => cat.id !== category.id));
    toast({
      title: "Categoría eliminada",
      description: `La categoría "${category.name}" ha sido eliminada`
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCategory();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Categorías</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add new category */}
            <div className="space-y-3">
              <Label htmlFor="newCategory">Agregar nueva categoría</Label>
              <div className="flex gap-2">
                <Input
                  id="newCategory"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nombre de la categoría"
                  className="flex-1"
                />
                <Button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Existing categories */}
            <div className="space-y-3">
              <Label>Categorías existentes</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.map(category => (
                  <Card key={category.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {category.productCount} productos
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay categorías creadas
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              No se puede eliminar la categoría
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta categoría tiene productos asociados. No se puede eliminar una categoría que contiene productos.
            </p>
            {categoryToDelete && (
              <div className="p-3 bg-warning/10 rounded-lg">
                <p className="text-sm">
                  <strong>{categoryToDelete.name}</strong> tiene {categoryToDelete.productCount} producto(s) asociado(s).
                </p>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setCategoryToDelete(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
