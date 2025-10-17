import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Clock, Truck, DollarSign } from 'lucide-react';
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

  const createNewOrder = () => {
      const newOrder: Order = {
        id: Date.now().toString(),
      number: `ORD-${orders.length + 1}`,
      customerName: 'Cliente',
      items: [
        {
          id: '1',
          name: 'Pizza Margherita',
          price: 15.00,
          quantity: 1,
          status: 'preparando'
        }
      ],
      total: 15.00,
        status: 'preparando',
      createdAt: new Date()
      };

    const newOrders = [...orders, newOrder];
    saveOrders(newOrders);
      
      toast({
        title: "Orden creada",
      description: `Orden ${newOrder.number} creada exitosamente`,
    });
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
        
        <Button onClick={createNewOrder} className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
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

          {getOrdersByStatus('resumen').length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No hay órdenes activas
              </h3>
              <p className="text-muted-foreground mb-6">
                Crea tu primera orden para comenzar
              </p>
              <Button onClick={createNewOrder}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Orden
              </Button>
                </div>
          ) : (
            <div className="space-y-4">
              {getOrdersByStatus('resumen').map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.number}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Cliente: {order.customerName}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.name} x{item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                      <div className="border-t pt-2 font-semibold">
                        Total: ${order.total.toFixed(2)}
                </div>
              </div>

                    <div className="flex gap-2 mt-4">
                      {order.status === 'preparando' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'entregando')}
                        >
                          Marcar para Entregar
                        </Button>
                      )}
                      {order.status === 'entregando' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'cobrando')}
                        >
                          Marcar para Cobrar
                        </Button>
                      )}
                      {order.status === 'cobrando' && (
                        <Button 
                          size="sm" 
                          onClick={() => updateOrderStatus(order.id, 'pagado')}
                        >
                          Marcar como Pagado
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
                </div>
          )}
        </TabsContent>

        {['preparando', 'entregando', 'cobrando', 'pagado'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-6">
            {getOrdersByStatus(status).length === 0 ? (
              <div className="text-center py-12">
                {getStatusIcon(status)}
                <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">
                  No hay órdenes {status}
                </h3>
                <p className="text-muted-foreground">
                  Las órdenes aparecerán aquí cuando cambien a este estado
                </p>
                </div>
            ) : (
              <div className="space-y-4">
                {getOrdersByStatus(status).map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{order.number}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Cliente: {order.customerName}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.name} x{item.quantity}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 font-semibold">
                          Total: ${order.total.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        {order.status === 'preparando' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'entregando')}
                          >
                            Marcar para Entregar
                          </Button>
                        )}
                        {order.status === 'entregando' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'cobrando')}
                          >
                            Marcar para Cobrar
                          </Button>
                        )}
                        {order.status === 'cobrando' && (
                          <Button 
                            size="sm" 
                            onClick={() => updateOrderStatus(order.id, 'pagado')}
                          >
                            Marcar como Pagado
                          </Button>
                        )}
              </div>
            </CardContent>
          </Card>
                ))}
              </div>
            )}
        </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}