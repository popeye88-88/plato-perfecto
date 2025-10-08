-- Create businesses table
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create business_members table (many-to-many relationship)
CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'staff',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Add business_id to existing tables
ALTER TABLE public.orders ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.order_edit_history ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_business_members_user_id ON public.business_members(user_id);
CREATE INDEX idx_business_members_business_id ON public.business_members(business_id);
CREATE INDEX idx_orders_business_id ON public.orders(business_id);
CREATE INDEX idx_order_items_business_id ON public.order_items(business_id);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Security definer functions for business access
CREATE OR REPLACE FUNCTION public.is_business_member(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE user_id = _user_id
      AND business_id = _business_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_in_business(_user_id uuid, _business_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.business_members
  WHERE user_id = _user_id
    AND business_id = _business_id
  LIMIT 1
$$;

-- Trigger to create business and assign admin role when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id uuid;
  business_name text;
BEGIN
  -- Get business name from metadata or use email
  business_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    'Negocio de ' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Create new business
  INSERT INTO public.businesses (name)
  VALUES (business_name)
  RETURNING id INTO new_business_id;
  
  -- Assign user as admin of the new business
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (new_business_id, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Update existing handle_new_user trigger to also create business
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_business
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_business();

-- RLS Policies for businesses
CREATE POLICY "Users can view businesses they are members of"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members
      WHERE business_members.business_id = businesses.id
        AND business_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their businesses"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (public.is_business_admin(auth.uid(), id));

-- RLS Policies for business_members
CREATE POLICY "Users can view members of their businesses"
  ON public.business_members
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Admins can add members to their businesses"
  ON public.business_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_admin(auth.uid(), business_id));

CREATE POLICY "Admins can update members in their businesses"
  ON public.business_members
  FOR UPDATE
  TO authenticated
  USING (public.is_business_admin(auth.uid(), business_id));

CREATE POLICY "Admins can remove members from their businesses"
  ON public.business_members
  FOR DELETE
  TO authenticated
  USING (public.is_business_admin(auth.uid(), business_id));

-- Update RLS policies for orders to filter by business
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can delete orders" ON public.orders;

CREATE POLICY "Business members can view their business orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can create orders for their business"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can update their business orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can delete their business orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

-- Update RLS policies for order_items
DROP POLICY IF EXISTS "Staff can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can delete order items" ON public.order_items;

CREATE POLICY "Business members can view their business order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can create order items for their business"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can update their business order items"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can delete their business order items"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

-- Update RLS policies for order_edit_history
DROP POLICY IF EXISTS "Staff can view order edit history" ON public.order_edit_history;
DROP POLICY IF EXISTS "Staff can create order edit history" ON public.order_edit_history;

CREATE POLICY "Business members can view their business order edit history"
  ON public.order_edit_history
  FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can create order edit history for their business"
  ON public.order_edit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_business_member(auth.uid(), business_id));

-- Update triggers for updated_at
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();