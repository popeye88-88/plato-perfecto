-- Fix all RLS policies by converting from RESTRICTIVE to PERMISSIVE (default)
-- By recreating policies without AS RESTRICTIVE, they default to PERMISSIVE
-- PERMISSIVE policies use OR logic and are the sole source of access grants

-- ===== ORDERS TABLE =====
DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
DROP POLICY IF EXISTS "Staff can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;
DROP POLICY IF EXISTS "Staff can delete orders" ON orders;

CREATE POLICY "Staff can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- ===== ORDER_ITEMS TABLE =====
DROP POLICY IF EXISTS "Staff can view order items" ON order_items;
DROP POLICY IF EXISTS "Staff can create order items" ON order_items;
DROP POLICY IF EXISTS "Staff can update order items" ON order_items;
DROP POLICY IF EXISTS "Staff can delete order items" ON order_items;

CREATE POLICY "Staff can view order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create order items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update order items"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete order items"
  ON order_items
  FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- ===== ORDER_EDIT_HISTORY TABLE =====
DROP POLICY IF EXISTS "Staff can view order edit history" ON order_edit_history;
DROP POLICY IF EXISTS "Staff can create order edit history" ON order_edit_history;

CREATE POLICY "Staff can view order edit history"
  ON order_edit_history
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create order edit history"
  ON order_edit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- ===== PROFILES TABLE =====
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ===== USER_ROLES TABLE =====
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can create roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));