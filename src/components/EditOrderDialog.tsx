import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');

  useEffect(() => {
    if (order) {
      setEditedOrder({ ...order });
    }
  }, [order]);

  if (!editedOrder) return null;

  const addMenuItem = () => {
    if (!selectedMenuItem) return;
    
    const menuItem = menuItems.find(item => item.id === selectedMenuItem);
    if (!menuItem) return;

    const newItem: OrderItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      status: 'preparando'
    };

    setEditedOrder(prev => ({
      ...prev!,
      items: [...prev!.items, newItem],
      total: prev!.total + menuItem.price
    }));

    setSelectedMenuItem('');
  };

  const removeItem = (itemId: string) => {
    const item = editedOrder.items.find(i => i.id === itemId);
    if (!item) return;

    setEditedOrder(prev => ({
      ...prev!,
      items: prev!.items.filter(i => i.id !== itemId),
      total: prev!.total - item.price
    }));
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setEditedOrder(prev => {
      const items = prev!.items.map(item => {
        if (item.id === itemId) {
          const priceDiff = item.price * (newQuantity - item.quantity);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });

      const item = prev!.items.find(i => i.id === itemId);
      const priceDiff = item ? item.price * (newQuantity - item.quantity) : 0;

      return {
        ...prev!,
        items,
        total: prev!.total + priceDiff
      };
    });
  };

  const handleSave = () => {
    if (!editedOrder) return;

    onSave(editedOrder);
    onOpenChange(false);
    
    toast({
      title: "Orden actualizada",
      description: `Orden ${editedOrder.number} actualizada exitosamente`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Orden {editedOrder.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div>
            <Label htmlFor="customerName">Nombre del Cliente</Label>
            <Input
              id="customerName"
              value={editedOrder.customerName}
              onChange={(e) => setEditedOrder(prev => ({
                ...prev!,
                customerName: e.target.value
              }))}
            />
          </div>

          {/* Current Items */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Elementos de la Orden</h3>
            <div className="space-y-2">
              {editedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${item.price.toFixed(2)} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                    </div>
                    <Badge variant="outline" className="mt-1">
                      {item.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Item */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Añadir Elemento</h3>
            <div className="flex gap-2">
              <Select value={selectedMenuItem} onValueChange={setSelectedMenuItem}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar elemento del menú" />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - ${item.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addMenuItem} disabled={!selectedMenuItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Total */}
          <div className="text-right">
            <div className="text-lg font-semibold">
              Total: ${editedOrder.total.toFixed(2)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}