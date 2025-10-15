import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { useBusiness } from '@/lib/business-context';

export default function Dashboard() {
  const { selectedBusiness } = useBusiness();
  const stats = [
    {
      title: 'Ventas Hoy',
      value: '$2,850',
      change: '+12%',
      icon: DollarSign,
      trend: 'up',
    },
    {
      title: 'Órdenes Activas',
      value: '23',
      change: '+3',
      icon: ShoppingCart,
      trend: 'up',
    },
    {
      title: 'Clientes Atendidos',
      value: '187',
      change: '+18%',
      icon: Users,
      trend: 'up',
    },
    {
      title: 'Promedio por Orden',
      value: '$45.30',
      change: '+8%',
      icon: TrendingUp,
      trend: 'up',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">{selectedBusiness ? `Resumen del día de ${selectedBusiness.name}` : 'Selecciona un negocio'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-success">
                  {stat.change} desde ayer
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: '#001', time: '14:30', total: '$28.50', status: 'Preparando' },
                { id: '#002', time: '14:25', total: '$42.00', status: 'Listo' },
                { id: '#003', time: '14:20', total: '$35.75', status: 'Entregado' },
              ].map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="font-medium text-foreground">Orden {order.id}</div>
                    <div className="text-sm text-muted-foreground">{order.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">{order.total}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'Listo' 
                        ? 'bg-success/10 text-success' 
                        : order.status === 'Preparando'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Pizza Margherita', sold: 15, revenue: '$225.00' },
                { name: 'Hamburguesa Clásica', sold: 12, revenue: '$180.00' },
                { name: 'Pasta Carbonara', sold: 8, revenue: '$120.00' },
              ].map((product) => (
                <div key={product.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="font-medium text-foreground">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.sold} vendidos</div>
                  </div>
                  <div className="font-medium text-foreground">{product.revenue}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}