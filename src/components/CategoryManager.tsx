import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, AlertTriangle, Pencil, Check, X } from 'lucide-react';
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
  onAddCategory: (name: string) => Promise<boolean>;
  onRenameCategory: (id: string, oldName: string, newName: string) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
}

export default function CategoryManager({
  open,
  onOpenChange,
  categories,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [blockedCategory, setBlockedCategory] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'Categoría duplicada', description: 'Ya existe una categoría con ese nombre', variant: 'destructive' });
      return;
    }
    const ok = await onAddCategory(name);
    if (ok) {
      setNewCategoryName('');
      toast({ title: 'Categoría agregada', description: `"${name}" ha sido agregada` });
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async (cat: Category) => {
    const name = editingName.trim();
    if (!name || name === cat.name) {
      cancelEdit();
      return;
    }
    if (categories.some((c) => c.id !== cat.id && c.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'Nombre en uso', description: 'Ya existe otra categoría con ese nombre', variant: 'destructive' });
      return;
    }
    const ok = await onRenameCategory(cat.id, cat.name, name);
    if (ok) {
      toast({ title: 'Categoría renombrada', description: `"${cat.name}" → "${name}"` });
      cancelEdit();
    }
  };

  const requestDelete = (category: Category) => {
    if (category.productCount > 0) {
      setBlockedCategory(category);
      return;
    }
    setConfirmDelete(category);
  };

  const performDelete = async () => {
    if (!confirmDelete) return;
    const ok = await onDeleteCategory(confirmDelete.id);
    if (ok) toast({ title: 'Categoría eliminada', description: `"${confirmDelete.name}" ha sido eliminada` });
    setConfirmDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Categorías</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="newCategory">Agregar nueva categoría</Label>
              <div className="flex gap-2">
                <Input
                  id="newCategory"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  placeholder="Nombre de la categoría"
                  className="flex-1"
                />
                <Button onClick={handleAdd} disabled={!newCategoryName.trim()} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Categorías existentes</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        {editingId === category.id ? (
                          <>
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(category);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              autoFocus
                              className="flex-1"
                            />
                            <Button variant="ghost" size="sm" onClick={() => saveEdit(category)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-medium truncate">{category.name}</span>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {category.productCount} productos
                              </Badge>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => startEdit(category)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => requestDelete(category)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
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

      {/* Blocked: category has products */}
      <Dialog open={!!blockedCategory} onOpenChange={() => setBlockedCategory(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              No se puede eliminar la categoría
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta categoría tiene productos asociados. Mueve o elimina sus productos antes de borrarla.
            </p>
            {blockedCategory && (
              <div className="p-3 bg-warning/10 rounded-lg">
                <p className="text-sm">
                  <strong>{blockedCategory.name}</strong> tiene {blockedCategory.productCount} producto(s) asociado(s).
                </p>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setBlockedCategory(null)}>
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm delete (empty category) */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar la categoría <strong>{confirmDelete?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
