import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, DollarSign, ShoppingCart, Users, TrendingUp, Building2, Download, Loader2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfISOWeek, startOfMonth, differenceInMilliseconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from 'recharts';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { fetchOrders } from '@/lib/supabase';

interface DashboardFilters {
  dateRange: { from: Date; to: Date };
  paymentMethod: 'all' | 'efectivo' | 'tarjeta' | 'transferencia';
  serviceType: 'all' | 'puesto' | 'takeaway' | 'delivery';
  groupBy: 'day' | 'week' | 'month';
}

interface ChartData {
  name: string;
  facturacion: number;
  pedidos: number;
  puesto: number;
  takeaway: number;
  delivery: number;
}

type OrderType = Awaited<ReturnType<typeof fetchOrders>>[number];

function bucketKey(date: Date, groupBy: 'day' | 'week' | 'month'): { key: string; label: string; sortDate: Date } {
  if (groupBy === 'day') {
    const d = startOfDay(date);
    return { key: d.toISOString(), label: format(d, 'dd/MM'), sortDate: d };
  }
  if (groupBy === 'week') {
    const d = startOfISOWeek(date);
    return { key: d.toISOString(), label: `Sem ${format(d, 'dd/MM')}`, sortDate: d };
  }
  const d = startOfMonth(date);
  return { key: d.toISOString(), label: format(d, 'MMM yyyy', { locale: es }), sortDate: d };
}

function computeStats(list: OrderType[]) {
  const paid = list.filter(o => o.status === 'pagado');
  const facturacion = paid.reduce((s, o) => s + (o.total || 0), 0);
  const pedidos = paid.length;
  const customers = new Set(paid.map(o => (o.customerName || '').trim().toLowerCase()).filter(Boolean));
  const ordenPromedio = pedidos > 0 ? facturacion / pedidos : 0;
  return { facturacion, pedidos, clientes: customers.size, ordenPromedio };
}

function pctDiff(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? '0%' : '+100%';
  const diff = ((current - previous) / previous) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(0)}%`;
}

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

  const [allOrders, setAllOrders] = useState<OrderType[]>([]);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [previousOrders, setPreviousOrders] = useState<OrderType[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ChartData | null>(null);

  const updateFilter = <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!currentBusiness) {
        setDataLoading(false);
        setAllOrders([]);
        return;
      }
      setDataLoading(true);
      try {
        const data = await fetchOrders(currentBusiness.id);
        if (!cancelled) setAllOrders(data as OrderType[]);
      } catch (e) {
        console.error('Dashboard load error:', e);
        if (!cancelled) setAllOrders([]);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentBusiness]);

  useEffect(() => {
    const from = startOfDay(filters.dateRange.from);
    const to = endOfDay(filters.dateRange.to);
    const inRange = allOrders.filter(o => o.createdAt >= from && o.createdAt <= to);
    setOrders(inRange);

    const duration = differenceInMilliseconds(to, from);
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - duration);
    const prev = allOrders.filter(o => o.createdAt >= prevFrom && o.createdAt <= prevTo);
    setPreviousOrders(prev);
  }, [allOrders, filters.dateRange]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filters.paymentMethod !== 'all' && o.paymentMethod !== filters.paymentMethod) return false;
      if (filters.serviceType !== 'all' && o.serviceType !== filters.serviceType) return false;
      return true;
    });
  }, [orders, filters.paymentMethod, filters.serviceType]);

  const filteredPrevious = useMemo(() => {
    return previousOrders.filter(o => {
      if (filters.paymentMethod !== 'all' && o.paymentMethod !== filters.paymentMethod) return false;
      if (filters.serviceType !== 'all' && o.serviceType !== filters.serviceType) return false;
      return true;
    });
  }, [previousOrders, filters.paymentMethod, filters.serviceType]);

  const stats = useMemo(() => computeStats(filteredOrders), [filteredOrders]);
  const prevStats = useMemo(() => computeStats(filteredPrevious), [filteredPrevious]);
  const hasPrevious = filteredPrevious.length > 0;

  const chartData = useMemo<ChartData[]>(() => {
    const paid = filteredOrders.filter(o => o.status === 'pagado');
    const buckets = new Map<string, ChartData & { sortDate: Date }>();
    for (const o of paid) {
      const { key, label, sortDate } = bucketKey(o.createdAt, filters.groupBy);
      const existing = buckets.get(key) || {
        name: label, facturacion: 0, pedidos: 0, puesto: 0, takeaway: 0, delivery: 0, sortDate
      };
      existing.facturacion += o.total || 0;
      existing.pedidos += 1;
      if (o.serviceType === 'puesto') existing.puesto += 1;
      else if (o.serviceType === 'takeaway') existing.takeaway += 1;
      else if (o.serviceType === 'delivery') existing.delivery += 1;
      buckets.set(key, existing);
    }
    return Array.from(buckets.values())
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
      .map(({ sortDate, ...rest }) => rest);
  }, [filteredOrders, filters.groupBy]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; sold: number; revenue: number }>();
    const paid = filteredOrders.filter(o => o.status === 'pagado');
    for (const o of paid) {
      for (const it of o.items || []) {
        if (it.cancelled) continue;
        const existing = map.get(it.name) || { name: it.name, sold: 0, revenue: 0 };
        existing.sold += it.quantity;
        existing.revenue += it.price * it.quantity;
        map.set(it.name, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredOrders]);

  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      const clickedData = chartData.find(item => item.name === data.activeLabel);
      if (clickedData) {
        setSelectedPeriod(data.activeLabel);
        setDetailData(clickedData);
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Número Pedido', 'Fecha', 'Hora', 'Producto', 'Unidades', 'Cliente', 'Método Pago', 'Precio Unidad', 'Precio Total'];
    const rows: string[] = [headers.join(',')];
    for (const o of filteredOrders) {
      for (const it of o.items || []) {
        if (it.cancelled) continue;
        rows.push([
          o.number,
          format(o.createdAt, 'yyyy-MM-dd'),
          format(o.createdAt, 'HH:mm'),
          `"${it.name.replace(/"/g, '""')}"`,
          it.quantity,
          `"${(o.customerName || '').replace(/"/g, '""')}"`,
          o.paymentMethod || '',
          it.price.toFixed(2),
          (it.price * it.quantity).toFixed(2)
        ].join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isEmpty = !dataLoading && filteredOrders.length === 0;

  const renderTrend = (current: number, previous: number) => {
    if (!hasPrevious) return <p className="text-xs text-muted-foreground">Sin datos anteriores</p>;
    const diff = current - previous;
    const cls = diff >= 0 ? 'text-success' : 'text-destructive';
    return <p className={`text-xs ${cls}`}>{pctDiff(current, previous)} desde el período anterior</p>;
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
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={dataLoading || isEmpty}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={filters.paymentMethod} onValueChange={(v: typeof filters.paymentMethod) => updateFilter('paymentMethod', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Servicio</Label>
              <Select value={filters.serviceType} onValueChange={(v: typeof filters.serviceType) => updateFilter('serviceType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="puesto">En Puesto</SelectItem>
                  <SelectItem value="takeaway">Take Away</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Agrupar por</Label>
              <Select value={filters.groupBy} onValueChange={(v: typeof filters.groupBy) => updateFilter('groupBy', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
        {[
          { title: 'Facturación', icon: DollarSign, value: `$${stats.facturacion.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, current: stats.facturacion, previous: prevStats.facturacion },
          { title: 'Pedidos', icon: ShoppingCart, value: `${stats.pedidos}`, current: stats.pedidos, previous: prevStats.pedidos },
          { title: 'Clientes', icon: Users, value: `${stats.clientes}`, current: stats.clientes, previous: prevStats.clientes },
          { title: 'Orden Promedio', icon: TrendingUp, value: `$${stats.ordenPromedio.toFixed(2)}`, current: stats.ordenPromedio, previous: prevStats.ordenPromedio },
        ].map((s) => (
          <Card key={s.title} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <Skeleton className="h-8 w-24 mb-1" />
              ) : (
                <div className="text-2xl font-bold text-foreground mb-1">{s.value}</div>
              )}
              {!dataLoading && renderTrend(s.current, s.previous)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Combined Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Facturación y Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {dataLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No hay datos para el período seleccionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="fill-muted-foreground" />
                    <YAxis yAxisId="left" className="fill-muted-foreground" />
                    <YAxis yAxisId="right" orientation="right" className="fill-muted-foreground" />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Bar yAxisId="left" dataKey="puesto" stackId="orders" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                    <Bar yAxisId="left" dataKey="takeaway" stackId="orders" fill="hsl(var(--accent))" radius={[0, 0, 0, 0]} />
                    <Bar yAxisId="left" dataKey="delivery" stackId="orders" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="facturacion" stroke="hsl(var(--destructive))" strokeWidth={3} dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2, r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top 5 Productos</CardTitle></CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">Sin ventas en este período</div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Chart */}
      {selectedPeriod && detailData && (
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Detalle para {selectedPeriod}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[detailData]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="fill-muted-foreground" />
                  <YAxis className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
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
