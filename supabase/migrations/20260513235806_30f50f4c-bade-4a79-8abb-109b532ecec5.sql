-- Restrict DELETE on orders to admin/manager only
DROP POLICY IF EXISTS "Members can delete business orders" ON public.orders;
CREATE POLICY "Admins and managers can delete business orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = orders.business_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  )
);

-- Restrict DELETE on order_items to admin/manager only
DROP POLICY IF EXISTS "Members can delete business order items" ON public.order_items;
CREATE POLICY "Admins and managers can delete business order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.business_members bm ON bm.business_id = o.business_id
    WHERE o.id = order_items.order_id
      AND bm.user_id = auth.uid()
      AND bm.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  )
);