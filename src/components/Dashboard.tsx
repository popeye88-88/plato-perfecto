import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  // Datos de ejemplo para el dashboard
  const stats = [
    {
      title: "Ventas Hoy",
      value: "$1,250.00",
      change: "+12%",
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Órdenes Hoy",
      value: "45",
      change: "+8%",
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      title: "Clientes",
      value: "32",
      change: "+5%",
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Crecimiento",
      value: "15%",
      change: "+3%",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Resumen de tu restaurante
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> desde ayer
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ORD-001</p>
                  <p className="text-sm text-muted-foreground">Pizza Margherita</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$15.00</p>
                  <p className="text-sm text-muted-foreground">Hace 5 min</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ORD-002</p>
                  <p className="text-sm text-muted-foreground">Hamburguesa Clásica</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$12.50</p>
                  <p className="text-sm text-muted-foreground">Hace 12 min</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ORD-003</p>
                  <p className="text-sm text-muted-foreground">Pasta Carbonara</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$14.00</p>
                  <p className="text-sm text-muted-foreground">Hace 18 min</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos Populares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Pizza Margherita</p>
                  <p className="text-sm text-muted-foreground">15 vendidos</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$225.00</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Hamburguesa Clásica</p>
                  <p className="text-sm text-muted-foreground">12 vendidos</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$150.00</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Pasta Carbonara</p>
                  <p className="text-sm text-muted-foreground">8 vendidos</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">$112.00</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-medium">Nueva Orden</h3>
              <p className="text-sm text-muted-foreground">Crear orden rápidamente</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-medium">Gestión de Clientes</h3>
              <p className="text-sm text-muted-foreground">Administrar clientes</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-medium">Reportes</h3>
              <p className="text-sm text-muted-foreground">Ver estadísticas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}