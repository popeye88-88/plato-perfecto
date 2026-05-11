import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, ChevronDown } from 'lucide-react';
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

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItems: MenuItem[];
  onCreateOrder: (orderData: {
    items: Array<{menuItem: any, quantity: number, customIngredients?: string[]}>;
    serviceType: 'puesto' | 'takeaway' | 'delivery';
    diners: number;
    customerName: string;
    deliveryCharge: number;
  }) => void;
}

export default function NewOrderDialog({ open, onOpenChange, menuItems, onCreateOrder }: NewOrderDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [serviceType, setServiceType] = useState<'puesto' | 'takeaway' | 'delivery'>('puesto');
  const [diners, setDiners] = useState(1);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Array<{menuItem: {id: string; name: string; price: number; category: string}, quantity: number, customIngredients?: string[]}>>([]);
  const [sizePickerOpen, setSizePickerOpen] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => setExpandedItems(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const addItem = (menuItem: MenuItem, size?: { id: string; name: string; price: number }) => {
    const itemId = size ? `${menuItem.id}-size-${size.id}` : menuItem.id;
    const itemName = size ? `${menuItem.name} — ${size.name}` : menuItem.name;
    const itemPrice = size ? size.price : menuItem.price;
    const virtualItem = { id: itemId, name: itemName, price: itemPrice, category: menuItem.category };

    const existingItem = selectedItems.find(item => item.menuItem.id === itemId);
    if (existingItem) {
      setSelectedItems(prev =>
        prev.map(item =>
          item.menuItem.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setSelectedItems(prev => [...prev, { menuItem: virtualItem, quantity: 1, customIngredients: [] }]);
    }
    setSizePickerOpen(null);
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
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      )
    );
  };

  const calculateTotal = () => {
    const itemsTotal = selectedItems.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    return itemsTotal + deliveryCharge;
  };

  const handleSubmit = () => {
    if (!customerName.trim()) return;
    onCreateOrder({ items: selectedItems, serviceType, diners, customerName: customerName.trim(), deliveryCharge });
    setCustomerName('');
    setServiceType('puesto');
    setDiners(1);
    setDeliveryCharge(0);
    setSelectedItems([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-[95vw] md:w-full">
        <DialogHeader>
          <DialogTitle>Nueva Orden</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <Label htmlFor="customerName">Nombre del Cliente</Label>
              <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ingresa el nombre" />
            </div>
            <div>
              <Label htmlFor="serviceType">Tipo de Servicio</Label>
              <Select value={serviceType} onValueChange={(value: any) => setServiceType(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="puesto">En Puesto</SelectItem>
                  <SelectItem value="takeaway">Take Away</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="diners">Comensales</Label>
              <Input id="diners" type="number" min="1" value={diners} onChange={(e) => setDiners(parseInt(e.target.value) || 1)} />
            </div>
          </div>

          {serviceType === 'delivery' && (
            <div>
              <Label htmlFor="deliveryCharge">Cargo por Entrega</Label>
              <Input id="deliveryCharge" type="number" min="0" step="0.01" value={deliveryCharge} onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)} />
            </div>
          )}

          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Seleccionar Productos</h3>
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
                  <div className="space-y-2">
                    {groups[category].map((item) => {
                      const hasSizes = item.hasSizes && item.sizes && item.sizes.length >= 2;

                      if (hasSizes) {
                        const sizeItems = item.sizes!;
                        const isExpanded = expandedItems.has(item.id);
                        const totalQty = sizeItems.reduce((sum, s) => {
                          const sel = selectedItems.find(x => x.menuItem.id === `${item.id}-size-${s.id}`);
                          return sum + (sel?.quantity || 0);
                        }, 0);
                        return (
                          <div key={item.id} className="border rounded-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.id)}
                              className="w-full p-4 flex justify-between items-center hover:bg-muted/50 transition-colors text-left"
                            >
                              <div>
                                <h4 className="font-medium text-base">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.category}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {totalQty > 0 && (
                                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{totalQty}</span>
                                )}
                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="space-y-1 border-t px-4 py-2">
                                {sizeItems.map(size => {
                                  const sizeId = `${item.id}-size-${size.id}`;
                                  const sel = selectedItems.find(s => s.menuItem.id === sizeId);
                                  const qty = sel?.quantity || 0;
                                  return (
                                    <div key={size.id} className="flex items-center justify-between py-1">
                                      <div>
                                        <span className="text-sm">{size.name}</span>
                                        <span className="text-sm text-primary ml-2">${size.price.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {qty > 0 && (
                                          <>
                                            <Button size="sm" variant="outline" onClick={() => updateQuantity(sizeId, qty - 1)} className="h-7 w-7 p-0"><Minus className="h-3 w-3" /></Button>
                                            <span className="w-6 text-center text-sm">{qty}</span>
                                          </>
                                        )}
                                        <Button size="sm" onClick={() => addItem(item, size)} className="bg-gradient-primary hover:opacity-90 h-7 w-7 p-0"><Plus className="h-3 w-3" /></Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const selectedItem = selectedItems.find(selected => selected.menuItem.id === item.id);
                      const quantity = selectedItem ? selectedItem.quantity : 0;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addItem(item)}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-base">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.category}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-primary text-lg">${item.price.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 ml-4" onClick={(e) => e.stopPropagation()}>
                            {quantity > 0 && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, quantity - 1)} className="h-8 w-8 p-0"><Minus className="h-4 w-4" /></Button>
                                <span className="w-8 text-center font-medium text-lg">{quantity}</span>
                              </>
                            )}
                            <span className="bg-gradient-primary text-primary-foreground rounded-md h-8 w-8 inline-flex items-center justify-center">
                              <Plus className="h-4 w-4" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>

          {selectedItems.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span className="text-primary">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-gradient-primary hover:opacity-90" disabled={!customerName.trim() || selectedItems.length === 0}>
              Crear Orden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
