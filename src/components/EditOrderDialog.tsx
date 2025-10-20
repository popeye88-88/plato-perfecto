import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, X } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: 'preparando' | 'entregando' | 'cobrando';
  cancelled?: boolean;
  cancellationReason?: string;
  ingredients?: string[];
}

interface Order {
  id: string;
  number: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'preparando' | 'entregando' | 'cobrando' | 'pagado';
  createdAt: Date;
  paymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia';
  serviceType?: 'puesto' | 'takeaway' | 'delivery';
  deliveryCharge?: number;
  diners?: number;
  edited?: boolean;
  discountAmount?: number;
  discountReason?: string;
}

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSave: (updatedOrder: Order) => void;
}

const menuItems = [
  { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas' },
  { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas' },
  { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas' },
  { id: '4', name: 'Ensalada César', price: 10.00, category: 'Ensaladas' },
];

export default function EditOrderDialog({ open, onOpenChange, order, onSave }: EditOrderDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);

  // Initialize form when order changes
  React.useEffect(() => {
    if (order) {
      setCustomerName(order.customerName);
      setItems([...order.items]);
    }
  }, [order]);

  const addItem = (menuItem: any) => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      status: 'preparando',
      cancelled: false
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSave = () => {
    if (!order || !customerName.trim()) return;

    const updatedOrder: Order = {
      ...order,
      customerName: customerName.trim(),
      items,
      total: calculateTotal(),
      edited: true
    };

    onSave(updatedOrder);
    onOpenChange(false);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Orden {order.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Name */}
          <div>
            <Label htmlFor="customerName">Nombre del Cliente</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ingresa el nombre"
            />
          </div>

          {/* Add New Items */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Agregar Productos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                      <p className="font-semibold text-primary">${item.price.toFixed(2)}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addItem(item)}
                      className="bg-gradient-primary hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Current Items */}
          {items.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Productos de la Orden</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="ml-4 font-semibold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-gradient-primary hover:opacity-90"
              disabled={!customerName.trim() || items.length === 0}
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}