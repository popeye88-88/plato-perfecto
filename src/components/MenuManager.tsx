import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Settings, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import CategoryManager from './CategoryManager';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  fetchCategories,
  insertMenuItem,
  updateMenuItem,
  deleteMenuItem,
  insertCategory,
  renameCategoryWithCascade,
  deleteCategory,
} from '@/lib/supabase';
import { COLOR_PRESETS, DEFAULT_COLOR, type ColorStyle } from '@/lib/menuItemColor';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  hasSizes: boolean;
  sizes?: { id: string; name: string; price: number }[];
  color?: string;
  colorStyle?: ColorStyle;
}

interface Category {
  id: string;
  name: string;
  productCount: number;
}

type StoredCategory = Pick<Category, 'id' | 'name'>;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export default function MenuManager() {
  const { toast } = useToast();
  const { currentBusiness, updateBusiness } = useBusinessContext();
  const { can } = usePermissions();

  const [menuItems, setMenuItems] = useState<MenuItem[]>(currentBusiness?.menuItems || []);
  const [storedCategories, setStoredCategories] = useState<StoredCategory[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
  });
  const [hasSizes, setHasSizes] = useState(false);
  const [sizes, setSizes] = useState<{ id: string; name: string; price: number }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [colorStyle, setColorStyle] = useState<ColorStyle>('fill');

  const categories: Category[] = storedCategories.map((c) => ({
    ...c,
    productCount: menuItems.filter((item) => item.category === c.name).length,
  }));

  const updateContextItems = (items: MenuItem[]) => {
    setMenuItems(items);
    if (currentBusiness) {
      updateBusiness(currentBusiness.id, { menuItems: items });
    }
  };

  useEffect(() => {
    setMenuItems(currentBusiness?.menuItems || []);
    setEditingItem(null);
    setFormData({ name: '', price: '', category: '', description: '' });
    setHasSizes(false);
    setSizes([]);
    setNewCategoryName('');
    setIsDialogOpen(false);
  }, [currentBusiness]);

  useEffect(() => {
    if (!currentBusiness?.id) {
      setStoredCategories([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const dbCats = await fetchCategories(currentBusiness.id);
      if (cancelled) return;
      let stored: StoredCategory[] = dbCats.map((c) => ({ id: c.id, name: c.name }));
      // Derive from existing items if none in DB yet (does not persist)
      if (stored.length === 0 && (currentBusiness.menuItems?.length ?? 0) > 0) {
        const derived = Array.from(new Set(currentBusiness.menuItems!.map((i) => i.category)));
        stored = derived.map((name) => ({ id: newId(), name }));
      }
      setStoredCategories(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentBusiness]);

  const handleCategoryChange = (value: string) => {
    if (value === 'nueva-categoria') {
      setNewCategoryName('');
      setFormData({ ...formData, category: '' });
    } else {
      setFormData({ ...formData, category: value });
      setNewCategoryName('');
    }
  };

  const ensureCategory = async (name: string): Promise<StoredCategory | null> => {
    const existing = storedCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    if (!currentBusiness) return null;
    const cat: StoredCategory = { id: newId(), name };
    const ok = await insertCategory(currentBusiness.id, cat);
    if (!ok) return null;
    setStoredCategories((prev) => [...prev, cat]);
    return cat;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const categoryName = (newCategoryName || formData.category).trim();

    if (!currentBusiness) {
      toast({
        title: 'Negocio no seleccionado',
        description: 'Selecciona un negocio en el menú de ajustes para administrar su menú.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name || !formData.price || !categoryName) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (hasSizes && sizes.length < 2) {
      toast({
        title: 'Error',
        description: 'Debes agregar al menos 2 tamaños cuando la opción de tamaños está activa',
        variant: 'destructive',
      });
      return;
    }

    // Make sure the category exists (creates it as a row if new)
    const cat = await ensureCategory(categoryName);
    if (!cat) {
      toast({ title: 'Error', description: 'No se pudo crear la categoría', variant: 'destructive' });
      return;
    }

    const item: MenuItem = {
      id: editingItem?.id || newId(),
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      category: cat.name,
      description: formData.description,
      hasSizes,
      sizes: hasSizes ? sizes : undefined,
      color: color || undefined,
      colorStyle,
    };

    if (editingItem) {
      const ok = await updateMenuItem(currentBusiness.id, item);
      if (!ok) {
        toast({ title: 'Error', description: 'No se pudo actualizar el producto', variant: 'destructive' });
        return;
      }
      updateContextItems(menuItems.map((m) => (m.id === editingItem.id ? item : m)));
      toast({ title: 'Producto actualizado', description: 'El producto ha sido actualizado correctamente' });
    } else {
      const ok = await insertMenuItem(currentBusiness.id, item);
      if (!ok) {
        toast({ title: 'Error', description: 'No se pudo agregar el producto', variant: 'destructive' });
        return;
      }
      updateContextItems([...menuItems, item]);
      toast({ title: 'Producto agregado', description: 'El producto ha sido agregado al menú' });
    }

    setFormData({ name: '', price: '', category: '', description: '' });
    setHasSizes(false);
    setSizes([]);
    setNewCategoryName('');
    setColor(undefined);
    setColorStyle('fill');
    setEditingItem(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      description: item.description || '',
    });
    setHasSizes(item.hasSizes || false);
    setSizes(item.sizes || []);
    setNewCategoryName('');
    setColor(item.color);
    setColorStyle(item.colorStyle || 'fill');
    setIsDialogOpen(true);
  };

  const requestDelete = (item: MenuItem) => setItemToDelete(item);

  const performDelete = async () => {
    if (!itemToDelete || !currentBusiness) return;
    const ok = await deleteMenuItem(currentBusiness.id, itemToDelete.id);
    if (!ok) {
      toast({ title: 'Error', description: 'No se pudo eliminar el producto', variant: 'destructive' });
      return;
    }
    updateContextItems(menuItems.filter((m) => m.id !== itemToDelete.id));
    toast({ title: 'Producto eliminado', description: `"${itemToDelete.name}" ha sido eliminado` });
    setItemToDelete(null);
  };

  const handleAddCategory = async (name: string) => {
    if (!currentBusiness) return false;
    const cat: StoredCategory = { id: newId(), name };
    const ok = await insertCategory(currentBusiness.id, cat);
    if (ok) setStoredCategories((prev) => [...prev, cat]);
    return ok;
  };

  const handleRenameCategory = async (id: string, oldName: string, newName: string) => {
    if (!currentBusiness) return false;
    const ok = await renameCategoryWithCascade(currentBusiness.id, id, oldName, newName);
    if (ok) {
      setStoredCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: newName } : c)));
      updateContextItems(
        menuItems.map((item) => (item.category === oldName ? { ...item, category: newName } : item))
      );
    }
    return ok;
  };

  const handleDeleteCategory = async (id: string) => {
    if (!currentBusiness) return false;
    const ok = await deleteCategory(currentBusiness.id, id);
    if (ok) setStoredCategories((prev) => prev.filter((c) => c.id !== id));
    return ok;
  };

  const openNewProductDialog = () => {
    if (!currentBusiness) {
      toast({
        title: 'Negocio no disponible',
        description: 'Selecciona un negocio para agregar productos.',
        variant: 'destructive',
      });
      return;
    }
    setEditingItem(null);
    setFormData({ name: '', price: '', category: '', description: '' });
    setHasSizes(false);
    setSizes([]);
    setNewCategoryName('');
    setColor(undefined);
    setColorStyle('fill');
    setIsDialogOpen(true);
  };

  if (!currentBusiness) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-foreground mb-2">Gestión de Menú</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Selecciona un negocio en el menú de ajustes para administrar sus productos.
          </p>
        </div>
      </div>
    );
  }

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-foreground">Gestión de Menú</h1>
            <Badge variant="secondary" className="text-xs md:text-sm">
              {currentBusiness.name}
            </Badge>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">Administra los productos de tu restaurante</p>
        </div>

        {can.editMenu && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={openNewProductDialog} className="bg-gradient-primary hover:opacity-90" disabled={!currentBusiness}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Agregar Producto</span>
              <span className="sm:hidden">Producto</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCategoryManagerOpen(true)}
              className="flex items-center gap-2"
              disabled={!currentBusiness}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Editar Categorías</span>
              <span className="sm:hidden">Categorías</span>
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Producto' : 'Agregar Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Pizza Margherita"
              />
            </div>
            <div>
              <Label htmlFor="price">Precio *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoría *</Label>
              <div className="space-y-2">
                <Select
                  value={formData.category || (newCategoryName ? 'nueva-categoria' : '')}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="nueva-categoria">+ Nueva categoría</SelectItem>
                  </SelectContent>
                </Select>

                {!formData.category && (
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de la nueva categoría"
                  />
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del producto"
              />
            </div>

            {/* Sizes Section */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasSizes" className="cursor-pointer">¿Este producto tiene tamaños?</Label>
                <Switch
                  id="hasSizes"
                  checked={hasSizes}
                  onCheckedChange={(checked) => {
                    setHasSizes(checked);
                    if (checked && sizes.length === 0) {
                      setSizes([
                        { id: newId(), name: '', price: 0 },
                        { id: newId(), name: '', price: 0 },
                      ]);
                    }
                  }}
                />
              </div>
              {hasSizes && (
                <div className="space-y-2">
                  {sizes.map((size, index) => (
                    <div key={size.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Nombre (ej: Chico)"
                        value={size.name}
                        onChange={(e) => {
                          const updated = [...sizes];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setSizes(updated);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Precio"
                        value={size.price || ''}
                        onChange={(e) => {
                          const updated = [...sizes];
                          updated[index] = { ...updated[index], price: parseFloat(e.target.value) || 0 };
                          setSizes(updated);
                        }}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSizes(sizes.filter((_, i) => i !== index))}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {sizes.length >= 10 ? (
                    <p className="text-xs text-muted-foreground">Máximo 10 tamaños</p>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSizes([...sizes, { id: newId(), name: '', price: 0 }])}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Agregar Tamaño
                    </Button>
                  )}
                  {hasSizes && sizes.length < 2 && (
                    <p className="text-xs text-destructive">Se requieren al menos 2 tamaños</p>
                  )}
                </div>
              )}
            </div>

            {/* Color Section */}
            <div className="space-y-3 border-t border-border pt-4">
              <Label>Color del producto</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setColor(undefined)}
                  className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs ${!color ? 'border-foreground' : 'border-border'}`}
                  style={{ backgroundColor: DEFAULT_COLOR }}
                  title="Sin color (gris claro por defecto)"
                >
                  {!color && '✓'}
                </button>
                {COLOR_PRESETS.slice(1).map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setColor(preset.value)}
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs ${color === preset.value ? 'border-foreground' : 'border-border'}`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  >
                    {color === preset.value && '✓'}
                  </button>
                ))}
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Aplicar como</Label>
                <RadioGroup value={colorStyle} onValueChange={(v) => setColorStyle(v as ColorStyle)} className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fill" id="color-fill" />
                    <Label htmlFor="color-fill" className="cursor-pointer">Fondo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="border" id="color-border" />
                    <Label htmlFor="color-border" className="cursor-pointer">Borde</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="bg-gradient-primary hover:opacity-90 flex-1">
                {editingItem ? 'Actualizar' : 'Agregar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingItem(null);
                  setFormData({ name: '', price: '', category: '', description: '' });
                  setHasSizes(false);
                  setSizes([]);
                  setNewCategoryName('');
                  setColor(undefined);
                  setColorStyle('fill');
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CategoryManager
        open={isCategoryManagerOpen}
        onOpenChange={setIsCategoryManagerOpen}
        categories={categories}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Confirm delete item */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(o) => !o && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <strong>{itemToDelete?.name}</strong> del menú. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={performDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Menu Items by Category */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category}
                <Badge variant="secondary">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          {item.hasSizes && item.sizes && item.sizes.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Tamaños: {item.sizes.map((s) => `${s.name} ($${s.price.toFixed(2)})`).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.hasSizes && item.sizes && item.sizes.length > 0 ? (
                            <p className="text-sm font-bold text-primary">
                              ${Math.min(...item.sizes.map((s) => s.price)).toFixed(2)} - ${Math.max(...item.sizes.map((s) => s.price)).toFixed(2)}
                            </p>
                          ) : (
                            <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {can.editMenu && (
                      <div className="flex gap-1 ml-4">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestDelete(item)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
