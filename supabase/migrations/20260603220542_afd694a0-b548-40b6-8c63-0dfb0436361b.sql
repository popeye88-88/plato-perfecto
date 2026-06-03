DROP POLICY IF EXISTS "Admins and managers can delete business order items" ON public.order_items;
CREATE POLICY "Members can delete business order items"
ON public.order_items FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM orders o
  JOIN business_members bm ON bm.business_id = o.business_id
  WHERE o.id = order_items.order_id AND bm.user_id = auth.uid()
));