
-- Step 1: Renumber duplicate ORD-N rows per business (keep oldest by created_at, reassign newer ones to max+k)
DO $$
DECLARE
  r RECORD;
  next_n INT;
BEGIN
  FOR r IN
    SELECT id, business_id
    FROM (
      SELECT id, business_id, number, created_at,
             ROW_NUMBER() OVER (PARTITION BY business_id, number ORDER BY created_at, id) AS rn
      FROM public.orders
      WHERE number ~ '^ORD-[0-9]+$'
    ) s
    WHERE rn > 1
    ORDER BY business_id, created_at, id
  LOOP
    SELECT COALESCE(MAX((regexp_replace(number, '^ORD-', ''))::int), 0) + 1
      INTO next_n
      FROM public.orders
      WHERE business_id = r.business_id
        AND number ~ '^ORD-[0-9]+$';
    UPDATE public.orders SET number = 'ORD-' || next_n WHERE id = r.id;
  END LOOP;
END $$;

-- Step 2: Unique constraint on (business_id, number)
ALTER TABLE public.orders
  ADD CONSTRAINT orders_business_number_unique UNIQUE (business_id, number);

-- Step 3: Atomic next-order-number function with per-business advisory lock
CREATE OR REPLACE FUNCTION public.next_order_number(_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next int;
BEGIN
  -- Caller must be a member of the business
  IF NOT public.is_business_member(auth.uid(), _business_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Serialize concurrent number allocations for this business
  PERFORM pg_advisory_xact_lock(hashtextextended('order_number:' || _business_id::text, 0));

  SELECT COALESCE(MAX((regexp_replace(number, '^ORD-', ''))::int), 0) + 1
    INTO _next
    FROM public.orders
    WHERE business_id = _business_id
      AND number ~ '^ORD-[0-9]+$';

  RETURN 'ORD-' || _next;
END;
$$;

REVOKE ALL ON FUNCTION public.next_order_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_order_number(uuid) TO authenticated;
