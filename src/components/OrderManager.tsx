import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Minus, Clock, Truck, DollarSign, X, Edit2, History, Percent, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBusinessContext } from '@/contexts/BusinessContext';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: 'preparando' | 'entregando' | 'cobrando' | 'pagado';
  cancelled?: boolean;
  cancelledAt?: Date;
  cancelledInStage?: 'preparando' | 'entregando' | 'cobrando';
}

interface Order {
  id: string;
  number: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'preparando' | 'entregando' | 'cobrando' | 'pagado';
  createdAt: Date;
  serviceType?: 'puesto' | 'takeaway' | 'delivery';
  diners?: number;
  edited?: boolean;
  discountAmount?: number;
  discountReason?: string;
  paymentMethod?: 'tarjeta' | 'efectivo';
  individualItemsStatus?: Record<string, 'preparando' | 'entregando' | 'cobrando'>;
  individualItemsCancelled?: Record<string, boolean>;
}

export default function OrderManager() {
  const { toast } = useToast();
  const { currentBusiness } = useBusinessContext();
  
  // Get menu items from current business
  const menuItems = currentBusiness?.menuItems || [];
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState('resumen');
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    serviceType: 'puesto' as 'puesto' | 'takeaway' | 'delivery',
    diners: 1,
    selectedItems: [] as Array<{id: string, name: string, price: number, quantity: number}>
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [selectedOrderForDiscount, setSelectedOrderForDiscount] = useState<Order | null>(null);
  const [discountItems, setDiscountItems] = useState<Set<string>>(new Set());
  const [discountReason, setDiscountReason] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'efectivo' | ''>('');
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [isCancelItemDialogOpen, setIsCancelItemDialogOpen] = useState(false);
  const [itemToCancel, setItemToCancel] = useState<{orderId: string, itemId: string, individualId?: string} | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Load orders from localStorage (simple version)
  useEffect(() => {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders).map((order: any) => {
          // Migrate old 'entregado' status to 'cobrando'
          const migrateStatus = (status: string) => {
            if (status === 'entregado') return 'cobrando';
            return status;
          };
          
          // Migrate individual items status
          if (order.individualItemsStatus) {
            const migratedIndividualStatus: Record<string, 'preparando' | 'entregando' | 'cobrando'> = {};
            Object.entries(order.individualItemsStatus).forEach(([key, status]) => {
              if (typeof status === 'string') {
                migratedIndividualStatus[key] = migrateStatus(status) as 'preparando' | 'entregando' | 'cobrando';
              }
            });
            order.individualItemsStatus = migratedIndividualStatus;
          }
          
          // Migrate items status
          if (order.items) {
            order.items = order.items.map((item: any) => ({
              ...item,
              status: migrateStatus(item.status)
            }));
          }
          
          return {
            ...order,
            createdAt: new Date(order.createdAt)
          };
        });
        setOrders(parsedOrders);
      } catch (error) {
        console.error('Error parsing saved orders:', error);
      }
    }
  }, []);

  // Save orders to localStorage
  const saveOrders = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem('orders', JSON.stringify(newOrders));
  };

  // Clear all orders for testing
  const clearAllOrders = () => {
    setOrders([]);
    localStorage.removeItem('orders');
    toast({
      title: "Órdenes eliminadas",
      description: "Todas las órdenes han sido eliminadas para testing",
    });
  };

  const getOrdersByStatus = (status: string) => {
    if (status === 'resumen') {
      return orders.filter(order => order.status !== 'pagado');
    }
    if (status === 'preparando') {
      // Show orders that have at least one individual item in 'preparando' status AND order is not paid
      return orders.filter(order => {
        if (order.status === 'pagado') return false;
        
        const activeItems = order.items.filter(item => !item.cancelled);
        return activeItems.some(item => {
          // Check if there are any individual items still in 'preparando' status
          return Array.from({ length: item.quantity }, (_, idx) => 
            `${item.id}-${idx}`
          ).some(id => {
            const individualStatus = order.individualItemsStatus?.[id];
            return !individualStatus || individualStatus === 'preparando';
          });
        });
      });
    }
    if (status === 'entregando') {
      // Show orders that have at least one individual item in 'entregando' or 'cobrando' status AND order is not paid
      // BUT exclude orders where ALL items are in 'cobrando' status
      return orders.filter(order => {
        if (order.status === 'pagado') return false;
        
        const activeItems = order.items.filter(item => !item.cancelled);
        if (activeItems.length === 0) return false;
        
        // Check if ALL individual items are in 'cobrando' - if so, exclude from 'entregando'
        const allItemsReadyForPayment = activeItems.every(item => {
          return Array.from({ length: item.quantity }, (_, idx) => 
            `${item.id}-${idx}`
          ).every(id => {
            const individualStatus = order.individualItemsStatus?.[id];
            return individualStatus === 'cobrando';
          });
        });
        
        if (allItemsReadyForPayment) return false;
        
        return activeItems.some(item => {
          // Check if there are any individual items in 'entregando' or 'cobrando' status
          return Array.from({ length: item.quantity }, (_, idx) => 
            `${item.id}-${idx}`
          ).some(id => {
            const individualStatus = order.individualItemsStatus?.[id];
            return individualStatus === 'entregando' || individualStatus === 'cobrando';
          });
        });
      });
    }
    if (status === 'cobrando') {
      // Show orders where ALL individual items are 'entregado' AND order is not paid
      return orders.filter(order => {
        if (order.status === 'pagado') return false;
        
        const activeItems = order.items.filter(item => !item.cancelled);
        if (activeItems.length === 0) return false;
        
        // Check if ALL individual items are 'cobrando'
        return activeItems.every(item => {
          return Array.from({ length: item.quantity }, (_, idx) => 
            `${item.id}-${idx}`
          ).every(id => {
            const individualStatus = order.individualItemsStatus?.[id];
            return individualStatus === 'cobrando';
          });
        });
      });
    }
    return orders.filter(order => order.status === status);
  };

  const getStatusCount = (status: string) => {
    return getOrdersByStatus(status).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparando': return 'bg-yellow-100 text-yellow-800';
      case 'entregando': return 'bg-blue-100 text-blue-800';
      case 'cobrando': return 'bg-green-100 text-green-800';
      case 'pagado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparando': return <Clock className="h-4 w-4" />;
      case 'entregando': return <Truck className="h-4 w-4" />;
      case 'cobrando': return <DollarSign className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const addItemToOrder = (item: typeof menuItems[0]) => {
    const existingItem = newOrderForm.selectedItems.find(i => i.id === item.id);
    if (existingItem) {
      setNewOrderForm(prev => ({
        ...prev,
        selectedItems: prev.selectedItems.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }));
    } else {
      setNewOrderForm(prev => ({
        ...prev,
        selectedItems: [...prev.selectedItems, { ...item, quantity: 1 }]
      }));
    }
  };

  const removeItemFromOrder = (itemId: string) => {
    setNewOrderForm(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.filter(item => item.id !== itemId)
    }));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromOrder(itemId);
      return;
    }
    setNewOrderForm(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      )
    }));
  };

  const calculateTotal = () => {
    return newOrderForm.selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const createNewOrder = () => {
    if (!newOrderForm.customerName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa el nombre del cliente",
        variant: "destructive"
      });
      return;
    }

    if (newOrderForm.selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona al menos un producto",
        variant: "destructive"
      });
      return;
    }

    // Initialize individual items status
    const individualItemsStatus: Record<string, 'preparando' | 'entregando' | 'cobrando'> = {};
    newOrderForm.selectedItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        individualItemsStatus[`${item.id}-${i}`] = 'preparando';
      }
    });

    const newOrder: Order = {
      id: Date.now().toString(),
      number: `ORD-${orders.length + 1}`,
      customerName: newOrderForm.customerName,
      serviceType: newOrderForm.serviceType,
      diners: newOrderForm.diners,
      items: newOrderForm.selectedItems.map(item => ({
        ...item,
        status: 'preparando' as const
      })),
      total: calculateTotal(),
      status: 'preparando',
      createdAt: new Date(),
      edited: false,
      individualItemsStatus
    };

    const newOrders = [...orders, newOrder];
    saveOrders(newOrders);
    
    // Reset form and close dialog
    setNewOrderForm({
      customerName: '',
      serviceType: 'puesto',
      diners: 1,
      selectedItems: []
    });
    setIsNewOrderDialogOpen(false);
    
    toast({
      title: "Orden creada",
      description: `Orden ${newOrder.number} creada exitosamente`,
    });
  };

  const resetNewOrderForm = () => {
    setNewOrderForm({
      customerName: '',
      serviceType: 'puesto',
      diners: 1,
      selectedItems: []
    });
    setIsNewOrderDialogOpen(false);
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    );
    saveOrders(updatedOrders);
    
    toast({
      title: "Estado actualizado",
      description: `Orden actualizada a ${newStatus}`,
    });
  };

  const updateItemStatus = (orderId: string, itemId: string, newStatus: OrderItem['status']) => {
    const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          const updatedItems = order.items.map(item =>
            item.id === itemId ? { ...item, status: newStatus } : item
          );
          
        // Determine order status based on item states
        const getOrderStatus = (items: OrderItem[]): Order['status'] => {
          const activeItems = items.filter(item => !item.cancelled);
          
          // If all items are in 'cobrando', order goes to 'cobrando'
          if (activeItems.length > 0 && activeItems.every(item => item.status === 'cobrando')) {
            return 'cobrando';
          }
          
          // If any item is in 'entregando' or 'cobrando', order is in 'entregando'
          if (activeItems.some(item => item.status === 'entregando' || item.status === 'cobrando')) {
            return 'entregando';
          }
          
          // If any item is in 'preparando', order is in 'preparando'
          if (activeItems.some(item => item.status === 'preparando')) {
            return 'preparando';
          }
          
          return 'pagado';
        };
        
        const newOrderStatus = getOrderStatus(updatedItems);
        
        return { 
          ...order, 
          items: updatedItems, 
          status: newOrderStatus,
          edited: true
        };
      }
      return order;
    });
    saveOrders(updatedOrders);
  };

  const applyDiscount = () => {
    if (!selectedOrderForDiscount || discountItems.size === 0 || !discountReason.trim()) {
      toast({
        title: "Error",
        description: "Debes seleccionar items y proporcionar una razón para el descuento",
        variant: "destructive"
      });
      return;
    }

    const discountAmount = selectedOrderForDiscount.items
      .filter(item => discountItems.has(item.id))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const newTotal = selectedOrderForDiscount.total - discountAmount;

    const updatedOrders = orders.map(order => 
      order.id === selectedOrderForDiscount.id 
            ? { 
                ...order, 
            discountAmount, 
            discountReason, 
            total: newTotal,
            edited: true
              }
            : order
    );
    
    saveOrders(updatedOrders);
    setIsDiscountOpen(false);
    setDiscountItems(new Set());
    setDiscountReason('');
    setSelectedOrderForDiscount(null);
      
      toast({
      title: "Descuento aplicado",
      description: `Se aplicó un descuento de $${discountAmount.toFixed(2)}`
    });
  };

  const processPayment = () => {
    if (!selectedOrderForPayment || !paymentMethod) {
      toast({
        title: "Error",
        description: "Debes seleccionar un método de pago",
        variant: "destructive"
      });
      return;
    }

    const updatedOrders = orders.map(order => 
      order.id === selectedOrderForPayment.id 
            ? { 
                ...order, 
            status: 'pagado' as const,
            paymentMethod,
            edited: true
              }
            : order
      );
    
    saveOrders(updatedOrders);
    setIsPaymentOpen(false);
    setPaymentMethod('');
    setSelectedOrderForPayment(null);
      
      toast({
      title: "Pago procesado",
      description: `Orden pagada con ${paymentMethod === 'tarjeta' ? 'tarjeta' : 'efectivo'}`
    });
  };

  const addItemToExistingOrder = (orderId: string, item: typeof menuItems[0]) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const newItem: OrderItem = {
          id: `${Date.now()}-${Math.random()}`,
          name: item.name,
          price: item.price,
          quantity: 1,
        status: 'preparando',
          cancelled: false
        };
        
        const updatedItems = [...order.items, newItem];
        const newTotal = updatedItems
          .filter(item => !item.cancelled)
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return {
          ...order,
          items: updatedItems,
          total: newTotal,
          edited: true
        };
      }
      return order;
    });
    
    saveOrders(updatedOrders);
    toast({
      title: "Elemento añadido",
      description: `${item.name} añadido a la orden`
    });
  };

  const increaseItemQuantity = (orderId: string, itemId: string, price: number) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const updatedItems = order.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              quantity: item.quantity + 1
            };
          }
          return item;
        });
        
        const newTotal = updatedItems
          .filter(item => !item.cancelled)
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
        return {
          ...order,
          items: updatedItems,
          total: newTotal,
          edited: true
        };
      }
      return order;
    });
    
    saveOrders(updatedOrders);
  };

  const decreaseItemQuantity = (orderId: string, itemId: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const updatedItems = order.items.map(item => {
          if (item.id === itemId && item.quantity > 1) {
            return {
              ...item,
              quantity: item.quantity - 1
            };
          }
          return item;
        });
        
        const newTotal = updatedItems
          .filter(item => !item.cancelled)
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
        return {
          ...order,
          items: updatedItems,
          total: newTotal,
          edited: true
        };
      }
      return order;
    });
    
    saveOrders(updatedOrders);
  };

  const requestItemCancellation = (orderId: string, itemId: string, currentStage: string) => {
    // If order is in 'cobrando' stage, require confirmation and reason
    if (currentStage === 'cobrando') {
      setItemToCancel({ orderId, itemId });
      setIsCancelItemDialogOpen(true);
    } else {
      // For other stages, cancel directly without confirmation
      removeItemFromExistingOrder(orderId, itemId, currentStage);
    }
  };

  const handleConfirmItemCancellation = () => {
    if (!itemToCancel || !cancelReason.trim()) {
      toast({
        title: "Error",
        description: "Debes proporcionar una razón para eliminar el elemento",
        variant: "destructive"
      });
      return;
    }

    removeItemFromExistingOrder(itemToCancel.orderId, itemToCancel.itemId, 'cobrando');
    setIsCancelItemDialogOpen(false);
    setItemToCancel(null);
    setCancelReason('');
    
    toast({
      title: "Elemento eliminado",
      description: "Elemento marcado como eliminado con la razón especificada"
    });
  };

  const removeItemFromExistingOrder = (orderId: string, itemId: string, currentStage: string) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        const updatedItems = order.items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              cancelled: true,
              cancelledAt: new Date(),
              cancelledInStage: currentStage as 'preparando' | 'entregando' | 'cobrando'
            };
          }
          return item;
        });
        
        const newTotal = updatedItems
          .filter(item => !item.cancelled)
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    return {
          ...order,
          items: updatedItems,
          total: newTotal,
          edited: true
        };
      }
      return order;
    });
    
    saveOrders(updatedOrders);
    toast({
      title: "Elemento eliminado",
      description: "Elemento marcado como eliminado"
    });
  };

  const getServiceTypeLabel = (serviceType: string) => {
    switch (serviceType) {
      case 'puesto': return 'En Puesto';
      case 'takeaway': return 'Take Away';
      case 'delivery': return 'Delivery';
      default: return 'En Puesto';
    }
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

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case 'preparando': return '🔥';
      case 'entregando': return '📦';
      case 'cobrando': return '💰';
      case 'pagado': return '✅';
      default: return '•';
    }
  };

  const renderOrderCard = (order: Order, currentTab: string) => {
    const isCobrandoOrPagado = currentTab === 'cobrando' || currentTab === 'pagado';
    
    // Group items for Cobrando and Pagado tabs
    const groupedItems = isCobrandoOrPagado
      ? order.items.reduce((acc, item) => {
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
      <div key={order.id} className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow space-y-3">
        {/* Header - Two rows */}
        <div className="space-y-2">
          {/* First row: Number | Status | Edit button */}
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="font-bold text-lg text-foreground">{order.number}</div>
            <div className="flex justify-center">
              <Badge className={`${getStatusColor(order.status)} font-medium`}>
                {order.status}
            </Badge>
          </div>
            <div className="flex justify-end gap-1">
              {order.edited && (
            <Button 
                  variant="ghost"
              size="sm" 
                  onClick={() => setIsHistoryOpen(true)}
                  className="h-8 w-8 p-0"
                  title="Ver historial"
                >
                  <History className="h-4 w-4" />
                </Button>
              )}
              {order.status !== 'pagado' && (
                <Button
              variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedOrderForEdit(order);
                    setIsEditOrderOpen(true);
                  }}
              className="h-8 w-8 p-0"
            >
                  <Edit2 className="h-4 w-4" />
            </Button>
              )}
          </div>
        </div>
        
          {/* Second row: Name-diners | Service type | Date and time */}
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="font-medium">
              {order.customerName}
              {order.diners && ` - ${order.diners}`}
            </div>
            <div className="text-center font-medium">
              {getServiceTypeLabel(order.serviceType || 'puesto')}
            </div>
            <div className="text-right font-medium">
              {formatDateTime(order.createdAt)}
            </div>
          </div>
        </div>
        
        {/* Items section */}
        <div className="space-y-1">
          {isCobrandoOrPagado ? (
            // Grouped items for Cobrando and Pagado
            Object.values(groupedItems).map((grouped, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1">
                <div className="font-medium text-foreground">{grouped.quantity}x {grouped.name}</div>
                <div className="text-center text-muted-foreground">${grouped.price.toFixed(2)}</div>
                <div className="text-right font-semibold text-primary">${grouped.totalPrice.toFixed(2)}</div>
              </div>
            ))
          ) : (
            // Individual items for Preparando and Entregando - one line per item
            order.items.flatMap((item, itemIndex) => {
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
              
              // Create one line per individual item (not grouped)
              return Array.from({ length: item.quantity }, (_, quantityIndex) => {
                // Create unique ID for each individual item
                const individualItemId = `${item.id}-${quantityIndex}`;
                
                // Get the current status of this individual item
                const individualItemStatus = order.individualItemsStatus?.[individualItemId] || 'preparando';
                
                // Determine if this individual item should be enabled for checking
                let individualItemEnabled = false;
                let individualItemChecked = false;
                
                if (isPreparandoTab) {
                  // In preparando tab: can only check items that are in 'preparando' status
                  individualItemEnabled = individualItemStatus === 'preparando' && !item.cancelled;
                  individualItemChecked = false; // Never checked in preparando tab
                } else if (isEntregandoTab) {
                  // In entregando tab: can only check items that are in 'entregando' status
                  individualItemEnabled = individualItemStatus === 'entregando' && !item.cancelled;
                  individualItemChecked = individualItemStatus === 'cobrando';
                }
                
                return (
                  <div key={individualItemId} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-b-0">
                    {/* Left column - Check mark */}
                    <div className="flex items-center">
                      {showCheckbox && !item.cancelled && (
                  <Checkbox
                          checked={individualItemChecked}
                          disabled={!individualItemEnabled}
                    onCheckedChange={(checked) => {
                            if (checked && individualItemEnabled) {
                              // Update individual item status
                              const updatedOrders = orders.map(o => {
                                if (o.id === order.id) {
                                  const updatedIndividualItemsStatus: Record<string, 'preparando' | 'entregando' | 'cobrando'> = {
                                    ...o.individualItemsStatus,
                                    [individualItemId]: isPreparandoTab ? 'entregando' : 'cobrando'
                                  };
                                  
                                  // Check if all individual items of this product are in the same status
                                  const allItemsInSameStatus = Array.from({ length: item.quantity }, (_, idx) => 
                                    `${item.id}-${idx}`
                                  ).every(id => {
                                    const status = updatedIndividualItemsStatus[id];
                                    return status === updatedIndividualItemsStatus[individualItemId];
                                  });
                                  
                                  // Update the main item status when ALL individual items are in the same status
                                  let updatedItems = o.items;
                                  if (allItemsInSameStatus) {
                                    updatedItems = o.items.map(i => {
                                      if (i.id === item.id) {
                                        const newStatus = updatedIndividualItemsStatus[individualItemId];
                                        if (newStatus === 'entregando') {
                                          return { ...i, status: 'entregando' as const };
                                        } else if (newStatus === 'cobrando') {
                                          return { ...i, status: 'cobrando' as const };
                                        }
                                      }
                                      return i;
                                    });
                                  }
                                  
                                  // Check if ALL individual items of the entire order are 'cobrando'
                                  const allOrderItemsReadyForPayment = o.items.every(orderItem => {
                                    if (orderItem.cancelled) return true; // Skip cancelled items
                                    return Array.from({ length: orderItem.quantity }, (_, idx) => 
                                      `${orderItem.id}-${idx}`
                                    ).every(id => updatedIndividualItemsStatus[id] === 'cobrando');
                                  });
                                  
                                  // If all order items are ready for payment, move order to 'cobrando'
                                  let updatedOrderStatus = o.status;
                                  if (allOrderItemsReadyForPayment && o.status !== 'pagado') {
                                    updatedOrderStatus = 'cobrando';
                                    // Update all items to 'cobrando' status
                                    updatedItems = updatedItems.map(i => ({
                                      ...i,
                                      status: 'cobrando' as const
                                    }));
                                  }
                                  
                                  return {
                                    ...o,
                                    status: updatedOrderStatus,
                                    items: updatedItems,
                                    individualItemsStatus: updatedIndividualItemsStatus
                                  };
                                }
                                return o;
                              });
                              
                              saveOrders(updatedOrders);
                      }
                    }}
                    className="h-4 w-4"
                  />
                )}
                    </div>
                    
                    {/* Center column - Item name */}
                    <div className={`flex-1 px-3 ${item.cancelled ? 'line-through text-muted-foreground' : (!individualItemEnabled && showCheckbox ? 'text-muted-foreground' : 'text-foreground')}`}>
                      <span className={`font-medium ${item.cancelled ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {item.name}
                </span>
              </div>
                    
                    {/* Right column - Status symbol */}
                    <div className="flex items-center">
                      {!isCobrandoOrPagado && (
                        <span className="text-lg">
                          {item.cancelled ? getStatusSymbol(item.cancelledInStage || 'preparando') : 
                           getStatusSymbol(individualItemStatus)}
                        </span>
                      )}
          </div>
                  </div>
                );
              });
            })
          )}
        </div>
        
        {/* Footer with total and actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <span className="font-bold text-lg text-foreground">Total: ${order.total.toFixed(2)}</span>
            {order.discountAmount && order.discountAmount > 0 && (
              <div className="text-xs text-success-foreground">
                (Descuento: -${order.discountAmount.toFixed(2)})
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {order.status === 'cobrando' && currentTab === 'cobrando' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedOrderForDiscount(order);
                    setIsDiscountOpen(true);
                  }}
                >
                  <Percent className="h-4 w-4 mr-1" />
                  Descuento
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setSelectedOrderForPayment(order);
                    setIsPaymentOpen(true);
                  }}
                  className="bg-gradient-primary hover:opacity-90 font-medium"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Cobrar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Gestión de Comandas
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Administra las órdenes de tu restaurante
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Crear Nueva Orden</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-border rounded-lg bg-card">
                  <Label htmlFor="customerName" className="text-sm font-medium text-foreground">Nombre del Cliente</Label>
                  <Input
                    id="customerName"
                    value={newOrderForm.customerName}
                    onChange={(e) => setNewOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Ingresa el nombre del cliente"
                    className="mt-2"
                  />
                </div>
                <div className="p-4 border border-border rounded-lg bg-card">
                  <Label htmlFor="serviceType" className="text-sm font-medium text-foreground">Tipo de Servicio</Label>
                  <Select 
                    value={newOrderForm.serviceType} 
                    onValueChange={(value: any) => setNewOrderForm(prev => ({ ...prev, serviceType: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="puesto">En Puesto</SelectItem>
                      <SelectItem value="takeaway">Take Away</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 border border-border rounded-lg bg-card">
                  <Label htmlFor="diners" className="text-sm font-medium text-foreground">Comensales</Label>
                  <Input
                    id="diners"
                    type="number"
                    min="1"
                    value={newOrderForm.diners}
                    onChange={(e) => setNewOrderForm(prev => ({ ...prev, diners: parseInt(e.target.value) || 1 }))}
                    className="mt-2"
                  />
                </div>
                </div>
                
              {/* Menu Items Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Seleccionar Productos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {menuItems.map((item) => {
                    const selectedItem = newOrderForm.selectedItems.find(i => i.id === item.id);
                    const quantity = selectedItem?.quantity || 0;
                    
                    return (
                      <div key={item.id} className="p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-center">
                      <div className="flex-1">
                            <h4 className="font-medium text-foreground">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                            <p className="font-semibold text-primary text-sm">${item.price.toFixed(2)}</p>
                        </div>
                          <div className="flex items-center space-x-2">
                            {quantity > 0 && (
                              <>
                          <Button 
                            size="sm" 
                            variant="outline"
                                  onClick={() => updateItemQuantity(item.id, quantity - 1)}
                                  className="h-8 w-8 p-0"
                          >
                                  <Minus className="h-4 w-4" />
                          </Button>
                                <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                              </>
                            )}
                          <Button 
                            size="sm" 
                              onClick={() => addItemToOrder(item)}
                              className="bg-gradient-primary hover:opacity-90 h-8 w-8 p-0"
                          >
                              <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                    </div>
                    </div>
                    );
                  })}
                </div>
              </div>
                </div>
                
            {/* Fixed Footer */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-semibold text-foreground">
                  Total: <span className="text-primary">${calculateTotal().toFixed(2)}</span>
                  </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetNewOrderForm} className="px-6">
                    Cancelar
                    </Button>
                    <Button 
                    onClick={createNewOrder}
                    className="bg-gradient-primary hover:opacity-90 px-6"
                    disabled={!newOrderForm.customerName.trim() || newOrderForm.selectedItems.length === 0}
                  >
                    Crear Orden
                    </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          
          <Button 
            variant="outline" 
            onClick={clearAllOrders}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar Órdenes
          </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumen" className="flex items-center gap-2">
            Resumen ({getStatusCount('resumen')})
          </TabsTrigger>
          <TabsTrigger value="preparando" className="flex items-center gap-2">
            Preparando ({getStatusCount('preparando')})
          </TabsTrigger>
          <TabsTrigger value="entregando" className="flex items-center gap-2">
            Entregando ({getStatusCount('entregando')})
          </TabsTrigger>
          <TabsTrigger value="cobrando" className="flex items-center gap-2">
            Cobrando ({getStatusCount('cobrando')})
          </TabsTrigger>
          <TabsTrigger value="pagado" className="flex items-center gap-2">
            Pagado ({getStatusCount('pagado')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Preparando</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{getStatusCount('preparando')}</div>
            </CardContent>
          </Card>

          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregando</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{getStatusCount('entregando')}</div>
            </CardContent>
          </Card>

          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobrando</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{getStatusCount('cobrando')}</div>
            </CardContent>
          </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getOrdersByStatus('resumen').map((order) => renderOrderCard(order, 'resumen'))}
            {getOrdersByStatus('resumen').length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-8">
                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No hay órdenes activas
                </h3>
                <p className="text-muted-foreground mb-6">
                  Crea tu primera orden para comenzar
                </p>
                <Button onClick={() => setIsNewOrderDialogOpen(true)} className="bg-gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Orden
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {['preparando', 'entregando', 'cobrando', 'pagado'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getOrdersByStatus(status).map((order) => renderOrderCard(order, status))}
              {getOrdersByStatus(status).length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center">
                    {getStatusIcon(status)}
                    <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">
                      No hay órdenes {status}
                    </h3>
                    <p className="text-muted-foreground">
                      Las órdenes aparecerán aquí cuando cambien a este estado
                    </p>
              </div>
                </div>
              )}
            </div>
        </TabsContent>
        ))}
      </Tabs>

      {/* Discount Dialog */}
      <Dialog open={isDiscountOpen} onOpenChange={setIsDiscountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Descuento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Seleccionar productos para descuento:</Label>
              <div className="space-y-2 mt-2">
                {selectedOrderForDiscount?.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={discountItems.has(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDiscountItems(prev => new Set([...prev, item.id]));
                        } else {
                          setDiscountItems(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(item.id);
                            return newSet;
                          });
                        }
                      }}
                    />
                    <span className="text-sm">{item.name} - ${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="discountReason">Razón del descuento (obligatorio):</Label>
              <Input
                id="discountReason"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Ej: Cliente frecuente, problema con el pedido..."
                className="mt-2"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDiscountOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={applyDiscount} className="bg-gradient-primary hover:opacity-90">
                Aplicar Descuento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial de Ediciones</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Esta orden ha sido editada. El historial de cambios se mostrará aquí cuando esté disponible.
            </p>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedOrderForPayment && (
              <div className="p-4 border border-border rounded-lg bg-card">
                <h3 className="font-semibold text-foreground mb-2">Orden: {selectedOrderForPayment.number}</h3>
                <p className="text-sm text-muted-foreground mb-2">Cliente: {selectedOrderForPayment.customerName}</p>
                <div className="text-lg font-bold text-primary">
                  Total: ${selectedOrderForPayment.total.toFixed(2)}
                </div>
                {selectedOrderForPayment.discountAmount && selectedOrderForPayment.discountAmount > 0 && (
                  <div className="text-sm text-success-foreground">
                    Descuento aplicado: -${selectedOrderForPayment.discountAmount.toFixed(2)}
                  </div>
                )}
              </div>
            )}
            
            <div>
              <Label>Método de pago:</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={paymentMethod === 'tarjeta' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('tarjeta')}
                  className="flex-1"
                >
                  💳 Tarjeta
                </Button>
                <Button
                  variant={paymentMethod === 'efectivo' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('efectivo')}
                  className="flex-1"
                >
                  💵 Efectivo
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={processPayment} 
                className="bg-gradient-primary hover:opacity-90"
                disabled={!paymentMethod}
              >
                Procesar Pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Orden - {selectedOrderForEdit?.number}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {selectedOrderForEdit && (
              <>
                {/* Current Items */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Elementos Actuales</h3>
                  <div className="space-y-2">
                    {selectedOrderForEdit.items.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getStatusSymbol(item.status)}</span>
                          <div className={`${item.cancelled ? 'line-through text-muted-foreground' : ''}`}>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          {!item.cancelled && (
                            <div className="flex items-center gap-2 border border-border rounded-md">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => decreaseItemQuantity(selectedOrderForEdit.id, item.id)}
                                disabled={item.quantity <= 1}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => increaseItemQuantity(selectedOrderForEdit.id, item.id, item.price)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {item.cancelled && (
                            <Badge variant="secondary" className="text-xs">
                              Eliminado en {item.cancelledInStage}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          {!item.cancelled && activeTab === 'cobrando' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => requestItemCancellation(selectedOrderForEdit.id, item.id, activeTab)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Items */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Añadir Elementos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {menuItems.map((item) => (
                      <div key={item.id} className="p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                            <p className="font-semibold text-primary text-sm">${item.price.toFixed(2)}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addItemToExistingOrder(selectedOrderForEdit.id, item)}
                            className="bg-gradient-primary hover:opacity-90 h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsEditOrderOpen(false)} className="px-6">
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Item Confirmation Dialog */}
      <Dialog open={isCancelItemDialogOpen} onOpenChange={setIsCancelItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación de Elemento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <div>
                  <p className="font-semibold text-yellow-900">Advertencia</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Estás a punto de eliminar un elemento de una orden en etapa de cobro. Este elemento aparecerá como tachado y no será cobrado.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancelReason" className="text-sm font-medium">Razón de eliminación *</Label>
              <Input
                id="cancelReason"
                placeholder="Ej: Cliente canceló, producto defectuoso, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              * Campo obligatorio. Explica por qué se elimina este elemento.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCancelItemDialogOpen(false);
                setCancelReason('');
                setItemToCancel(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmItemCancellation}
              disabled={!cancelReason.trim()}
            >
              Confirmar Eliminación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}