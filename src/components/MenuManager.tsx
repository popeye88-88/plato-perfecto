import { useState } from 'react';
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

export default function MenuManager() {
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas', description: 'Tomate, mozzarella y albahaca fresca' },
    { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas', description: 'Carne, lechuga, tomate y queso' },
    { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas', description: 'Pasta con panceta, huevo y parmesano' },
  ]);
  
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Pizzas', productCount: 1 },
    { id: '2', name: 'Hamburguesas', productCount: 1 },
    { id: '3', name: 'Pastas', productCount: 1 },
  ]);
  
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

  const updateCategories = (newCategories: Category[]) => {
    const updatedCategories = newCategories.map(cat => ({
      ...cat,
      productCount: menuItems.filter(item => item.category === cat.name).length
    }));
    setCategories(updatedCategories);
  };

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

    if (editingItem) {
      setMenuItems(items => items.map(item => 
        item.id === editingItem.id ? newItem : item
      ));
      toast({
        title: "Producto actualizado",
        description: "El producto ha sido actualizado correctamente"
      });
    } else {
      setMenuItems(items => [...items, newItem]);
      
      // Add new category if it doesn't exist
      if (newCategoryName && !categories.find(cat => cat.name === newCategoryName)) {
        const newCategory: Category = {
          id: Date.now().toString(),
          name: newCategoryName,
          productCount: 1
        };
        setCategories(prev => [...prev, newCategory]);
      }
      
      toast({
        title: "Producto agregado",
        description: "El producto ha sido agregado al menú"
      });
    }

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
    setMenuItems(items => items.filter(item => item.id !== id));
    toast({
      title: "Producto eliminado",
      description: "El producto ha sido eliminado del menú"
    });
  };

  const openNewProductDialog = () => {
    setEditingItem(null);
    setFormData({ name: '', price: '', category: '', description: '' });
    setNewCategoryName('');
    setIsDialogOpen(true);
  };

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Gestión de Menú</h1>
          <p className="text-muted-foreground">Administra los productos de tu restaurante</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={openNewProductDialog}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Agregar Producto</span>
            <span className="sm:hidden">Producto</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex items-center gap-2"
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
                
                {(formData.category === '' && newCategoryName === '') && (
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