import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Clock, CheckCircle2, Edit2, DollarSign, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  prepared: boolean;
}

interface Order {
  id: string;
  number: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid';
  createdAt: Date;
  table?: string;
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
      items: [
        { id: '1', name: 'Pizza Margherita', price: 15.00, quantity: 1, prepared: true },
        { id: '2', name: 'Hamburguesa Clásica', price: 12.50, quantity: 1, prepared: false }
      ],
      total: 27.50,
      status: 'preparing',
      createdAt: new Date(Date.now() - 300000),
      table: 'Mesa 5'
    },
    {
      id: '2',
      number: '#002',
      items: [
        { id: '3', name: 'Pasta Carbonara', price: 14.00, quantity: 2, prepared: true }
      ],
      total: 28.00,
      status: 'ready',
      createdAt: new Date(Date.now() - 600000),
      table: 'Mesa 3'
    }
  ]);

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const statusConfig = {
    pending: { label: 'Por Preparar', color: 'bg-muted text-muted-foreground', icon: Clock },
    preparing: { label: 'En Preparación', color: 'bg-warning/10 text-warning', icon: Clock },
    ready: { label: 'Listo', color: 'bg-success/10 text-success', icon: CheckCircle2 },
    delivered: { label: 'Entregado', color: 'bg-info/10 text-info', icon: Truck },
    paid: { label: 'Pagado', color: 'bg-muted text-muted-foreground', icon: DollarSign },
  };

  const addItemToOrder = (menuItem: typeof menuItems[0]) => {
    const existingItem = selectedItems.find(item => item.id === menuItem.id);
    
    if (existingItem) {
      setSelectedItems(items => 
        items.map(item => 
          item.id === menuItem.id 
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
        prepared: false
      }]);
    }
  };

  const removeItemFromOrder = (itemId: string) => {
    setSelectedItems(items => items.filter(item => item.id !== itemId));
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
    return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const toggleItemPrepared = (orderId: string, itemId: string) => {
    setOrders(orders => 
      orders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item =>
            item.id === itemId ? { ...item, prepared: !item.prepared } : item
          );
          
          // Auto-advance order status based on item completion
          let newStatus = order.status;
          const allPrepared = updatedItems.every(item => item.prepared);
          
          if (order.status === 'pending' && updatedItems.some(item => item.prepared)) {
            newStatus = 'preparing';
          } else if (order.status === 'preparing' && allPrepared) {
            newStatus = 'ready';
          }
          
          return { ...order, items: updatedItems, status: newStatus };
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

    if (editingOrderId) {
      // Update existing order
      setOrders(orders => 
        orders.map(order => 
          order.id === editingOrderId 
            ? { 
                ...order, 
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
        items: [...selectedItems],
        total: calculateTotal(),
        status: 'pending',
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const StatusIcon = statusConfig[order.status].icon;
    const preparedCount = order.items.filter(item => item.prepared).length;
    const totalItems = order.items.length;
    
    return (
      <div key={order.id} className="p-4 border border-border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{order.number}</div>
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
                <Checkbox
                  checked={item.prepared}
                  onCheckedChange={() => toggleItemPrepared(order.id, item.id)}
                  className="h-4 w-4"
                />
                <span className={item.prepared ? 'line-through text-muted-foreground' : ''}>
                  {item.quantity}x {item.name}
                </span>
              </div>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          
          {order.status === 'preparing' && (
            <div className="text-xs text-muted-foreground">
              Preparados: {preparedCount}/{totalItems}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="font-semibold">Total: ${order.total.toFixed(2)}</span>
          <div className="flex gap-1">
            {order.status === 'ready' && (
              <Button size="sm" onClick={() => updateOrderStatus(order.id, 'delivered')}>
                Entregar
              </Button>
            )}
            {order.status === 'delivered' && (
              <Button size="sm" onClick={() => updateOrderStatus(order.id, 'paid')}>
                Pagar
              </Button>
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
                <h3 className="text-lg font-semibold mb-4">Menú</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {menuItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">${item.price.toFixed(2)}</div>
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
                
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {selectedItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 border border-border rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</div>
                      </div>
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
                          onClick={() => removeItemFromOrder(item.id)}
                          className="text-destructive"
                        >
                          ×
                        </Button>
                      </div>
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
            Resumen ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="preparacion">
            En Preparación ({getOrdersByStatus(['pending', 'preparing']).length})
          </TabsTrigger>
          <TabsTrigger value="listo">
            Listo ({getOrdersByStatus(['ready']).length})
          </TabsTrigger>
          <TabsTrigger value="entregado">
            Entregado ({getOrdersByStatus(['delivered', 'paid']).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Todas las Órdenes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preparacion" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                En Preparación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {getOrdersByStatus(['pending', 'preparing']).map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Listos para Entregar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {getOrdersByStatus(['ready']).map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregado" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Entregados y Pagados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getOrdersByStatus(['delivered', 'paid']).map(order => (
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