import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Clock, Truck, DollarSign, Edit2, X, Check, History as HistoryIcon, Percent, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PaymentDialog from './PaymentDialog';
import NewOrderDialog from './NewOrderDialog';
import EditOrderDialog from './EditOrderDialog';
import OrderEditHistoryDialog from './OrderEditHistoryDialog';

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

const menuItems = [
  { id: '1', name: 'Pizza Margherita', price: 15.00, category: 'Pizzas' },
  { id: '2', name: 'Hamburguesa Clásica', price: 12.50, category: 'Hamburguesas' },
  { id: '3', name: 'Pasta Carbonara', price: 14.00, category: 'Pastas' },
  { id: '4', name: 'Ensalada César', price: 10.00, category: 'Ensaladas' },
];

export default function OrderManager() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<string | null>(null);
  const [editOrderDialog, setEditOrderDialog] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [discountItems, setDiscountItems] = useState<Set<string>>(new Set());
  const [discountReason, setDiscountReason] = useState('');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  // Load orders from Supabase
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const formattedOrders: Order[] = ordersData.map(order => ({
        id: order.id,
        number: order.number,
        customerName: order.customer_name,
        total: parseFloat(order.total.toString()),
        status: order.status as Order['status'],
        createdAt: new Date(order.created_at),
        paymentMethod: order.payment_method as Order['paymentMethod'],
        serviceType: order.service_type as Order['serviceType'],
        deliveryCharge: order.delivery_charge ? parseFloat(order.delivery_charge.toString()) : 0,
        diners: order.diners,
        items: order.order_items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: parseFloat(item.price.toString()),
          quantity: item.quantity,
          status: item.status as OrderItem['status'],
          cancelled: item.cancelled,
          cancellationReason: item.cancellation_reason,
          ingredients: item.ingredients
        }))
      }));

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las órdenes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    preparando: { label: 'Preparando', color: 'bg-yellow-100 text-yellow-800', icon: Clock, symbol: '🔥' },
    entregando: { label: 'Entregando', color: 'bg-blue-100 text-blue-800', icon: Truck, symbol: '📦' },
    cobrando: { label: 'Cobrando', color: 'bg-green-100 text-green-800', icon: DollarSign, symbol: '💰' },
    pagado: { label: 'Pagado', color: 'bg-purple-100 text-purple-800', icon: Check, symbol: '✅' },
  };

  const handleNewOrder = async (orderData: {
    items: Array<{menuItem: any, quantity: number, customIngredients?: string[]}>;
    serviceType: 'puesto' | 'takeaway' | 'delivery';
    diners: number;
    customerName: string;
    deliveryCharge: number;
  }) => {
    try {
      // Calculate total
      const itemsTotal = orderData.items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
      const total = itemsTotal + orderData.deliveryCharge;

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          number: `#${String(orders.length + 1).padStart(3, '0')}`,
          customer_name: orderData.customerName,
          total,
          status: 'preparando',
          service_type: orderData.serviceType,
          diners: orderData.diners,
          delivery_charge: orderData.deliveryCharge
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = [];
      for (const item of orderData.items) {
        for (let i = 0; i < item.quantity; i++) {
          orderItems.push({
            order_id: order.id,
            name: item.menuItem.name,
            price: item.menuItem.price,
            quantity: 1,
            status: 'preparando',
            ingredients: item.customIngredients || null
          });
        }
      }

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Reload orders
      await loadOrders();
      
      toast({
        title: "Orden creada",
        description: `Orden ${order.number} creada exitosamente`
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la orden",
        variant: "destructive"
      });
    }
  };

  const updateItemStatus = async (orderId: string, itemId: string, newStatus: OrderItem['status']) => {
    try {
      // Update item status in database
      const { error: itemError } = await supabase
        .from('order_items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (itemError) throw itemError;

      // Update local state
      setOrders(orders => 
        orders.map(order => {
          if (order.id === orderId) {
            const updatedItems = order.items.map(item =>
              item.id === itemId ? { ...item, status: newStatus } : item
            );
            
            // Determine order status based on item states
            const getOrderStatus = (items: OrderItem[]): Order['status'] => {
              const activeItems = items.filter(item => !item.cancelled);
              if (activeItems.length === 0) return 'pagado';
              
              const hasPreparando = activeItems.some(item => item.status === 'preparando');
              const hasEntregando = activeItems.some(item => item.status === 'entregando');
              const hasCobrando = activeItems.some(item => item.status === 'cobrando');
              
              if (hasPreparando) return 'preparando';
              if (hasEntregando) return 'entregando';
              if (hasCobrando) return 'cobrando';
              return 'pagado';
            };
            
            const newOrderStatus = getOrderStatus(updatedItems);
            
            // Update order status in database
            supabase
              .from('orders')
              .update({ status: newOrderStatus })
              .eq('id', orderId)
              .then();
            
            return { ...order, items: updatedItems, status: newOrderStatus };
          }
          return order;
        })
      );
    } catch (error) {
      console.error('Error updating item status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del elemento",
        variant: "destructive"
      });
    }
  };


  const processPayment = async (orderId: string, paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia', removeDeliveryCharge: boolean = false) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const newTotal = removeDeliveryCharge && order.deliveryCharge 
        ? order.total - order.deliveryCharge 
        : order.total;

      // Update order in database
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'pagado',
          payment_method: paymentMethod,
          delivery_charge: removeDeliveryCharge ? 0 : order.deliveryCharge,
          total: newTotal
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Update all items to cobrando status
      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ status: 'cobrando' })
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Update local state
      setOrders(orders => 
        orders.map(o => 
          o.id === orderId 
            ? { 
                ...o, 
                status: 'pagado', 
                paymentMethod,
                deliveryCharge: removeDeliveryCharge ? 0 : o.deliveryCharge,
                total: newTotal,
                items: o.items.map(item => ({ ...item, status: 'cobrando' as const }))
              }
            : o
        )
      );
      
      toast({
        title: "Pago procesado",
        description: `Orden ${order?.number} pagada con ${paymentMethod}`
      });
      setPaymentDialog(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive"
      });
    }
  };

  const handleEditOrder = async (updatedOrder: Order) => {
    try {
      // Mark order as edited and update
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: updatedOrder.customerName,
          total: updatedOrder.total,
          edited: true
        })
        .eq('id', updatedOrder.id);

      if (orderError) throw orderError;

      // Delete existing items and recreate them
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', updatedOrder.id);

      if (deleteError) throw deleteError;

      // Insert updated items
      const orderItems = updatedOrder.items.map(item => ({
        order_id: updatedOrder.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        status: item.status,
        cancelled: item.cancelled || false,
        cancellation_reason: item.cancellationReason,
        ingredients: item.ingredients
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Log edit history
      await supabase
        .from('order_edit_history')
        .insert([{
          order_id: updatedOrder.id,
          edit_type: 'edit_items',
          changes: JSON.stringify({ items: updatedOrder.items })
        }]);

      // Reload orders
      await loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la orden",
        variant: "destructive"
      });
    }
  };

  const handleApplyDiscount = async () => {
    if (!selectedOrder || discountItems.size === 0 || !discountReason.trim()) {
      toast({
        title: "Error",
        description: "Debes seleccionar items y proporcionar una razón para el descuento",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate discount amount
      const discountAmount = selectedOrder.items
        .filter(item => discountItems.has(item.id))
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const newTotal = selectedOrder.total - discountAmount;

      // Update order
      const { error } = await supabase
        .from('orders')
        .update({
          discount_amount: discountAmount,
          discount_reason: discountReason,
          total: newTotal,
          edited: true
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Log edit history
      await supabase
        .from('order_edit_history')
        .insert([{
          order_id: selectedOrder.id,
          edit_type: 'apply_discount',
          changes: JSON.stringify({
            discounted_items: Array.from(discountItems),
            discount_amount: discountAmount,
            reason: discountReason
          })
        }]);

      await loadOrders();
      setIsDiscountOpen(false);
      setDiscountItems(new Set());
      setDiscountReason('');
      
      toast({
        title: "Descuento aplicado",
        description: `Se aplicó un descuento de $${discountAmount.toFixed(2)}`
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      toast({
        title: "Error",
        description: "No se pudo aplicar el descuento",
        variant: "destructive"
      });
    }
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
      const activeItems = order.items.filter(item => !item.cancelled);
      if (tab === 'preparando') {
        return activeItems.some(item => item.status === 'preparando');
      }
      if (tab === 'entregando') {
        // Show orders that have at least one item in 'entregando' or 'cobrando' but not ALL items are in 'cobrando'
        return (activeItems.some(item => item.status === 'entregando' || item.status === 'cobrando')) && 
               !activeItems.every(item => item.status === 'cobrando');
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
    const preparandoCount = order.items.filter(item => !item.cancelled && item.status === 'preparando').length;
    const entregandoCount = order.items.filter(item => !item.cancelled && item.status === 'entregando').length;
    const cobrandoCount = order.items.filter(item => !item.cancelled && item.status === 'cobrando').length;
    
    const isCobrandoOrPagado = currentTab === 'cobrando' || currentTab === 'pagado';
    
    // Group items for Cobrando and Pagado tabs
    const groupedItems = isCobrandoOrPagado
      ? order.items.reduce((acc, item) => {
          if (item.cancelled) return acc;
          const key = item.name;
          if (!acc[key]) {
            acc[key] = { name: item.name, price: item.price, quantity: 0, totalPrice: 0 };
          }
          acc[key].quantity += item.quantity;
          acc[key].totalPrice += item.price * item.quantity;
          return acc;
        }, {} as Record<string, { name: string; price: number; quantity: number; totalPrice: number }>)
      : {};
    
    return (
      <div key={order.id} className="p-3 md:p-4 border border-border rounded-lg space-y-3">
        {/* Header - Two rows */}
        <div className="space-y-2">
          {/* First row: Number | Status | Edit button */}
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="font-semibold text-lg">{order.number}</div>
            <div className="flex justify-center">
              <Badge className={statusConfig[order.status].color}>
                {statusConfig[order.status].label}
              </Badge>
            </div>
            <div className="flex justify-end gap-1">
              {order.edited && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsHistoryOpen(true);
                  }}
                  className="h-8 w-8 p-0"
                  title="Ver historial"
                >
                  <HistoryIcon className="h-4 w-4" />
                </Button>
              )}
              {order.status !== 'pagado' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditOrderDialog(order.id)}
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Second row: Name-diners | Service type | Date and time */}
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              {order.customerName}
              {order.diners && ` - ${order.diners}`}
            </div>
            <div className="text-center">
              {order.serviceType === 'puesto' ? 'En Puesto' : 
               order.serviceType === 'takeaway' ? 'Take Away' : 'Delivery'}
            </div>
            <div className="text-right">
              {format(order.createdAt, "dd/MM/yy HH:mm", { locale: es })}
            </div>
          </div>
        </div>
        
        {/* Items section */}
        <div className="space-y-1">
          {isCobrandoOrPagado ? (
            // Grouped items for Cobrando and Pagado
            Object.values(groupedItems).map((grouped, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1">
                <div>{grouped.quantity}x {grouped.name}</div>
                <div className="text-center">${grouped.price.toFixed(2)}</div>
                <div className="text-right font-semibold">${grouped.totalPrice.toFixed(2)}</div>
              </div>
            ))
          ) : (
            // Individual items for Preparando and Entregando
            order.items.map((item, itemIndex) => {
              const isPreparandoTab = currentTab === 'preparando';
              const isEntregandoTab = currentTab === 'entregando';
              
              let isEnabled = false;
              let showCheckbox = true;
              let isChecked = false;
              
              if (isPreparandoTab) {
                isEnabled = item.status === 'preparando' && !item.cancelled;
                isChecked = item.status !== 'preparando';
              } else if (isEntregandoTab) {
                isEnabled = item.status === 'entregando' && !item.cancelled;
                isChecked = item.status === 'cobrando';
              } else if (currentTab === 'resumen') {
                showCheckbox = false;
              }
              
              return (
                <div key={`${item.id}-${itemIndex}`} className="flex items-center justify-between text-sm py-1">
                  <div className={`flex items-center gap-2 flex-1 ${!isEnabled && showCheckbox ? 'text-muted-foreground' : ''}`}>
                    {!isCobrandoOrPagado && (
                      <span className="text-lg">{statusConfig[item.status]?.symbol || '•'}</span>
                    )}
                    <span className={item.cancelled ? 'line-through text-muted-foreground' : ''}>
                      {item.name}
                      {item.cancelled && item.cancellationReason && (
                        <span className="text-xs text-muted-foreground ml-2">({item.cancellationReason})</span>
                      )}
                    </span>
                  </div>
                  {showCheckbox && !item.cancelled && (
                    <Checkbox
                      checked={isChecked}
                      disabled={!isEnabled}
                      onCheckedChange={(checked) => {
                        if (checked && isEnabled) {
                          if (isPreparandoTab && item.status === 'preparando') {
                            updateItemStatus(order.id, item.id, 'entregando');
                          } else if (isEntregandoTab && item.status === 'entregando') {
                            updateItemStatus(order.id, item.id, 'cobrando');
                          }
                        }
                      }}
                      className="h-4 w-4"
                    />
                  )}
                </div>
              );
            })
          )}
          
          {currentTab === 'resumen' && (
            <div className="text-xs text-muted-foreground pt-2">
              Preparando: {preparandoCount} | Entregando: {entregandoCount} | Cobrando: {cobrandoCount}
            </div>
          )}
        </div>
        
        {/* Footer with total and actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <span className="font-semibold">Total: ${order.total.toFixed(2)}</span>
            {order.deliveryCharge && order.deliveryCharge > 0 && (
              <div className="text-xs text-muted-foreground">
                (Inc. entrega: ${order.deliveryCharge.toFixed(2)})
              </div>
            )}
            {order.discountAmount && order.discountAmount > 0 && (
              <div className="text-xs text-success-foreground">
                (Descuento: -${order.discountAmount.toFixed(2)})
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {order.status === 'cobrando' && currentTab === 'cobrando' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsDiscountOpen(true);
                  }}
                >
                  <Percent className="h-4 w-4 mr-1" />
                  Descuento
                </Button>
                <Button size="sm" onClick={() => setPaymentDialog(order.id)}>
                  <CreditCard className="h-4 w-4 mr-1" />
                  Cobrar
                </Button>
              </>
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
            {/* Status count boxes at the top */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-border rounded-lg p-4 text-center">
                <div className="font-semibold text-foreground">Preparando</div>
                <div className="text-2xl font-bold mt-2">{summary.preparandoCount}</div>
              </div>
              <div className="border border-border rounded-lg p-4 text-center">
                <div className="font-semibold text-foreground">Entregando</div>
                <div className="text-2xl font-bold mt-2">{summary.entregandoCount}</div>
              </div>
              <div className="border border-border rounded-lg p-4 text-center">
                <div className="font-semibold text-foreground">Cobrando</div>
                <div className="text-2xl font-bold mt-2">{summary.cobrandoCount}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.filter(order => ['preparando', 'entregando', 'cobrando'].includes(order.status)).map(order => (
                <OrderCard key={order.id} order={order} currentTab="resumen" />
              ))}
              {orders.filter(order => ['preparando', 'entregando', 'cobrando'].includes(order.status)).length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  No hay órdenes activas
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preparando" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getOrdersForTab('preparando').map(order => (
                <OrderCard key={order.id} order={order} currentTab="preparando" />
              ))}
              {getOrdersForTab('preparando').length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  No hay órdenes en preparación
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="entregando" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getOrdersForTab('entregando').map(order => (
                <OrderCard key={order.id} order={order} currentTab="entregando" />
              ))}
              {getOrdersForTab('entregando').length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  No hay órdenes para entregar
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cobrando" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.filter(o => o.status === 'cobrando').map(order => (
                <OrderCard key={order.id} order={order} currentTab="cobrando" />
              ))}
              {orders.filter(o => o.status === 'cobrando').length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getFilteredPaidOrders().map(order => (
                <OrderCard key={order.id} order={order} currentTab="pagado" />
              ))}
              {getFilteredPaidOrders().length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
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

      <EditOrderDialog
        open={!!editOrderDialog}
        onOpenChange={(open) => !open && setEditOrderDialog(null)}
        order={editOrderDialog ? orders.find(o => o.id === editOrderDialog) || null : null}
        onSave={handleEditOrder}
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