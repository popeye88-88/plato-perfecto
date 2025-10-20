import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, Truck, DollarSign, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: 'preparando' | 'entregando' | 'cobrando';
}

interface Order {
  id: string;
  number: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'preparando' | 'entregando' | 'cobrando' | 'pagado';
  createdAt: Date;
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
  const [activeTab, setActiveTab] = useState('resumen');
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    selectedItems: [] as Array<{id: string, name: string, price: number, quantity: number}>
  });

  // Load orders from localStorage (simple version)
  useEffect(() => {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders).map((order: any) => ({
          ...order,
          createdAt: new Date(order.createdAt)
        }));
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

  const getOrdersByStatus = (status: string) => {
    if (status === 'resumen') {
      return orders.filter(order => order.status !== 'pagado');
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

      const newOrder: Order = {
        id: Date.now().toString(),
      number: `ORD-${orders.length + 1}`,
      customerName: newOrderForm.customerName,
      items: newOrderForm.selectedItems.map(item => ({
        ...item,
        status: 'preparando' as const
      })),
        total: calculateTotal(),
        status: 'preparando',
      createdAt: new Date()
    };

    const newOrders = [...orders, newOrder];
    saveOrders(newOrders);
    
    // Reset form and close dialog
    setNewOrderForm({
      customerName: '',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Gestión de Comandas
          </h1>
          <p className="text-muted-foreground">
            Administra las órdenes de tu restaurante
          </p>
        </div>
        
        <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">Crear Nueva Orden</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Customer Name */}
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

              {/* Menu Items Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Seleccionar Productos</h3>
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
                          onClick={() => addItemToOrder(item)}
                          className="bg-gradient-primary hover:opacity-90 h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Items */}
              {newOrderForm.selectedItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Productos Seleccionados</h3>
                  <div className="space-y-2">
                    {newOrderForm.selectedItems.map((item) => (
                      <div key={item.id} className="p-3 border border-border rounded-lg bg-card">
                        <div className="flex items-center justify-between">
                      <div className="flex-1">
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                        </div>
                          <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                          >
                            -
                          </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                          >
                            +
                          </Button>
                          <Button 
                            size="sm" 
                              variant="destructive"
                              onClick={() => removeItemFromOrder(item.id)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                          </Button>
                          </div>
                          <div className="ml-4 font-semibold text-foreground">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
                
                  {/* Total */}
                  <div className="p-4 border-t border-border bg-muted/30 rounded-lg">
                    <div className="flex justify-between items-center text-lg font-semibold text-foreground">
                    <span>Total:</span>
                      <span className="text-primary">${calculateTotal().toFixed(2)}</span>
                  </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
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
          </DialogContent>
        </Dialog>
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
            {getOrdersByStatus('resumen').map((order) => (
              <div key={order.id} className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow space-y-3">
                {/* Header */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 items-center gap-2">
                    <div className="font-bold text-lg text-foreground">{order.number}</div>
                    <div className="flex justify-center">
                      <Badge className={`${getStatusColor(order.status)} font-medium`}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-right text-xs text-muted-foreground font-medium">
                      {order.createdAt.toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground font-medium">
                    Cliente: {order.customerName}
                  </div>
                </div>
                
                {/* Items */}
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1 px-2 bg-muted/30 rounded">
                      <span className="font-medium text-foreground">{item.name} x{item.quantity}</span>
                      <span className="font-semibold text-primary">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <span className="font-bold text-lg text-foreground">Total: ${order.total.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'preparando' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateOrderStatus(order.id, 'entregando')}
                        className="bg-gradient-primary hover:opacity-90 font-medium"
                      >
                        Entregar
                      </Button>
                    )}
                    {order.status === 'entregando' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateOrderStatus(order.id, 'cobrando')}
                        className="bg-gradient-primary hover:opacity-90 font-medium"
                      >
                        Cobrar
                      </Button>
                    )}
                    {order.status === 'cobrando' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateOrderStatus(order.id, 'pagado')}
                        className="bg-gradient-primary hover:opacity-90 font-medium"
                      >
                        Pagado
                      </Button>
                    )}
                </div>
                </div>
              </div>
            ))}
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
              {getOrdersByStatus(status).map((order) => (
                <div key={order.id} className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow space-y-3">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <div className="font-bold text-lg text-foreground">{order.number}</div>
                      <div className="flex justify-center">
                        <Badge className={`${getStatusColor(order.status)} font-medium`}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-right text-xs text-muted-foreground font-medium">
                        {order.createdAt.toLocaleTimeString('es-ES', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground font-medium">
                      Cliente: {order.customerName}
                    </div>
              </div>
                  
                  {/* Items */}
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1 px-2 bg-muted/30 rounded">
                        <span className="font-medium text-foreground">{item.name} x{item.quantity}</span>
                        <span className="font-semibold text-primary">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                ))}
              </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <span className="font-bold text-lg text-foreground">Total: ${order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'preparando' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'entregando')}
                          className="bg-gradient-primary hover:opacity-90 font-medium"
                        >
                          Entregar
                        </Button>
                      )}
                      {order.status === 'entregando' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'cobrando')}
                          className="bg-gradient-primary hover:opacity-90 font-medium"
                        >
                          Cobrar
                        </Button>
                      )}
                      {order.status === 'cobrando' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'pagado')}
                          className="bg-gradient-primary hover:opacity-90 font-medium"
                        >
                          Pagado
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  );
}