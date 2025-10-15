import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Clock, Truck, DollarSign, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/lib/business-context';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: 'preparando' | 'entregando' | 'pagando';
  removed?: boolean;
  removalReason?: string;
}

interface Order {
  id: string;
  number: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'preparando' | 'entregando' | 'pagando' | 'cobrando';
  createdAt: Date;
  table?: string;
  paymentMethod?: 'efectivo' | 'tarjeta';
}

const menuItems = [
  { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas' },
  { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas' },
  { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas' },
  { id: '4', name: 'Ensalada César', price: 10.00, category: 'Ensaladas' },
];

export default function OrderManager() {
  const { toast } = useToast();
  const { selectedBusiness } = useBusiness();
  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      number: '#001',
      customerName: 'Juan Pérez',
      items: [
        { id: '1', name: 'Pizza Margherita', price: 15.00, quantity: 1, status: 'entregando' },
        { id: '2', name: 'Hamburguesa Clásica', price: 12.50, quantity: 1, status: 'preparando' }
      ],
      total: 27.50,
      status: 'preparando',
      createdAt: new Date(Date.now() - 300000),
      table: 'Mesa 5'
    },
    {
      id: '2',
      number: '#002',
      customerName: 'María García',
      items: [
        { id: '3', name: 'Pasta Carbonara', price: 14.00, quantity: 2, status: 'pagando' }
      ],
      total: 28.00,
      status: 'entregando',
      createdAt: new Date(Date.now() - 600000),
      table: 'Mesa 3'
    }
  ]);

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const statusConfig = {
    preparando: { label: 'Preparando', color: 'bg-warning/10 text-warning', icon: Clock },
    entregando: { label: 'Entregando', color: 'bg-info/10 text-info', icon: Truck },
    pagando: { label: 'Pagando', color: 'bg-success/10 text-success', icon: DollarSign },
    cobrando: { label: 'Cobrando', color: 'bg-primary/10 text-primary', icon: DollarSign },
  };

  const addItemToOrder = (menuItem: typeof menuItems[0]) => {
    const existingItem = selectedItems.find(item => item.id === menuItem.id && !item.removed);
    
    if (existingItem) {
      setSelectedItems(items => 
        items.map(item => 
          item.id === menuItem.id && !item.removed
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedItems(items => [...items, {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        status: 'preparando'
      }]);
    }
  };

  const removeItemFromOrder = (itemId: string, reason?: string) => {
    setSelectedItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, removed: true, removalReason: reason }
          : item
      )
    );
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromOrder(itemId);
      return;
    }
    
    setSelectedItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => 
      total + (item.removed ? 0 : item.price * item.quantity), 0);
  };

  const updateItemStatus = (orderId: string, itemId: string, newStatus: OrderItem['status']) => {
    setOrders(orders => 
      orders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item =>
            item.id === itemId ? { ...item, status: newStatus } : item
          );
          
          // Update order status based on item statuses
          const allPrepared = updatedItems.every(item => 
            item.removed || item.status === 'entregando' || item.status === 'pagando'
          );
          const allDelivered = updatedItems.every(item => 
            item.removed || item.status === 'pagando'
          );
          const allPaid = updatedItems.every(item => 
            item.removed || item.status === 'pagando'
          );
          
          let newOrderStatus = order.status;
          if (order.status === 'preparando' && allPrepared) {
            newOrderStatus = 'entregando';
          } else if (order.status === 'entregando' && allDelivered) {
            newOrderStatus = 'pagando';
          } else if (order.status === 'pagando' && allPaid) {
            newOrderStatus = 'cobrando';
          }
          
          return { ...order, items: updatedItems, status: newOrderStatus };
        }
        return order;
      })
    );
  };


  const editOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedItems([...order.items]);
      setSelectedTable(order.table || '');
      setCustomerName(order.customerName);
      setEditingOrderId(orderId);
      setIsNewOrderOpen(true);
    }
  };

  const createOrder = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Agrega al menos un producto a la orden",
        variant: "destructive"
      });
      return;
    }

    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del cliente es obligatorio",
        variant: "destructive"
      });
      return;
    }

    if (editingOrderId) {
      // Update existing order
      setOrders(orders => 
        orders.map(order => 
          order.id === editingOrderId 
            ? { 
                ...order, 
                customerName,
                items: [...selectedItems], 
                total: calculateTotal(),
                table: selectedTable || undefined
              }
            : order
        )
      );
      
      toast({
        title: "Orden actualizada",
        description: "La orden ha sido modificada exitosamente"
      });
    } else {
      // Create new order
      const newOrder: Order = {
        id: Date.now().toString(),
        number: `#${String(orders.length + 1).padStart(3, '0')}`,
        customerName,
        items: [...selectedItems],
        total: calculateTotal(),
        status: 'preparando',
        createdAt: new Date(),
        table: selectedTable || undefined
      };

      setOrders(orders => [newOrder, ...orders]);
      
      toast({
        title: "Orden creada",
        description: `Orden ${newOrder.number} creada exitosamente`
      });
    }

    setSelectedItems([]);
    setSelectedTable('');
    setCustomerName('');
    setEditingOrderId(null);
    setIsNewOrderOpen(false);
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(orders => 
      orders.map(order => 
        order.id === orderId ? { ...order, status } : order
      )
    );
    
    const order = orders.find(o => o.id === orderId);
    toast({
      title: "Estado actualizado",
      description: `Orden ${order?.number} marcada como ${statusConfig[status].label.toLowerCase()}`
    });
  };

  const getOrdersByStatus = (statuses: Order['status'][]) => {
    return orders.filter(order => statuses.includes(order.status));
  };

  const getCategories = () => {
    return ['all', ...new Set(menuItems.map(item => item.category))];
  };

  const getFilteredMenuItems = () => {
    if (selectedCategory === 'all') {
      return menuItems;
    }
    return menuItems.filter(item => item.category === selectedCategory);
  };

  const processPayment = (orderId: string, paymentMethod: 'efectivo' | 'tarjeta') => {
    setOrders(orders => 
      orders.map(order => 
        order.id === orderId 
          ? { ...order, status: 'cobrando', paymentMethod }
          : order
      )
    );
    
    const order = orders.find(o => o.id === orderId);
    toast({
      title: "Pago procesado",
      description: `Orden ${order?.number} pagada con ${paymentMethod}`
    });
  };

  const getOrderSummary = () => {
    const totalOrders = orders.length;
    const preparandoCount = orders.filter(o => o.status === 'preparando').length;
    const entregandoCount = orders.filter(o => o.status === 'entregando').length;
    const pagandoCount = orders.filter(o => o.status === 'pagando').length;
    const cobrandoCount = orders.filter(o => o.status === 'cobrando').length;
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    
    return {
      totalOrders,
      preparandoCount,
      entregandoCount,
      pagandoCount,
      cobrandoCount,
      totalRevenue
    };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const StatusIcon = statusConfig[order.status].icon;
    const preparandoCount = order.items.filter(item => !item.removed && item.status === 'preparando').length;
    const entregandoCount = order.items.filter(item => !item.removed && item.status === 'entregando').length;
    const pagandoCount = order.items.filter(item => !item.removed && item.status === 'pagando').length;
    const totalItems = order.items.filter(item => !item.removed).length;
    
    return (
      <div key={order.id} className="p-4 border border-border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{order.number}</div>
            <div className="text-sm text-muted-foreground">{order.customerName}</div>
            {order.table && <div className="text-sm text-muted-foreground">{order.table}</div>}
            <div className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig[order.status].color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig[order.status].label}
            </Badge>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => editOrder(order.id)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          {order.items.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {!item.removed && (
                  <Checkbox
                    checked={item.status === 'entregando' || item.status === 'pagando'}
                    onCheckedChange={(checked) => {
                      if (checked && item.status === 'preparando') {
                        updateItemStatus(order.id, item.id, 'entregando');
                      } else if (checked && item.status === 'entregando') {
                        updateItemStatus(order.id, item.id, 'pagando');
                      }
                    }}
                    className="h-4 w-4"
                  />
                )}
                <span className={item.removed ? 'line-through text-muted-foreground' : ''}>
                  {item.quantity}x {item.name}
                  {item.removed && item.removalReason && (
                    <span className="text-xs text-muted-foreground ml-2">({item.removalReason})</span>
                  )}
                </span>
              </div>
            </div>
          ))}
          
          <div className="text-xs text-muted-foreground">
            Preparando: {preparandoCount} | Entregando: {entregandoCount} | Pagando: {pagandoCount}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="font-semibold">Total: ${order.total.toFixed(2)}</span>
          <div className="flex gap-1">
            {order.status === 'pagando' && (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => processPayment(order.id, 'efectivo')}>
                  Efectivo
                </Button>
                <Button size="sm" onClick={() => processPayment(order.id, 'tarjeta')}>
                  Tarjeta
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Comandas</h1>
          <p className="text-muted-foreground">{selectedBusiness ? `Negocio: ${selectedBusiness.name}` : 'Selecciona un negocio'}</p>
        </div>
        
        <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrderId ? 'Editar Orden' : 'Crear Nueva Orden'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Menu Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Menú</h3>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategories().map(category => (
                        <SelectItem key={category} value={category}>
                          {category === 'all' ? 'Todas' : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getFilteredMenuItems().map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">${item.price.toFixed(2)} - {item.category}</div>
                      </div>
                      <Button size="sm" onClick={() => addItemToOrder(item)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Orden Actual</h3>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Mesa" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => (
                        <SelectItem key={i + 1} value={`Mesa ${i + 1}`}>
                          Mesa {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="customerName">Nombre del Cliente *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="mt-1"
                  />
                </div>
                
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {selectedItems.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-2 border border-border rounded ${item.removed ? 'opacity-50' : ''}`}>
                      <div className="flex-1">
                        <div className={`font-medium text-sm ${item.removed ? 'line-through' : ''}`}>
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cant: {item.quantity}
                          {item.removed && item.removalReason && (
                            <span className="ml-2">({item.removalReason})</span>
                          )}
                        </div>
                      </div>
                      {!item.removed && (
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              if (item.status === 'preparando') {
                                if (confirm('¿Estás seguro de que quieres quitar este producto?')) {
                                  removeItemFromOrder(item.id, 'Cancelado por cliente');
                                }
                              } else {
                                const reason = prompt('Motivo de la eliminación:');
                                if (reason) {
                                  removeItemFromOrder(item.id, reason);
                                }
                              }
                            }}
                            className="text-destructive"
                          >
                            ×
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between text-lg font-semibold mb-4">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createOrder} className="bg-gradient-primary hover:opacity-90 flex-1">
                      {editingOrderId ? 'Actualizar' : 'Crear'} Orden
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsNewOrderOpen(false);
                        setEditingOrderId(null);
                        setSelectedItems([]);
                        setSelectedTable('');
                        setCustomerName('');
                        setSelectedCategory('all');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders Tabs */}
      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="resumen">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="preparando">
            Preparando ({getOrdersByStatus(['preparando']).length})
          </TabsTrigger>
          <TabsTrigger value="entregando">
            Entregando ({getOrdersByStatus(['entregando']).length})
          </TabsTrigger>
          <TabsTrigger value="pagando">
            Pagando ({getOrdersByStatus(['pagando']).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumen de Comandas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-primary">{getOrderSummary().totalOrders}</div>
                  <div className="text-sm text-muted-foreground">Total Órdenes</div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-warning">{getOrderSummary().preparandoCount}</div>
                  <div className="text-sm text-muted-foreground">Preparando</div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-info">{getOrderSummary().entregandoCount}</div>
                  <div className="text-sm text-muted-foreground">Entregando</div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-2xl font-bold text-success">{getOrderSummary().pagandoCount}</div>
                  <div className="text-sm text-muted-foreground">Pagando</div>
                </div>
              </div>
              <div className="mt-6 p-4 border border-border rounded-lg">
                <div className="text-2xl font-bold text-primary">${getOrderSummary().totalRevenue.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Ingresos Totales</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preparando" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Preparando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {getOrdersByStatus(['preparando']).map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregando" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Entregando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {getOrdersByStatus(['entregando']).map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagando" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pagando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getOrdersByStatus(['pagando']).map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}