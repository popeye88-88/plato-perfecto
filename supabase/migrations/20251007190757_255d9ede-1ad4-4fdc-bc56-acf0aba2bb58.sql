-- Drop all existing public policies
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON orders;
DROP POLICY IF EXISTS "Orders can be created by everyone" ON orders;
DROP POLICY IF EXISTS "Orders can be updated by everyone" ON orders;
DROP POLICY IF EXISTS "Orders can be deleted by everyone" ON orders;

DROP POLICY IF EXISTS "Order items are viewable by everyone" ON order_items;
DROP POLICY IF EXISTS "Order items can be created by everyone" ON order_items;
DROP POLICY IF EXISTS "Order items can be updated by everyone" ON order_items;
DROP POLICY IF EXISTS "Order items can be deleted by everyone" ON order_items;

DROP POLICY IF EXISTS "Order edit history is viewable by everyone" ON order_edit_history;
DROP POLICY IF EXISTS "Order edit history can be created by everyone" ON order_edit_history;

-- Create secure policies that require authentication
-- Orders policies: Only authenticated users (staff) can access
CREATE POLICY "Authenticated users can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (true);

-- Order items policies: Only authenticated users can access
CREATE POLICY "Authenticated users can view order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order items"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete order items"
  ON order_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Order edit history policies: Only authenticated users can access audit logs
CREATE POLICY "Authenticated users can view order edit history"
  ON order_edit_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order edit history"
  ON order_edit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);