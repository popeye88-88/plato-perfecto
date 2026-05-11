import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, X, ChevronDown } from 'lucide-react';
import { getMenuItemCardStyle, type ColorStyle } from '@/lib/menuItemColor';

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
  menuItems: MenuItem[];
  onSave: (updatedOrder: Order) => void;
}

export default function EditOrderDialog({ open, onOpenChange, order, menuItems, onSave }: EditOrderDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [sizePickerOpen, setSizePickerOpen] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => setExpandedItems(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  React.useEffect(() => {
    if (order) {
      setCustomerName(order.customerName);
      setItems([...order.items]);
    }
  }, [order]);

  const addItem = (menuItem: MenuItem, size?: { id: string; name: string; price: number }) => {
    const itemId = size ? `${menuItem.id}-size-${size.id}` : menuItem.id;
    const itemName = size ? `${menuItem.name} — ${size.name}` : menuItem.name;
    const itemPrice = size ? size.price : menuItem.price;

    const newItem: OrderItem = {
      id: Date.now().toString() + '-' + itemId,
      name: itemName,
      price: itemPrice,
      quantity: 1,
      status: 'preparando',
      cancelled: false
    };
    setItems(prev => [...prev, newItem]);
    setSizePickerOpen(null);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(itemId); return; }
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity } : item));
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSave = () => {
    if (!order || !customerName.trim()) return;
    const updatedOrder: Order = { ...order, customerName: customerName.trim(), items, total: calculateTotal(), edited: true };
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
          <div>
            <Label htmlFor="customerName">Nombre del Cliente</Label>
            <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ingresa el nombre" />
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Agregar Productos</h3>
            {(() => {
              const groups: Record<string, MenuItem[]> = {};
              const categories: string[] = [];
              menuItems.forEach(item => {
                if (!groups[item.category]) {
                  groups[item.category] = [];
                  categories.push(item.category);
                }
                groups[item.category].push(item);
              });
              categories.forEach(cat => {
                groups[cat].sort((a, b) => {
                  const priceA = a.hasSizes && a.sizes?.length ? Math.min(...a.sizes.map(s => s.price)) : a.price;
                  const priceB = b.hasSizes && b.sizes?.length ? Math.min(...b.sizes.map(s => s.price)) : b.price;
                  return priceA - priceB;
                });
              });
              return categories.map(category => (
                <div key={category} className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide border-b border-border pb-1">{category}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {groups[category].map((item) => {
                      const hasSizes = item.hasSizes && item.sizes && item.sizes.length >= 2;
                      const cardStyle = getMenuItemCardStyle(item.color, item.colorStyle);

                      if (hasSizes) {
                        const isExpanded = expandedItems.has(item.id);
                        return (
                          <div key={item.id} className="col-span-3 border rounded-lg overflow-hidden" style={cardStyle}>
                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.id)}
                              className="w-full p-3 flex justify-between items-center hover:bg-black/5 transition-colors"
                            >
                              <h4 className="font-semibold text-sm flex-1 text-center">{item.name}</h4>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            {isExpanded && (
                              <div className="grid grid-cols-3 gap-2 border-t bg-background/60 p-2">
                                {item.sizes!.map(size => (
                                  <button
                                    key={size.id}
                                    type="button"
                                    onClick={() => addItem(item, size)}
                                    className="border rounded-md p-2 flex flex-col items-center justify-center text-center bg-card hover:bg-muted/50 transition-colors min-h-[64px]"
                                  >
                                    <span className="text-xs font-medium">{size.name}</span>
                                    <span className="text-xs text-primary mt-1">${size.price.toFixed(2)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addItem(item)}
                          className="border rounded-lg p-2 flex flex-col items-center justify-center text-center hover:opacity-90 transition-opacity min-h-[80px]"
                          style={cardStyle}
                        >
                          <h4 className="font-semibold text-sm leading-tight text-foreground text-center break-words">{item.name}</h4>
                          <p className="text-xs font-semibold text-primary mt-1">${item.price.toFixed(2)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>

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
                      <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => removeItem(item.id)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="ml-4 font-semibold">${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90" disabled={!customerName.trim() || items.length === 0}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
