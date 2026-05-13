CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('preparando', 'entregando', 'cobrando', 'pagado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_type TEXT CHECK (service_type IN ('puesto', 'takeaway', 'delivery')),
  diners INTEGER,
  edited BOOLEAN NOT NULL DEFAULT false,
  discount_amount NUMERIC(10,2),
  discount_reason TEXT,
  payment_method TEXT CHECK (payment_method IN ('tarjeta', 'efectivo', 'transferencia')),
  initial_items JSONB,
  individual_items_status JSONB,
  edit_history JSONB
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('preparando', 'entregando', 'cobrando')) DEFAULT 'preparando',
  cancelled BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT,
  original_quantity INTEGER,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_in_stage TEXT CHECK (cancelled_in_stage IN ('preparando', 'entregando', 'cobrando')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_orders_business_id ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_items_updated_at ON public.order_items;
CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Members can view business orders" ON public.orders;
CREATE POLICY "Members can view business orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = orders.business_id
      AND bm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can create business orders" ON public.orders;
CREATE POLICY "Members can create business orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = orders.business_id
      AND bm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can update business orders" ON public.orders;
CREATE POLICY "Members can update business orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = orders.business_id
      AND bm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = orders.business_id
      AND bm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can delete business orders" ON public.orders;
CREATE POLICY "Members can delete business orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = orders.business_id
      AND bm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can view business order items" ON public.order_items;
CREATE POLICY "Members can view business order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.business_members bm ON bm.business_id = o.business_id
    WHERE o.id = order_items.order_id
      AND bm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can create business order items" ON public.order_items;
CREATE POLICY "Members can create business order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.business_members bm ON bm.business_id = o.business_id
    WHERE o.id = order_items.order_id
      AND bm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can update business order items" ON public.order_items;
CREATE POLICY "Members can update business order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.business_members bm ON bm.business_id = o.business_id
    WHERE o.id = order_items.order_id
      AND bm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.business_members bm ON bm.business_id = o.business_id
    WHERE o.id = order_items.order_id
      AND bm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can delete business order items" ON public.order_items;
CREATE POLICY "Members can delete business order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.business_members bm ON bm.business_id = o.business_id
    WHERE o.id = order_items.order_id
      AND bm.user_id = auth.uid()
  )
);