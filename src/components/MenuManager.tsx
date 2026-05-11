import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Settings, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import CategoryManager from './CategoryManager';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { isSupabaseConfigured, fetchCategories, upsertMenuItems, upsertCategories } from '@/lib/supabase';
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

export default function MenuManager() {
  const { toast } = useToast();
  const { currentBusiness, updateBusiness } = useBusinessContext();

  const [menuItems, setMenuItems] = useState<MenuItem[]>(currentBusiness?.menuItems || []);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: ''
  });
  const [hasSizes, setHasSizes] = useState(false);
  const [sizes, setSizes] = useState<{ id: string; name: string; price: number }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [color, setColor] = useState<string | undefined>(undefined);
  const [colorStyle, setColorStyle] = useState<ColorStyle>('fill');

  const categoriesStorageKey = useMemo(() => {
    return currentBusiness?.id ? `categories_${currentBusiness.id}` : null;
  }, [currentBusiness?.id]);

  const menuItemsStorageKey = useMemo(() => {
    return currentBusiness?.id ? `menuItems_${currentBusiness.id}` : null;
  }, [currentBusiness?.id]);

  const recalcCategoryCounts = (cats: StoredCategory[], items: MenuItem[]): Category[] => {
    return cats.map(cat => ({
      ...cat,
      productCount: items.filter(item => item.category === cat.name).length
    }));
  };

  const persistCategories = (cats: Category[]) => {
    if (!categoriesStorageKey || !currentBusiness?.id) return;
    const categoriesToStore: StoredCategory[] = cats.map(({ id, name }) => ({ id, name }));
    if (isSupabaseConfigured()) {
      upsertCategories(currentBusiness.id, categoriesToStore);
    } else {
      localStorage.setItem(categoriesStorageKey, JSON.stringify(categoriesToStore));
    }
  };

  const updateCategories = (newCategories: Category[], items: MenuItem[] = menuItems) => {
    const storedCategories: StoredCategory[] = newCategories.map(({ id, name }) => ({ id, name }));
    const recalculated = recalcCategoryCounts(storedCategories, items);
    setCategories(recalculated);
    persistCategories(recalculated);
  };

  const persistMenuItems = (items: MenuItem[]) => {
    if (!menuItemsStorageKey || !currentBusiness?.id) return;
    if (isSupabaseConfigured()) {
      upsertMenuItems(currentBusiness.id, items);
    } else {
      localStorage.setItem(menuItemsStorageKey, JSON.stringify(items));
    }
  };

  const syncMenuItems = (items: MenuItem[]) => {
    setMenuItems(items);
    if (currentBusiness) {
      updateBusiness(currentBusiness.id, { menuItems: items });
    }
    persistMenuItems(items);
  };

  useEffect(() => {
    const fallbackItems = currentBusiness?.menuItems || [];
    let items = fallbackItems;

    if (menuItemsStorageKey) {
      if (isSupabaseConfigured()) {
        items = fallbackItems;
      } else {
        const storedItems = localStorage.getItem(menuItemsStorageKey);
        if (storedItems) {
          try {
            items = JSON.parse(storedItems);
          } catch (error) {
            console.error('Error parsing stored menu items:', error);
          }
        } else if (fallbackItems.length > 0) {
          localStorage.setItem(menuItemsStorageKey, JSON.stringify(fallbackItems));
        }
      }
    }

    setMenuItems(items);
    setEditingItem(null);
    setFormData({ name: '', price: '', category: '', description: '' });
    setHasSizes(false);
    setSizes([]);
    setNewCategoryName('');
    setIsDialogOpen(false);
  }, [currentBusiness, menuItemsStorageKey]);

  useEffect(() => {
    if (!categoriesStorageKey || !currentBusiness?.id) {
      setCategories([]);
      return;
    }

    const baseItems = menuItems;
    const loadCategories = async () => {
      if (isSupabaseConfigured()) {
        const dbCats = await fetchCategories(currentBusiness!.id);
        let stored: StoredCategory[] = dbCats.map((c) => ({ id: c.id, name: c.name }));
        if (stored.length === 0 && baseItems.length > 0) {
          const derivedNames = Array.from(new Set(baseItems.map((item) => item.category)));
          stored = derivedNames.map((name) => ({ id: name, name }));
        }
        const recalculated = recalcCategoryCounts(stored, baseItems);
        setCategories(recalculated);
        return;
      }
      const savedCategories = localStorage.getItem(categoriesStorageKey);
      if (savedCategories) {
        try {
          const parsed: StoredCategory[] = JSON.parse(savedCategories);
          const recalculated = recalcCategoryCounts(parsed, baseItems);
          setCategories(recalculated);
          return;
        } catch (error) {
          console.error('Error parsing saved categories:', error);
        }
      }
      const derivedNames = Array.from(new Set(baseItems.map((item) => item.category)));
      const derivedCategories = recalcCategoryCounts(
        derivedNames.map((name) => ({ id: name, name })),
        baseItems
      );
      setCategories(derivedCategories);
      persistCategories(derivedCategories);
    };
    loadCategories();
  }, [categoriesStorageKey, currentBusiness, menuItems]);

  useEffect(() => {
    if (!categoriesStorageKey) return;
    setCategories(prev => {
      const stored = prev.map(({ id, name }) => ({ id, name }));
      const recalculated = recalcCategoryCounts(stored, menuItems);
      persistCategories(recalculated);
      return recalculated;
    });
  }, [menuItems, categoriesStorageKey]);

  const handleCategoryChange = (value: string) => {
    if (value === 'nueva-categoria') {
      setNewCategoryName('');
      setFormData({...formData, category: ''});
    } else {
      setFormData({...formData, category: value});
      setNewCategoryName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryName = newCategoryName || formData.category;
    
    if (!currentBusiness) {
      toast({
        title: "Negocio no seleccionado",
        description: "Selecciona un negocio en el menú de ajustes para administrar su menú.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name || !formData.price || !categoryName) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    if (hasSizes && sizes.length < 2) {
      toast({
        title: "Error",
        description: "Debes agregar al menos 2 tamaños cuando la opción de tamaños está activa",
        variant: "destructive"
      });
      return;
    }

    const newItem: MenuItem = {
      id: editingItem?.id || Date.now().toString(),
      name: formData.name,
      price: parseFloat(formData.price),
      category: categoryName,
      description: formData.description,
      hasSizes,
      sizes: hasSizes ? sizes : undefined,
      color: color || undefined,
      colorStyle
    };

    let updatedMenuItems: MenuItem[] = [];

    if (editingItem) {
      updatedMenuItems = menuItems.map(item => 
        item.id === editingItem.id ? newItem : item
      );
      syncMenuItems(updatedMenuItems);
      toast({
        title: "Producto actualizado",
        description: "El producto ha sido actualizado correctamente"
      });
    } else {
      updatedMenuItems = [...menuItems, newItem];
      syncMenuItems(updatedMenuItems);
      toast({
        title: "Producto agregado",
        description: "El producto ha sido agregado al menú"
      });
    }

    let updatedCategories = categories;
    if (newCategoryName && !categories.find(cat => cat.name === newCategoryName)) {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName,
        productCount: 0
      };
      updatedCategories = [...categories, newCategory];
    }

    updateCategories(updatedCategories, updatedMenuItems);

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
      description: item.description || ''
    });
    setHasSizes(item.hasSizes || false);
    setSizes(item.sizes || []);
    setNewCategoryName('');
    setColor(item.color);
    setColorStyle(item.colorStyle || 'fill');
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const updatedMenuItems = menuItems.filter(item => item.id !== id);
    syncMenuItems(updatedMenuItems);
    updateCategories(categories, updatedMenuItems);
    toast({
      title: "Producto eliminado",
      description: "El producto ha sido eliminado del menú"
    });
  };

  const openNewProductDialog = () => {
    if (!currentBusiness) {
      toast({
        title: "Negocio no disponible",
        description: "Selecciona un negocio para agregar productos.",
        variant: "destructive"
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
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
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
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={openNewProductDialog}
            className="bg-gradient-primary hover:opacity-90"
            disabled={!currentBusiness}
          >
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
      </div>
        
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                onChange={(e) => setFormData({...formData, price: e.target.value})}
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
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
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
                onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                        { id: Date.now().toString(), name: '', price: 0 },
                        { id: (Date.now() + 1).toString(), name: '', price: 0 }
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
                      onClick={() => setSizes([...sizes, { id: Date.now().toString(), name: '', price: 0 }])}
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
        onUpdateCategories={updateCategories}
      />

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
                              Tamaños: {item.sizes.map(s => `${s.name} ($${s.price.toFixed(2)})`).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.hasSizes && item.sizes && item.sizes.length > 0 ? (
                            <p className="text-sm font-bold text-primary">
                              ${Math.min(...item.sizes.map(s => s.price)).toFixed(2)} - ${Math.max(...item.sizes.map(s => s.price)).toFixed(2)}
                            </p>
                          ) : (
                            <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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