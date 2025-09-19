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
import { Plus, Clock, Truck, DollarSign, Edit2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: 'preparando' | 'entregando' | 'cobrando';
  removed?: boolean;
  removalReason?: string;
}

interface Order {
  id: string;
  number: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'preparando' | 'entregando' | 'cobrando' | 'pagado';
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
        { id: '3', name: 'Pasta Carbonara', price: 14.00, quantity: 2, status: 'cobrando' }
      ],
      total: 28.00,
      status: 'cobrando',
      createdAt: new Date(Date.now() - 600000),
      table: 'Mesa 3'
    },
    {
      id: '3',
      number: '#003',
      customerName: 'Carlos López',
      items: [
        { id: '4', name: 'Ensalada César', price: 10.00, quantity: 1, status: 'cobrando' }
      ],
      total: 10.00,
      status: 'pagado',
      createdAt: new Date(Date.now() - 86400000),
      table: 'Mesa 1',
      paymentMethod: 'efectivo'
    }
  ]);

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const statusConfig = {
    preparando: { label: 'Preparando', color: 'bg-warning/10 text-warning', icon: Clock },
    entregando: { label: 'Entregando', color: 'bg-info/10 text-info', icon: Truck },
    cobrando: { label: 'Cobrando', color: 'bg-success/10 text-success', icon: DollarSign },
    pagado: { label: 'Pagado', color: 'bg-primary/10 text-primary', icon: DollarSign },
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
          
          // Determine order status based on lowest item status
          const getLowestStatus = (items: OrderItem[]): Order['status'] => {
            const activeItems = items.filter(item => !item.removed);
            if (activeItems.length === 0) return 'pagado';
            
            const hasPreparando = activeItems.some(item => item.status === 'preparando');
            const hasEntregando = activeItems.some(item => item.status === 'entregando');
            const hasCobrando = activeItems.some(item => item.status === 'cobrando');
            
            if (hasPreparando) return 'preparando';
            if (hasEntregando) return 'entregando';
            if (hasCobrando) return 'cobrando';
            return 'pagado';
          };
          
          const newOrderStatus = getLowestStatus(updatedItems);
          
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

  const processPayment = (orderId: string, paymentMethod: 'efectivo' | 'tarjeta') => {
    setOrders(orders => 
      orders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status: 'pagado', 
              paymentMethod,
              items: order.items.map(item => ({ ...item, status: 'cobrando' as const }))
            }
          : order
      )
    );
    
    const order = orders.find(o => o.id === orderId);
    toast({
      title: "Pago procesado",
      description: `Orden ${order?.number} pagada con ${paymentMethod}`
    });
    setPaymentDialog(null);
  };

  const getOrderSummary = () => {
    const totalOrders = orders.length;
    const preparandoCount = getOrdersForTab('preparando').length;
    const entregandoCount = getOrdersForTab('entregando').length;
    const cobrandoCount = orders.filter(o => o.status === 'cobrando').length;
    const pagadoCount = getFilteredPaidOrders().length;
    
    return {
      totalOrders,
      preparandoCount,
      entregandoCount,
      cobrandoCount,
      pagadoCount
    };
  };
  
  const getOrdersForTab = (tab: 'preparando' | 'entregando') => {
    return orders.filter(order => {
      const activeItems = order.items.filter(item => !item.removed);
      if (tab === 'preparando') {
        return activeItems.some(item => item.status === 'preparando');
      }
      if (tab === 'entregando') {
        return activeItems.some(item => item.status === 'entregando');
      }
      return false;
    });
  };
  
  const getFilteredPaidOrders = () => {
    const startDate = new Date(dateFilter.start);
    const endDate = new Date(dateFilter.end);
    endDate.setHours(23, 59, 59, 999);
    
    return orders.filter(order => 
      order.status === 'pagado' && 
      order.createdAt >= startDate && 
      order.createdAt <= endDate
    );
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const OrderCard = ({ order, currentTab }: { order: Order; currentTab: string }) => {
    const StatusIcon = statusConfig[order.status].icon;
    const preparandoCount = order.items.filter(item => !item.removed && item.status === 'preparando').length;
    const entregandoCount = order.items.filter(item => !item.removed && item.status === 'entregando').length;
    const cobrandoCount = order.items.filter(item => !item.removed && item.status === 'cobrando').length;
    
    return (
      <div key={order.id} className="p-4 border border-border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{order.number}</div>
            <div className="text-sm text-muted-foreground">{order.customerName}</div>
            {order.table && <div className="text-sm text-muted-foreground">{order.table}</div>}
            <div className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig[order.status].color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig[order.status].label}
            </Badge>
            {order.status !== 'pagado' && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => editOrder(order.id)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          {order.items.map(item => {
            const isEnabled = currentTab === 'preparando' 
              ? item.status === 'preparando'
              : currentTab === 'entregando' 
                ? item.status === 'entregando'
                : true;
            
            const isDisabled = currentTab === 'entregando' && item.status === 'preparando';
            
            return (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${isDisabled ? 'text-muted-foreground' : ''}`}>
                  <span className={item.removed ? 'line-through text-muted-foreground' : ''}>
                    {item.quantity}x {item.name}
                    {item.removed && item.removalReason && (
                      <span className="text-xs text-muted-foreground ml-2">({item.removalReason})</span>
                    )}
                  </span>
                  {currentTab !== 'resumen' && currentTab !== 'cobrando' && currentTab !== 'pagado' && (
                    <Badge variant="secondary" className="text-xs">
                      {statusConfig[item.status].label}
                    </Badge>
                  )}
                </div>
                {!item.removed && (currentTab === 'preparando' || currentTab === 'entregando') && (
                  <Checkbox
                    checked={
                      (currentTab === 'preparando' && item.status !== 'preparando') ||
                      (currentTab === 'entregando' && item.status === 'cobrando')
                    }
                    disabled={isDisabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        if (currentTab === 'preparando' && item.status === 'preparando') {
                          updateItemStatus(order.id, item.id, 'entregando');
                        } else if (currentTab === 'entregando' && item.status === 'entregando') {
                          updateItemStatus(order.id, item.id, 'cobrando');
                        }
                      }
                    }}
                    className="h-4 w-4"
                  />
                )}
              </div>
            );
          })}
          
          {currentTab === 'resumen' && (
            <div className="text-xs text-muted-foreground">
              Preparando: {preparandoCount} | Entregando: {entregandoCount} | Cobrando: {cobrandoCount}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="font-semibold">Total: ${order.total.toFixed(2)}</span>
          <div className="flex gap-1">
            {order.status === 'cobrando' && currentTab === 'cobrando' && (
              <Button size="sm" onClick={() => setPaymentDialog(order.id)}>
                Cobrar
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const summary = getOrderSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Gestión de Comandas</h1>
          <p className="text-muted-foreground">Administra las órdenes de tu restaurante</p>
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
                    <div key={item.id} className="flex items-center justify-between p-2 border border-border rounded">
                      <div className={item.removed ? 'line-through text-muted-foreground' : ''}>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
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
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Select onValueChange={(reason) => removeItemFromOrder(item.id, reason)}>
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sin_stock">Sin stock</SelectItem>
                              <SelectItem value="cliente_cambio">Cliente cambió de opinión</SelectItem>
                              <SelectItem value="error_orden">Error en la orden</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="p-3 border border-border rounded-lg mb-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
                
                <Button onClick={createOrder} className="w-full">
                  {editingOrderId ? 'Actualizar Orden' : 'Crear Orden'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Tabs defaultValue="resumen" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="resumen">
              Resumen ({summary.totalOrders})
            </TabsTrigger>
            <TabsTrigger value="preparando">
              Preparando ({summary.preparandoCount})
            </TabsTrigger>
            <TabsTrigger value="entregando">
              Entregando ({summary.entregandoCount})
            </TabsTrigger>
            <TabsTrigger value="cobrando">
              Cobrando ({summary.cobrandoCount})
            </TabsTrigger>
            <TabsTrigger value="pagado">
              Pagado ({summary.pagadoCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
                  <div className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalOrders}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En Preparación</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{summary.preparandoCount}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Para Entregar</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-info">{summary.entregandoCount}</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Todas las Comandas</h3>
              <div className="grid gap-4">
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} currentTab="resumen" />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preparando" className="space-y-4">
            <div className="grid gap-4">
              {getOrdersForTab('preparando').map(order => (
                <OrderCard key={order.id} order={order} currentTab="preparando" />
              ))}
              {getOrdersForTab('preparando').length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay órdenes en preparación
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="entregando" className="space-y-4">
            <div className="grid gap-4">
              {getOrdersForTab('entregando').map(order => (
                <OrderCard key={order.id} order={order} currentTab="entregando" />
              ))}
              {getOrdersForTab('entregando').length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay órdenes para entregar
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cobrando" className="space-y-4">
            <div className="grid gap-4">
              {orders.filter(o => o.status === 'cobrando').map(order => (
                <OrderCard key={order.id} order={order} currentTab="cobrando" />
              ))}
              {orders.filter(o => o.status === 'cobrando').length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay órdenes para cobrar
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pagado" className="space-y-4">
            <div className="flex gap-4 items-end mb-4">
              <div className="flex-1">
                <Label htmlFor="startDate">Fecha Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate">Fecha Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="grid gap-4">
              {getFilteredPaidOrders().map(order => (
                <OrderCard key={order.id} order={order} currentTab="pagado" />
              ))}
              {getFilteredPaidOrders().length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay órdenes pagadas en el rango seleccionado
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={() => setPaymentDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Cómo se va a realizar el pago?</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 justify-center pt-4">
            <Button 
              onClick={() => paymentDialog && processPayment(paymentDialog, 'efectivo')}
              className="flex-1"
            >
              Efectivo
            </Button>
            <Button 
              onClick={() => paymentDialog && processPayment(paymentDialog, 'tarjeta')}
              className="flex-1"
            >
              Tarjeta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}