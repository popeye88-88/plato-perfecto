import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, X } from 'lucide-react';

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateOrder: (orderData: {
    items: Array<{menuItem: any, quantity: number, customIngredients?: string[]}>;
    serviceType: 'puesto' | 'takeaway' | 'delivery';
    diners: number;
    customerName: string;
    deliveryCharge: number;
  }) => void;
}

const menuItems = [
  { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas' },
  { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas' },
  { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas' },
  { id: '4', name: 'Ensalada César', price: 10.00, category: 'Ensaladas' },
];

export default function NewOrderDialog({ open, onOpenChange, onCreateOrder }: NewOrderDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [serviceType, setServiceType] = useState<'puesto' | 'takeaway' | 'delivery'>('puesto');
  const [diners, setDiners] = useState(1);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Array<{menuItem: any, quantity: number, customIngredients?: string[]}>>([]);

  const addItem = (menuItem: any) => {
    const existingItem = selectedItems.find(item => item.menuItem.id === menuItem.id);
    if (existingItem) {
      setSelectedItems(prev => 
        prev.map(item => 
          item.menuItem.id === menuItem.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
        )
      );
    } else {
      setSelectedItems(prev => [...prev, { menuItem, quantity: 1, customIngredients: [] }]);
    }
  };

  const removeItem = (menuItemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.menuItem.id !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setSelectedItems(prev => 
      prev.map(item =>
        item.menuItem.id === menuItemId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const calculateTotal = () => {
    const itemsTotal = selectedItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    return itemsTotal + deliveryCharge;
  };

  const handleSubmit = () => {
    if (!customerName.trim()) {
      return;
    }

    onCreateOrder({
      items: selectedItems,
      serviceType,
      diners,
      customerName: customerName.trim(),
      deliveryCharge
    });

    // Reset form
    setCustomerName('');
    setServiceType('puesto');
    setDiners(1);
    setDeliveryCharge(0);
    setSelectedItems([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Orden</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customerName">Nombre del Cliente</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ingresa el nombre"
              />
            </div>
            <div>
              <Label htmlFor="serviceType">Tipo de Servicio</Label>
              <Select value={serviceType} onValueChange={(value: any) => setServiceType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="puesto">En Puesto</SelectItem>
                  <SelectItem value="takeaway">Take Away</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="diners">Comensales</Label>
              <Input 
                id="diners"
                type="number"
                min="1"
                value={diners}
                onChange={(e) => setDiners(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Delivery Charge */}
          {serviceType === 'delivery' && (
            <div>
              <Label htmlFor="deliveryCharge">Cargo por Entrega</Label>
              <Input
                id="deliveryCharge"
                type="number"
                min="0"
                step="0.01"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Menu Items */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Productos del Menú</h3>
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

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Productos Seleccionados</h3>
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.menuItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.menuItem.name}</p>
                      <p className="text-sm text-muted-foreground">${item.menuItem.price.toFixed(2)} c/u</p>
                      </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                        variant="destructive"
                        onClick={() => removeItem(item.menuItem.id)}
                      >
                        <X className="h-4 w-4" />
                            </Button>
                          </div>
                    <div className="ml-4 font-semibold">
                      ${(item.menuItem.price * item.quantity).toFixed(2)}
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
              onClick={handleSubmit}
              className="bg-gradient-primary hover:opacity-90"
              disabled={!customerName.trim() || selectedItems.length === 0}
            >
              Crear Orden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}