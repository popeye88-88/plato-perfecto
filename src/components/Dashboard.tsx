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
  paymentMethod: 'all' | 'efectivo' | 'tarjeta' | 'transferencia';
  serviceType: 'all' | 'puesto' | 'takeaway' | 'delivery';
  groupBy: 'day' | 'week' | 'month';
}

interface Product {
  name: string;
  sold: number;
  revenue: number;
}

interface OrderDetail {
  orderNumber: string;
  date: string;
  time: string;
  product: string;
  units: number;
  customerName: string;
  paymentMethod: string;
  unitPrice: number;
  totalPrice: number;
}

interface ChartData {
  name: string;
  facturacion: number;
  pedidos: number;
  puesto: number;
  takeaway: number;
  delivery: number;
}

const mockChartData: ChartData[] = [
  { name: 'Lun', facturacion: 450, pedidos: 18, puesto: 8, takeaway: 6, delivery: 4 },
  { name: 'Mar', facturacion: 380, pedidos: 15, puesto: 7, takeaway: 5, delivery: 3 },
  { name: 'Mié', facturacion: 520, pedidos: 22, puesto: 10, takeaway: 8, delivery: 4 },
  { name: 'Jue', facturacion: 670, pedidos: 28, puesto: 12, takeaway: 10, delivery: 6 },
  { name: 'Vie', facturacion: 890, pedidos: 35, puesto: 15, takeaway: 12, delivery: 8 },
  { name: 'Sáb', facturacion: 1200, pedidos: 48, puesto: 20, takeaway: 18, delivery: 10 },
  { name: 'Dom', facturacion: 950, pedidos: 38, puesto: 16, takeaway: 14, delivery: 8 },
];

const mockOrderDetails: OrderDetail[] = [
  { orderNumber: '001', date: '2024-01-15', time: '12:30', product: 'Pizza Margherita', units: 2, customerName: 'Juan Pérez', paymentMethod: 'efectivo', unitPrice: 15.00, totalPrice: 30.00 },
  { orderNumber: '001', date: '2024-01-15', time: '12:30', product: 'Coca Cola', units: 2, customerName: 'Juan Pérez', paymentMethod: 'efectivo', unitPrice: 2.50, totalPrice: 5.00 },
  { orderNumber: '002', date: '2024-01-15', time: '13:15', product: 'Hamburguesa Clásica', units: 1, customerName: 'María García', paymentMethod: 'tarjeta', unitPrice: 12.50, totalPrice: 12.50 },
  // Add more mock data as needed
];

export default function Dashboard() {
  const { currentBusiness } = useBusinessContext();
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 })
    },
    paymentMethod: 'all',
    serviceType: 'all',
    groupBy: 'day'
  });

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ChartData | null>(null);

  const updateFilter = <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Mock data - in real app this would be filtered based on the filters
  const stats = {
    facturacion: 4560,
    pedidos: 204,
    clientes: 187,
    ordenPromedio: 22.35
  };

  const topProducts: Product[] = [
    { name: 'Pizza Margherita', sold: 35, revenue: 525.00 },
    { name: 'Hamburguesa Clásica', sold: 28, revenue: 350.00 },
    { name: 'Pasta Carbonara', sold: 22, revenue: 308.00 },
    { name: 'Ensalada César', sold: 18, revenue: 171.00 },
    { name: 'Tacos de Pollo', sold: 15, revenue: 180.00 },
  ];

  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      const clickedData = mockChartData.find(item => item.name === data.activeLabel);
      if (clickedData) {
        setSelectedPeriod(data.activeLabel);
        setDetailData(clickedData);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Número Pedido', 'Fecha', 'Hora', 'Producto', 'Unidades', 'Cliente', 'Método Pago', 'Precio Unidad', 'Precio Total'];
    const csvContent = [
      headers.join(','),
      ...mockOrderDetails.map(row => [
        row.orderNumber,
        row.date,
        row.time,
        `"${row.product}"`,
        row.units,
        `"${row.customerName}"`,
        row.paymentMethod,
        row.unitPrice.toFixed(2),
        row.totalPrice.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <Building2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-foreground">
            Dashboard - {currentBusiness?.name || 'Sin negocio seleccionado'}
          </h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          Resumen del desempeño de {currentBusiness?.name || 'tu restaurante'}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filtros</CardTitle>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Período</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(filters.dateRange.from, "dd/MM", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => date && updateFilter('dateRange', { ...filters.dateRange, from: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(filters.dateRange.to, "dd/MM", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => date && updateFilter('dateRange', { ...filters.dateRange, to: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilter('dateRange', {
                    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
                    to: endOfWeek(new Date(), { weekStartsOn: 1 })
                  })}
                  className="text-xs"
                >
                  Esta semana
                </Button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select 
                value={filters.paymentMethod} 
                onValueChange={(value: typeof filters.paymentMethod) => updateFilter('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <Label>Tipo de Servicio</Label>
              <Select 
                value={filters.serviceType} 
                onValueChange={(value: typeof filters.serviceType) => updateFilter('serviceType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="puesto">En Puesto</SelectItem>
                  <SelectItem value="takeaway">Take Away</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group By */}
            <div className="space-y-2">
              <Label>Agrupar por</Label>
              <Select 
                value={filters.groupBy} 
                onValueChange={(value: typeof filters.groupBy) => updateFilter('groupBy', value)}
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
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Facturación
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              ${stats.facturacion.toLocaleString()}
            </div>
            <p className="text-xs text-success">
              +12% desde el período anterior
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {stats.pedidos}
            </div>
            <p className="text-xs text-success">
              +8% desde el período anterior
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {stats.clientes}
            </div>
            <p className="text-xs text-success">
              +15% desde el período anterior
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orden Promedio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              ${stats.ordenPromedio.toFixed(2)}
            </div>
            <p className="text-xs text-success">
              +5% desde el período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Combined Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Facturación y Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mockChartData} onClick={handleChartClick}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="fill-muted-foreground" />
                  <YAxis yAxisId="left" className="fill-muted-foreground" />
                  <YAxis yAxisId="right" orientation="right" className="fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar yAxisId="left" dataKey="puesto" stackId="orders" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar yAxisId="left" dataKey="takeaway" stackId="orders" fill="hsl(var(--accent))" radius={[0, 0, 0, 0]} />
                  <Bar yAxisId="left" dataKey="delivery" stackId="orders" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="facturacion" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-foreground text-sm">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.sold} vendidos</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground text-sm">${product.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Chart */}
      {selectedPeriod && detailData && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Detalle para {selectedPeriod}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[detailData]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="fill-muted-foreground" />
                  <YAxis className="fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="puesto" fill="hsl(var(--primary))" name="En Puesto" />
                  <Bar dataKey="takeaway" fill="hsl(var(--accent))" name="Take Away" />
                  <Bar dataKey="delivery" fill="hsl(var(--muted))" name="Delivery" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{detailData.puesto}</div>
                <div className="text-sm text-muted-foreground">En Puesto</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{detailData.takeaway}</div>
                <div className="text-sm text-muted-foreground">Take Away</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">{detailData.delivery}</div>
                <div className="text-sm text-muted-foreground">Delivery</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}