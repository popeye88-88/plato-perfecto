
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Mexico_City';

CREATE OR REPLACE FUNCTION public.orders_revenue_by_day(_business_id uuid, _start timestamp with time zone, _end timestamp with time zone, _tz text DEFAULT 'America/Mexico_City')
 RETURNS TABLE(day date, orders_count bigint, revenue numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (created_at AT TIME ZONE _tz)::date AS day,
    COUNT(*)::bigint AS orders_count,
    COALESCE(SUM(CASE WHEN status = 'pagado' THEN total ELSE 0 END), 0)::numeric AS revenue
  FROM public.orders
  WHERE business_id = _business_id
    AND created_at >= _start
    AND created_at <= _end
    AND public.is_business_member(auth.uid(), _business_id)
  GROUP BY 1
  ORDER BY 1 DESC;
$function$;
