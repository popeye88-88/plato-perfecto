import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Clock, Truck, DollarSign, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PaymentDialog from './PaymentDialog';
import NewOrderDialog from './NewOrderDialog';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: 'preparando' | 'preparado' | 'entregando' | 'entregado' | 'cobrando';
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
  paymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia';
  serviceType?: 'puesto' | 'takeaway' | 'delivery';
  deliveryCharge?: number;
  diners?: number;
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
        { id: '1', name: 'Pizza Margherita', price: 15.00, quantity: 1, status: 'preparado' },
        { id: '2', name: 'Hamburguesa Clásica', price: 12.50, quantity: 1, status: 'preparando' }
      ],
      total: 27.50,
      status: 'preparando',
      createdAt: new Date(Date.now() - 300000),
      serviceType: 'puesto',
      diners: 2
    },
    {
      id: '2',
      number: '#002',
      customerName: 'María García',
      items: [
        { id: '3', name: 'Pasta Carbonara', price: 14.00, quantity: 2, status: 'entregado' }
      ],
      total: 28.00,
      status: 'cobrando',
      createdAt: new Date(Date.now() - 600000),
      serviceType: 'takeaway',
      diners: 1
    },
    {
      id: '3',
      number: '#003',
      customerName: 'Carlos López',
      items: [
        { id: '4', name: 'Ensalada César', price: 10.00, quantity: 1, status: 'entregado' }
      ],
      total: 70.00,
      status: 'pagado',
      createdAt: new Date(Date.now() - 86400000),
      paymentMethod: 'efectivo',
      serviceType: 'delivery',
      diners: 2,
      deliveryCharge: 60
    }
  ]);

  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const statusConfig = {
    preparando: { label: 'Preparando', color: 'bg-warning/10 text-warning', icon: Clock },
    preparado: { label: 'Preparado', color: 'bg-info/10 text-info', icon: Clock },
    entregando: { label: 'Entregando', color: 'bg-info/10 text-info', icon: Truck },
    entregado: { label: 'Entregado', color: 'bg-success/10 text-success', icon: Truck },
    cobrando: { label: 'Cobrando', color: 'bg-success/10 text-success', icon: DollarSign },
    pagado: { label: 'Pagado', color: 'bg-primary/10 text-primary', icon: DollarSign },
  };

  const handleNewOrder = (orderData: {
    items: Array<{menuItem: any, quantity: number}>;
    serviceType: 'puesto' | 'takeaway' | 'delivery';
    diners: number;
    deliveryCharge: number;
  }) => {
    const newOrder: Order = {
      id: Date.now().toString(),
      number: `#${String(orders.length + 1).padStart(3, '0')}`,
      customerName: 'Cliente',
      items: orderData.items.map(item => ({
        id: item.menuItem.id,
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity,
        status: 'preparando' as const
      })),
      total: orderData.items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0) + orderData.deliveryCharge,
      status: 'preparando',
      createdAt: new Date(),
      serviceType: orderData.serviceType,
      diners: orderData.diners,
      deliveryCharge: orderData.deliveryCharge
    };

    setOrders(orders => [newOrder, ...orders]);
    
    toast({
      title: "Orden creada",
      description: `Orden ${newOrder.number} creada exitosamente`
    });
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
            const hasPreparado = activeItems.some(item => item.status === 'preparado');
            const hasEntregando = activeItems.some(item => item.status === 'entregando');
            const hasEntregado = activeItems.some(item => item.status === 'entregado');
            const hasCobrando = activeItems.some(item => item.status === 'cobrando');
            
            if (hasPreparando) return 'preparando';
            if (hasPreparado || hasEntregando) return 'entregando';
            if (hasEntregado) return 'cobrando';
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


  const processPayment = (orderId: string, paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia', removeDeliveryCharge: boolean = false) => {
    setOrders(orders => 
      orders.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status: 'pagado', 
              paymentMethod,
              deliveryCharge: removeDeliveryCharge ? 0 : order.deliveryCharge,
              total: removeDeliveryCharge && order.deliveryCharge 
                ? order.total - order.deliveryCharge 
                : order.total,
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
        return activeItems.some(item => item.status === 'preparado' || item.status === 'entregando');
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
    const entregandoCount = order.items.filter(item => !item.removed && (item.status === 'preparado' || item.status === 'entregando')).length;
    const cobrandoCount = order.items.filter(item => !item.removed && (item.status === 'entregado' || item.status === 'cobrando')).length;
    
    return (
      <div key={order.id} className="p-4 border border-border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{order.number}</div>
            <div className="text-sm text-muted-foreground">{order.customerName}</div>
            {order.serviceType && (
              <div className="text-xs text-muted-foreground">
                {order.serviceType === 'puesto' ? 'En Puesto' : 
                 order.serviceType === 'takeaway' ? 'Take Away' : 'Delivery'}
                {order.diners && ` • ${order.diners} comensales`}
              </div>
            )}
            {order.paymentMethod && currentTab === 'pagado' && (
              <div className="text-xs text-muted-foreground">
                Pago: {order.paymentMethod === 'efectivo' ? 'Efectivo' : 
                       order.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
              </div>
            )}
            <div className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig[order.status].color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig[order.status].label}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          {order.items.map(item => {
            const isPreparandoTab = currentTab === 'preparando';
            const isEntregandoTab = currentTab === 'entregando';
            const isCobrandoTab = currentTab === 'cobrando';
            
            // Always show all items, but determine if they should be enabled/disabled
            let isEnabled = true;
            let showCheckbox = false;
            let isChecked = false;
            
            if (isPreparandoTab) {
              // In preparando tab, only enable items that are currently preparando
              isEnabled = item.status === 'preparando' && !item.removed;
              showCheckbox = !item.removed;
              isChecked = item.status !== 'preparando'; // Check if item has moved past preparando
            } else if (isEntregandoTab) {
              // In entregando tab, only enable items that are preparado or entregando
              isEnabled = (item.status === 'preparado' || item.status === 'entregando') && !item.removed;
              showCheckbox = !item.removed;
              isChecked = item.status === 'entregado'; // Check if item has been delivered
            } else if (isCobrandoTab) {
              // In cobrando tab, show all items but don't allow interaction
              isEnabled = false;
              showCheckbox = false;
            }
            
            return (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className={`flex items-center gap-2 ${!isEnabled ? 'text-muted-foreground opacity-50' : ''}`}>
                  <span className={item.removed ? 'line-through text-muted-foreground' : ''}>
                    {item.quantity}x {item.name}
                    {item.removed && item.removalReason && (
                      <span className="text-xs text-muted-foreground ml-2">({item.removalReason})</span>
                    )}
                  </span>
                  {(currentTab !== 'resumen' && currentTab !== 'pagado') && (
                    <Badge variant="secondary" className="text-xs">
                      {statusConfig[item.status].label}
                    </Badge>
                  )}
                </div>
                {showCheckbox && (
                  <Checkbox
                    checked={isChecked}
                    disabled={!isEnabled}
                    onCheckedChange={(checked) => {
                      if (checked && isEnabled) {
                        if (isPreparandoTab && item.status === 'preparando') {
                          updateItemStatus(order.id, item.id, 'preparado');
                        } else if (isEntregandoTab) {
                          if (item.status === 'preparado') {
                            updateItemStatus(order.id, item.id, 'entregando');
                          } else if (item.status === 'entregando') {
                            updateItemStatus(order.id, item.id, 'entregado');
                          }
                        }
                      }
                    }}
                    className="h-4 w-4 ml-auto"
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
          <div>
            <span className="font-semibold">Total: ${order.total.toFixed(2)}</span>
            {order.deliveryCharge && order.deliveryCharge > 0 && (
              <div className="text-xs text-muted-foreground">
                (Inc. entrega: ${order.deliveryCharge.toFixed(2)})
              </div>
            )}
          </div>
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Gestión de Comandas</h1>
          <p className="text-muted-foreground">Administra las órdenes de tu restaurante</p>
        </div>
        
        <Button 
          onClick={() => setIsNewOrderOpen(true)}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Nueva Orden</span>
          <span className="sm:hidden">Nueva</span>
        </Button>
      </div>

      <div>
        <Tabs defaultValue="resumen" className="w-full">
          <TabsList className="grid w-full grid-cols-5 text-xs sm:text-sm">
            <TabsTrigger value="resumen" className="px-2">
              <span className="hidden sm:inline">Resumen</span>
              <span className="sm:hidden">Res</span>
              <span className="ml-1">({orders.filter(o => ['preparando', 'entregando', 'cobrando'].includes(o.status)).length})</span>
            </TabsTrigger>
            <TabsTrigger value="preparando" className="px-2">
              <span className="hidden sm:inline">Preparando</span>
              <span className="sm:hidden">Prep</span>
              <span className="ml-1">({summary.preparandoCount})</span>
            </TabsTrigger>
            <TabsTrigger value="entregando" className="px-2">
              <span className="hidden sm:inline">Entregando</span>
              <span className="sm:hidden">Entr</span>
              <span className="ml-1">({summary.entregandoCount})</span>
            </TabsTrigger>
            <TabsTrigger value="cobrando" className="px-2">
              <span className="hidden sm:inline">Cobrando</span>
              <span className="sm:hidden">Cobr</span>
              <span className="ml-1">({summary.cobrandoCount})</span>
            </TabsTrigger>
            <TabsTrigger value="pagado" className="px-2">
              <span className="hidden sm:inline">Pagado</span>
              <span className="sm:hidden">Pag</span>
              <span className="ml-1">({summary.pagadoCount})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Preparando</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{summary.preparandoCount}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Entregando</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-info">{summary.entregandoCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cobrando</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{summary.cobrandoCount}</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Órdenes Activas</h3>
              <div className="grid gap-4">
                {orders.filter(order => ['preparando', 'entregando', 'cobrando'].includes(order.status)).map(order => (
                  <OrderCard key={order.id} order={order} currentTab="resumen" />
                ))}
                {orders.filter(order => ['preparando', 'entregando', 'cobrando'].includes(order.status)).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No hay órdenes activas
                  </div>
                )}
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

      <NewOrderDialog
        open={isNewOrderOpen}
        onOpenChange={setIsNewOrderOpen}
        onCreateOrder={handleNewOrder}
      />

      {/* Payment Dialog */}
      {paymentDialog && (
        <PaymentDialog
          open={!!paymentDialog}
          onOpenChange={() => setPaymentDialog(null)}
          onConfirmPayment={(paymentMethod, removeDeliveryCharge) => {
            if (paymentDialog) {
              processPayment(paymentDialog, paymentMethod, removeDeliveryCharge);
            }
          }}
          hasDeliveryCharge={
            paymentDialog ? (orders.find(o => o.id === paymentDialog)?.deliveryCharge || 0) > 0 : false
          }
          deliveryAmount={
            paymentDialog ? (orders.find(o => o.id === paymentDialog)?.deliveryCharge || 0) : 0
          }
        />
      )}
    </div>
  );
}