import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/lib/business-context';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export default function MenuManager() {
  const { toast } = useToast();
  const { selectedBusiness } = useBusiness();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas', description: 'Tomate, mozzarella y albahaca fresca' },
    { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas', description: 'Carne, lechuga, tomate y queso' },
    { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas', description: 'Pasta con panceta, huevo y parmesano' },
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: ''
  });

  const categories = [...new Set(menuItems.map(item => item.category))];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.category) {
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
      category: formData.category,
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
      toast({
        title: "Producto agregado",
        description: "El producto ha sido agregado al menú"
      });
    }

    setFormData({ name: '', price: '', category: '', description: '' });
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
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setMenuItems(items => items.filter(item => item.id !== id));
    toast({
      title: "Producto eliminado",
      description: "El producto ha sido eliminado del menú"
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Menú</h1>
          <p className="text-muted-foreground">{selectedBusiness ? `Negocio: ${selectedBusiness.name}` : 'Selecciona un negocio'}</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="Ej: Pizzas, Hamburguesas, Pastas"
                />
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
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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