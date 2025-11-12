import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CategoryManager from './CategoryManager';
import { useBusinessContext } from '@/contexts/BusinessContext';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
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
  const [newCategoryName, setNewCategoryName] = useState('');

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
    if (!categoriesStorageKey) return;
    const categoriesToStore: StoredCategory[] = cats.map(({ id, name }) => ({ id, name }));
    localStorage.setItem(categoriesStorageKey, JSON.stringify(categoriesToStore));
  };

  const updateCategories = (newCategories: Category[], items: MenuItem[] = menuItems) => {
    const storedCategories: StoredCategory[] = newCategories.map(({ id, name }) => ({ id, name }));
    const recalculated = recalcCategoryCounts(storedCategories, items);
    setCategories(recalculated);
    persistCategories(recalculated);
  };

  const persistMenuItems = (items: MenuItem[]) => {
    if (!menuItemsStorageKey) return;
    localStorage.setItem(menuItemsStorageKey, JSON.stringify(items));
  };

  const syncMenuItems = (items: MenuItem[]) => {
    setMenuItems(items);
    if (currentBusiness) {
      const currentItemsString = JSON.stringify(currentBusiness.menuItems || []);
      const itemsString = JSON.stringify(items);
      if (currentItemsString !== itemsString) {
        updateBusiness(currentBusiness.id, { menuItems: items });
      }
    }
    persistMenuItems(items);
    if (currentBusiness) {
      updateBusiness(currentBusiness.id, { menuItems: items });
    }
  };

  useEffect(() => {
    const fallbackItems = currentBusiness?.menuItems || [];
    let items = fallbackItems;

    if (menuItemsStorageKey) {
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

    setMenuItems(items);
    setEditingItem(null);
    setFormData({ name: '', price: '', category: '', description: '' });
    setNewCategoryName('');
    setIsDialogOpen(false);
  }, [currentBusiness, menuItemsStorageKey]);

  useEffect(() => {
    if (!categoriesStorageKey) {
      setCategories([]);
      return;
    }

    const baseItems = menuItems;
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

    const derivedNames = Array.from(new Set(baseItems.map(item => item.category)));
    const derivedCategories = recalcCategoryCounts(
      derivedNames.map(name => ({ id: name, name })),
      baseItems
    );
    setCategories(derivedCategories);
    persistCategories(derivedCategories);
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

    const newItem: MenuItem = {
      id: editingItem?.id || Date.now().toString(),
      name: formData.name,
      price: parseFloat(formData.price),
      category: categoryName,
      description: formData.description
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
    setNewCategoryName('');
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
    setNewCategoryName('');
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
    setNewCategoryName('');
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
                  setNewCategoryName('');
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
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
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