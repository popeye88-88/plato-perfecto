import { useCallback, useEffect, useState } from 'react';
import { useBusinessContext } from '@/contexts/BusinessContext';
import { fetchAnalyticsOrders } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_TZ, formatInTz, startOfDayInTz, endOfDayInTz } from '@/lib/timezone';

type OrderRow = Awaited<ReturnType<typeof fetchAnalyticsOrders>>['orders'][number];

const PAGE_SIZE = 50;

const fmtMoney = (n: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n || 0);

/** Órdenes cobradas (pagadas) de los últimos 7 días, vista tipo Reportes. */
export default function PaidOrdersTable() {
  const { currentBusiness } = useBusinessContext();
  const currency = currentBusiness?.currency || 'MXN';
  const tz = currentBusiness?.timezone || DEFAULT_TZ;

  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (!currentBusiness?.id) return;
    const from = new Date();
    from.setDate(from.getDate() - 6);
    const startDate = startOfDayInTz(from, tz);
    const endDate = endOfDayInTz(new Date(), tz);
    setLoading(true);
    try {
      const { orders: list, total: t } = await fetchAnalyticsOrders(currentBusiness.id, {
        startDate,
        endDate,
        status: ['pagado'],
        page,
        pageSize: PAGE_SIZE,
      });
      setOrders(list);
      setTotal(t || 0);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, tz, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Cobradas últimos 7 días ({total})</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">{page + 1} / {totalPages}</span>
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
          <div className="py-8 text-center text-muted-foreground">No hay órdenes cobradas en los últimos 7 días</div>
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
                    <TableCell className="whitespace-nowrap text-xs">{formatInTz(o.createdAt, tz)}</TableCell>
                    <TableCell>{o.customerName || '—'}</TableCell>
                    <TableCell className="text-right">{o.diners ?? '—'}</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                      {o.items.filter(i => !i.cancelled).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(o.total, currency)}</TableCell>
                    <TableCell className="text-xs">{o.paymentMethod || '—'}</TableCell>
                    <TableCell><Badge>{o.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
