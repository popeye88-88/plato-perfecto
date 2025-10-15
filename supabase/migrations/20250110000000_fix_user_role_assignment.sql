-- Fix user role assignment to ensure new users get staff role
-- This migration updates the trigger to assign both business_members role and user_roles

-- Update the business creation trigger to also assign user_roles
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
  
  -- ALSO assign user as staff in user_roles table so they can access all features
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Add a policy to allow users to create their own staff role during signup
CREATE POLICY "Users can create their own staff role during signup"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'staff');

-- Update the existing trigger to use the updated function
DROP TRIGGER IF EXISTS on_auth_user_created_business ON auth.users;
CREATE TRIGGER on_auth_user_created_business
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_business();
