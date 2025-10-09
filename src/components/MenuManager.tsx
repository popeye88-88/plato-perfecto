import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from '@/contexts/BusinessContext';
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
  const { currentBusiness } = useBusinessContext();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
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
  const [loading, setLoading] = useState(true);

  // Load menu items and categories
  useEffect(() => {
    if (currentBusiness) {
      loadMenuItems();
      loadCategories();
    }
  }, [currentBusiness]);

  const loadMenuItems = async () => {
    if (!currentBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');
      
      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!currentBusiness) return;
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('name');
      
      if (error) throw error;
      
      const categoriesWithCount = data?.map(cat => ({
        ...cat,
        productCount: menuItems.filter(item => item.category === cat.name).length
      })) || [];
      
      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const updateCategories = async () => {
    await loadCategories();
    await loadMenuItems();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness) return;
    
    const categoryName = newCategoryName || formData.category;
    
    if (!formData.name || !formData.price || !categoryName) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      // Add new category if it doesn't exist
      if (newCategoryName && !categories.find(cat => cat.name === newCategoryName)) {
        const { error: catError } = await supabase
          .from('categories')
          .insert({
            business_id: currentBusiness.id,
            name: newCategoryName
          });
        
        if (catError) throw catError;
        await loadCategories();
      }

      const itemData = {
        business_id: currentBusiness.id,
        name: formData.name,
        price: parseFloat(formData.price),
        category: categoryName,
        description: formData.description || null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        
        toast({
          title: "Producto actualizado",
          description: "El producto ha sido actualizado correctamente"
        });
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);
        
        if (error) throw error;
        
        toast({
          title: "Producto agregado",
          description: "El producto ha sido agregado al menú"
        });
      }

      await loadMenuItems();
      setFormData({ name: '', price: '', category: '', description: '' });
      setNewCategoryName('');
      setEditingItem(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el producto",
        variant: "destructive"
      });
    }
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await loadMenuItems();
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado del menú"
      });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      });
    }
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