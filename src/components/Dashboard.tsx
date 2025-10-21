import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, DollarSign, ShoppingCart, Users, TrendingUp, Building2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { Download } from 'lucide-react';
import { useBusinessContext } from '@/contexts/BusinessContext';

interface DashboardFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  period: 'day' | 'week' | 'month';
}

// Mock data for demonstration
const mockOrders = [
  { orderNumber: '001', date: '2024-01-15', time: '12:30', product: 'Coca Cola', units: 2, customerName: 'Juan Pérez', paymentMethod: 'efectivo', unitPrice: 2.50, totalPrice: 5.00 },
  { orderNumber: '002', date: '2024-01-15', time: '13:15', product: 'Hamburguesa Clásica', units: 1, customerName: 'María García', paymentMethod: 'tarjeta', unitPrice: 12.50, totalPrice: 12.50 },
];

export default function Dashboard() {
  const { currentBusiness } = useBusinessContext();
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 })
    },
    period: 'week'
  });

  // Mock data processing
  const totalRevenue = mockOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const totalOrders = mockOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Mock chart data
  const chartData = [
    { name: 'Lun', orders: 12, revenue: 150 },
    { name: 'Mar', orders: 8, revenue: 120 },
    { name: 'Mié', orders: 15, revenue: 180 },
    { name: 'Jue', orders: 10, revenue: 140 },
    { name: 'Vie', orders: 20, revenue: 250 },
    { name: 'Sáb', orders: 18, revenue: 220 },
    { name: 'Dom', orders: 14, revenue: 170 },
  ];

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Fecha,Orden,Cliente,Producto,Unidades,Precio Unitario,Total,Método de Pago\n" +
      mockOrders.map(order => 
        `${order.date},${order.orderNumber},${order.customerName},${order.product},${order.units},${order.unitPrice},${order.totalPrice},${order.paymentMethod}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Dashboard - {currentBusiness?.name || 'Mi Restaurante'}
          </h1>
        </div>
        <p className="text-muted-foreground">
          Resumen del desempeño de {currentBusiness?.name || 'tu restaurante'}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filtros</CardTitle>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select
                value={filters.period}
                onValueChange={(value: 'day' | 'week' | 'month') =>
                  setFilters({ ...filters, period: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Día</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      format(filters.dateRange.from, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.from}
                    onSelect={(date) =>
                      date && setFilters({
                        ...filters,
                        dateRange: { ...filters.dateRange, from: date }
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.to ? (
                      format(filters.dateRange.to, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange.to}
                    onSelect={(date) =>
                      date && setFilters({
                        ...filters,
                        dateRange: { ...filters.dateRange, to: date }
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +12% desde la semana pasada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +8% desde la semana pasada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +5% desde la semana pasada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +3% desde la semana pasada
                </p>
              </CardContent>
            </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes por Día</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#8884d8" />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Día</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}