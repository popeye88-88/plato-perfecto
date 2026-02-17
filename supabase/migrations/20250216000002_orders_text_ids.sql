-- Allow TEXT ids for orders and order_items (app uses string ids)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_edit_history') THEN
    ALTER TABLE public.order_edit_history DROP CONSTRAINT IF EXISTS order_edit_history_order_id_fkey;
  END IF;
  ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
  ALTER TABLE public.orders ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.order_items ALTER COLUMN id TYPE TEXT USING id::text;
  ALTER TABLE public.order_items ALTER COLUMN order_id TYPE TEXT USING order_id::text;
  ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_edit_history') THEN
    ALTER TABLE public.order_edit_history ALTER COLUMN order_id TYPE TEXT USING order_id::text;
    ALTER TABLE public.order_edit_history ADD CONSTRAINT order_edit_history_order_id_fkey 
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;
