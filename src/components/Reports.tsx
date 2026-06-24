import { useEffect, useState, useCallback } from 'react';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { fetchAnalyticsOrders } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type OrderRow = Awaited<ReturnType<typeof fetchAnalyticsOrders>>['orders'][number];

const PAGE_SIZE = 100;

const todayISO = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const fmtMoney = (n: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n || 0);

export default function Reports() {
  const { currentBusiness } = useBusinessContext();
  const { toast } = useToast();
  const currency = currentBusiness?.currency || 'MXN';

  const [dateFrom, setDateFrom] = useState(todayISO(-6));
  const [dateTo, setDateTo] = useState(todayISO(0));
  const [statusFilter, setStatusFilter] = useState<'all' | 'pagado' | 'preparando' | 'entregando' | 'cobrando'>('all');
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);

  const [metrics, setMetrics] = useState<{ totalOrders: number; totalRevenue: number; avgOrder: number; paidOrders: number } | null>(null);
  const [revenueByDay, setRevenueByDay] = useState<Array<{ day: string; orders_count: number; revenue: number }>>([]);
  const [exporting, setExporting] = useState(false);

  const startDate = new Date(dateFrom + 'T00:00:00');
  const endDate = new Date(dateTo + 'T23:59:59');

  const load = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const statusList = statusFilter === 'all' ? undefined : [statusFilter];
      const [{ orders: list, total: t }] = await Promise.all([
        fetchAnalyticsOrders(currentBusiness.id, {
          startDate,
          endDate,
          status: statusList,
          page,
          pageSize: PAGE_SIZE,
        }),
      ]);
      setOrders(list);
      setTotal(t || 0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, dateFrom, dateTo, statusFilter, page]);

  const loadMetrics = useCallback(async () => {
    if (!currentBusiness?.id) return;
    const [m, d] = await Promise.all([
      supabase.rpc('orders_analytics', {
        _business_id: currentBusiness.id,
        _start: startDate.toISOString(),
        _end: endDate.toISOString(),
      }),
      supabase.rpc('orders_revenue_by_day', {
        _business_id: currentBusiness.id,
        _start: startDate.toISOString(),
        _end: endDate.toISOString(),
      }),
    ]);
    if (!m.error && m.data && m.data[0]) {
      const row = m.data[0] as { total_orders: number; total_revenue: number; avg_order: number; paid_orders: number };
      setMetrics({
        totalOrders: Number(row.total_orders) || 0,
        totalRevenue: Number(row.total_revenue) || 0,
        avgOrder: Number(row.avg_order) || 0,
        paidOrders: Number(row.paid_orders) || 0,
      });
    } else {
      setMetrics({ totalOrders: 0, totalRevenue: 0, avgOrder: 0, paidOrders: 0 });
    }
    if (!d.error && d.data) {
      setRevenueByDay(d.data as Array<{ day: string; orders_count: number; revenue: number }>);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id, dateFrom, dateTo]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [dateFrom, dateTo, statusFilter, currentBusiness?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const exportCsv = async () => {
    if (!currentBusiness?.id) return;
    setExporting(true);
    try {
      const all: OrderRow[] = [];
      const statusList = statusFilter === 'all' ? undefined : [statusFilter];
      let p = 0;
      // Stream pages until exhausted
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { orders: chunk } = await fetchAnalyticsOrders(currentBusiness.id, {
          startDate,
          endDate,
          status: statusList,
          page: p,
          pageSize: 500,
        });
        if (!chunk.length) break;
        all.push(...chunk);
        if (chunk.length < 500) break;
        p++;
      }
      const headers = ['Numero', 'Fecha', 'Cliente', 'Comensales', 'Servicio', 'Items', 'Total', 'Metodo de pago', 'Estado'];
      const rows = all.map(o => [
        o.number,
        o.createdAt.toISOString(),
        o.customerName || '',
        o.diners ?? '',
        o.serviceType || '',
        o.items.filter(i => !i.cancelled).map(i => `${i.quantity}x ${i.name}`).join(' | '),
        o.total.toFixed(2),
        o.paymentMethod || '',
        o.status,
      ]);
      const csv = [headers, ...rows]
        .map(r => r.map(c => {
          const s = String(c ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(','))
        .join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reportes_${dateFrom}_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'CSV exportado', description: `${all.length} órdenes` });
    } catch (e) {
      console.error('CSV export error:', e);
      toast({ title: 'Error al exportar', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <Button onClick={exportCsv} disabled={exporting} variant="outline">
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={statusFilter} onValueChange={(v: typeof statusFilter) => setStatusFilter(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pagado">Pagadas</SelectItem>
                  <SelectItem value="preparando">Preparando</SelectItem>
                  <SelectItem value="entregando">Entregando</SelectItem>
                  <SelectItem value="cobrando">Cobrando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setDateFrom(todayISO(-6)); setDateTo(todayISO(0)); setStatusFilter('all'); }}>
                Restablecer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total órdenes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.totalOrders ?? '—'}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Órdenes pagadas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.paidOrders ?? '—'}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Ingresos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{metrics ? fmtMoney(metrics.totalRevenue, currency) : '—'}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Promedio por orden</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{metrics ? fmtMoney(metrics.avgOrder, currency) : '—'}</div></CardContent></Card>
      </div>

      {/* Revenue by day */}
      {revenueByDay.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Ingresos por día</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {revenueByDay.map((r) => {
                const max = Math.max(...revenueByDay.map(x => Number(x.revenue) || 0), 1);
                const pct = (Number(r.revenue) / max) * 100;
                return (
                  <div key={r.day} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-muted-foreground tabular-nums">{r.day}</span>
                    <div className="flex-1 bg-muted h-2 rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-28 text-right tabular-nums">{fmtMoney(Number(r.revenue), currency)}</span>
                    <span className="w-16 text-right text-muted-foreground tabular-nums">{r.orders_count} ord.</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Órdenes ({total})</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages || loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando…
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No hay órdenes en el rango</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Comensales</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono">{o.number}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{o.createdAt.toLocaleString()}</TableCell>
                      <TableCell>{o.customerName || '—'}</TableCell>
                      <TableCell className="text-right">{o.diners ?? '—'}</TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                        {o.items.filter(i => !i.cancelled).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(o.total, currency)}</TableCell>
                      <TableCell className="text-xs">{o.paymentMethod || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === 'pagado' ? 'default' : 'secondary'}>{o.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
