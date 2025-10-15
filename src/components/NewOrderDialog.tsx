import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  ingredients?: string[];
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  customIngredients?: string[];
}

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrder: (order: {
    items: OrderItem[];
    serviceType: 'puesto' | 'takeaway' | 'delivery';
    diners: number;
    customerName: string;
    deliveryCharge: number;
  }) => void;
  ingredientManagementEnabled?: boolean;
}

const mockMenuItems: MenuItem[] = [
  { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas', ingredients: ['tomate', 'mozzarella', 'albahaca'] },
  { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas', ingredients: ['carne', 'lechuga', 'tomate', 'queso'] },
  { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas', ingredients: ['pasta', 'panceta', 'huevo', 'parmesano'] },
  { id: '4', name: 'Ensalada César', price: 9.50, category: 'Ensaladas', ingredients: ['lechuga', 'pollo', 'crutones', 'queso parmesano'] },
];

export default function NewOrderDialog({ open, onOpenChange, onCreateOrder, ingredientManagementEnabled = false }: NewOrderDialogProps) {
  const [serviceType, setServiceType] = useState<'puesto' | 'takeaway' | 'delivery'>('puesto');
  const [diners, setDiners] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);

  const categories = ['all', ...new Set(mockMenuItems.map(item => item.category))];
  const filteredItems = selectedCategory === 'all' 
    ? mockMenuItems 
    : mockMenuItems.filter(item => item.category === selectedCategory);

  const deliveryCharge = serviceType === 'delivery' ? 60 : 0;

  const addItem = (menuItem: MenuItem) => {
    if (ingredientManagementEnabled && menuItem.ingredients) {
      setEditingItem({ menuItem, quantity: 1, customIngredients: [...menuItem.ingredients] });
    } else {
      setOrderItems(prev => {
        const existingIndex = prev.findIndex(item => 
          item.menuItem.id === menuItem.id && 
          JSON.stringify(item.customIngredients) === JSON.stringify(menuItem.ingredients)
        );
        if (existingIndex !== -1) {
          return prev.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, { menuItem, quantity: 1, customIngredients: menuItem.ingredients }];
      });
    }
  };

  const incrementQuantity = (menuItemId: string) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decrementQuantity = (menuItemId: string) => {
    setOrderItems(prev =>
      prev.map(item =>
        item.menuItem.id === menuItemId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const getItemQuantity = (menuItemId: string): number => {
    const item = orderItems.find(item => item.menuItem.id === menuItemId);
    return item ? item.quantity : 0;
  };

  const updateQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.menuItem.id !== menuItemId));
    } else {
      setOrderItems(prev =>
        prev.map(item =>
          item.menuItem.id === menuItemId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const total = orderItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0) + deliveryCharge;

  const handleSubmit = () => {
    if (!diners || !customerName || orderItems.length === 0) return;

    onCreateOrder({
      items: orderItems,
      serviceType,
      diners: parseInt(diners),
      customerName,
      deliveryCharge
    });

    // Reset form
    setOrderItems([]);
    setDiners('');
    setCustomerName('');
    setServiceType('puesto');
    setSelectedCategory('all');
    onOpenChange(false);
  };

  const saveEditedItem = () => {
    if (!editingItem) return;
    
    setOrderItems(prev => [...prev, editingItem]);
    setEditingItem(null);
  };

  const toggleIngredient = (ingredient: string) => {
    if (!editingItem) return;
    
    setEditingItem(prev => {
      if (!prev) return prev;
      const customIngredients = prev.customIngredients || [];
      const hasIngredient = customIngredients.includes(ingredient);
      
      return {
        ...prev,
        customIngredients: hasIngredient 
          ? customIngredients.filter(i => i !== ingredient)
          : [...customIngredients, ingredient]
      };
    });
  };

  if (editingItem) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personalizar {editingItem.menuItem.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ingredientes</Label>
              <div className="grid grid-cols-2 gap-2">
                {editingItem.menuItem.ingredients?.map(ingredient => (
                  <Badge
                    key={ingredient}
                    variant={editingItem.customIngredients?.includes(ingredient) ? "default" : "outline"}
                    className="cursor-pointer justify-center p-2"
                    onClick={() => toggleIngredient(ingredient)}
                  >
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveEditedItem} className="flex-1">
                Agregar
              </Button>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Top 3 fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-type">Tipo de orden</Label>
              <Select value={serviceType} onValueChange={(value: 'puesto' | 'takeaway' | 'delivery') => setServiceType(value)}>
                <SelectTrigger id="service-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="puesto">En Puesto</SelectItem>
                  <SelectItem value="takeaway">Take Away</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diners">Número comensales</Label>
              <Select value={diners} onValueChange={setDiners}>
                <SelectTrigger id="diners">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-name">Nombre</Label>
              <Input 
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label>Todas las categorías</Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategory === 'all' ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory('all')}
              >
                Todas
              </Badge>
              {categories.filter(cat => cat !== 'all').map(category => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredItems.map(item => {
              const quantity = getItemQuantity(item.id);
              return (
                <Card key={item.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex-1" onClick={() => addItem(item)}>
                        <h4 className="font-medium">{item.name}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">${item.price.toFixed(2)}</span>
                        {quantity > 0 ? (
                          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-2 py-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                decrementQuantity(item.id);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-semibold min-w-[20px] text-center">{quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                incrementQuantity(item.id);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

        </div>

        {/* Fixed footer with Total and Actions */}
        <div className="sticky bottom-0 bg-card border-t pt-4 space-y-4 mt-6">
          {deliveryCharge > 0 && (
            <div className="flex justify-between text-sm">
              <span>Cargo por entrega:</span>
              <span>${deliveryCharge.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSubmit}
              disabled={!diners || !customerName || orderItems.length === 0}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              Crear Orden
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}