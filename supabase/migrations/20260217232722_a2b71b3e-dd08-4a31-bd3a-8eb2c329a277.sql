
-- Create businesses table
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create business_members table
CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'staff',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- RLS for businesses
CREATE POLICY "Business members can view their businesses"
  ON public.businesses FOR SELECT TO authenticated
  USING (is_business_member(auth.uid(), id));

CREATE POLICY "Business admins can update their businesses"
  ON public.businesses FOR UPDATE TO authenticated
  USING (is_business_admin(auth.uid(), id));

CREATE POLICY "Business admins can delete their businesses"
  ON public.businesses FOR DELETE TO authenticated
  USING (is_business_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can create businesses"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS for business_members
CREATE POLICY "Business members can view members"
  ON public.business_members FOR SELECT TO authenticated
  USING (is_business_member(auth.uid(), business_id) OR user_id = auth.uid());

CREATE POLICY "Business admins can add members"
  ON public.business_members FOR INSERT TO authenticated
  WITH CHECK (is_business_admin(auth.uid(), business_id));

CREATE POLICY "Business admins can update members"
  ON public.business_members FOR UPDATE TO authenticated
  USING (is_business_admin(auth.uid(), business_id));

CREATE POLICY "Business admins can delete members"
  ON public.business_members FOR DELETE TO authenticated
  USING (is_business_admin(auth.uid(), business_id));

-- Updated_at trigger for businesses
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
