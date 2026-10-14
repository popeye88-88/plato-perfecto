-- Ticket promedio y ticket promedio por comensal (agregado del rango)
CREATE OR REPLACE FUNCTION public.orders_ticket_metrics(
  _business_id uuid,
  _start timestamptz,
  _end timestamptz
)
RETURNS TABLE (
  avg_ticket numeric,
  avg_ticket_per_diner numeric,
  onsite_revenue numeric,
  onsite_diners bigint,
  onsite_orders bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(AVG(total) FILTER (WHERE status = 'pagado'), 0)::numeric AS avg_ticket,
    COALESCE(
      SUM(total) FILTER (WHERE status = 'pagado' AND service_type = 'puesto')
      / NULLIF(SUM(diners) FILTER (WHERE status = 'pagado' AND service_type = 'puesto'), 0)
    , 0)::numeric AS avg_ticket_per_diner,
    COALESCE(SUM(total) FILTER (WHERE status = 'pagado' AND service_type = 'puesto'), 0)::numeric AS onsite_revenue,
    COALESCE(SUM(diners) FILTER (WHERE status = 'pagado' AND service_type = 'puesto'), 0)::bigint AS onsite_diners,
    COUNT(*) FILTER (WHERE status = 'pagado' AND service_type = 'puesto')::bigint AS onsite_orders
  FROM public.orders
  WHERE business_id = _business_id
    AND created_at >= _start
    AND created_at <= _end
    AND public.is_business_member(auth.uid(), _business_id);
$$;

REVOKE ALL ON FUNCTION public.orders_ticket_metrics(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orders_ticket_metrics(uuid, timestamptz, timestamptz) TO authenticated, service_role;

-- Ticket promedio por día (bucket por zona horaria del negocio)
CREATE OR REPLACE FUNCTION public.orders_ticket_by_day(
  _business_id uuid,
  _start timestamptz,
  _end timestamptz,
  _tz text DEFAULT 'America/Mexico_City'
)
RETURNS TABLE (
  day date,
  avg_ticket numeric,
  avg_ticket_per_diner numeric,
  onsite_revenue numeric,
  onsite_diners bigint,
  onsite_orders bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (created_at AT TIME ZONE _tz)::date AS day,
    COALESCE(AVG(total) FILTER (WHERE status = 'pagado'), 0)::numeric AS avg_ticket,
    COALESCE(
      SUM(total) FILTER (WHERE status = 'pagado' AND service_type = 'puesto')
      / NULLIF(SUM(diners) FILTER (WHERE status = 'pagado' AND service_type = 'puesto'), 0)
    , 0)::numeric AS avg_ticket_per_diner,
    COALESCE(SUM(total) FILTER (WHERE status = 'pagado' AND service_type = 'puesto'), 0)::numeric AS onsite_revenue,
    COALESCE(SUM(diners) FILTER (WHERE status = 'pagado' AND service_type = 'puesto'), 0)::bigint AS onsite_diners,
    COUNT(*) FILTER (WHERE status = 'pagado' AND service_type = 'puesto')::bigint AS onsite_orders
  FROM public.orders
  WHERE business_id = _business_id
    AND created_at >= _start
    AND created_at <= _end
    AND public.is_business_member(auth.uid(), _business_id)
  GROUP BY 1
  ORDER BY 1 DESC;
$$;

REVOKE ALL ON FUNCTION public.orders_ticket_by_day(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.orders_ticket_by_day(uuid, timestamptz, timestamptz, text) TO authenticated, service_role;
