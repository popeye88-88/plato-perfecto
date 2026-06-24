
-- Performance indexes for active/historical order queries
CREATE INDEX IF NOT EXISTS orders_business_created_idx
  ON public.orders (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_business_status_idx
  ON public.orders (business_id, status);

CREATE INDEX IF NOT EXISTS orders_business_status_created_idx
  ON public.orders (business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON public.order_items (order_id);

-- Analytics RPC: aggregated metrics server-side
CREATE OR REPLACE FUNCTION public.orders_analytics(
  _business_id uuid,
  _start timestamptz,
  _end timestamptz
)
RETURNS TABLE (
  total_orders bigint,
  total_revenue numeric,
  avg_order numeric,
  paid_orders bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS total_orders,
    COALESCE(SUM(CASE WHEN status = 'pagado' THEN total ELSE 0 END), 0)::numeric AS total_revenue,
    COALESCE(AVG(CASE WHEN status = 'pagado' THEN total END), 0)::numeric AS avg_order,
    COUNT(*) FILTER (WHERE status = 'pagado')::bigint AS paid_orders
  FROM public.orders
  WHERE business_id = _business_id
    AND created_at >= _start
    AND created_at <= _end
    AND public.is_business_member(auth.uid(), _business_id);
$$;

REVOKE ALL ON FUNCTION public.orders_analytics(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orders_analytics(uuid, timestamptz, timestamptz) TO authenticated, service_role;

-- Revenue by day
CREATE OR REPLACE FUNCTION public.orders_revenue_by_day(
  _business_id uuid,
  _start timestamptz,
  _end timestamptz
)
RETURNS TABLE (
  day date,
  orders_count bigint,
  revenue numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*)::bigint AS orders_count,
    COALESCE(SUM(CASE WHEN status = 'pagado' THEN total ELSE 0 END), 0)::numeric AS revenue
  FROM public.orders
  WHERE business_id = _business_id
    AND created_at >= _start
    AND created_at <= _end
    AND public.is_business_member(auth.uid(), _business_id)
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

REVOKE ALL ON FUNCTION public.orders_revenue_by_day(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orders_revenue_by_day(uuid, timestamptz, timestamptz) TO authenticated, service_role;
