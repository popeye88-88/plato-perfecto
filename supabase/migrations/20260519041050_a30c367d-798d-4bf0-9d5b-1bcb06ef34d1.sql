-- ============================================================
-- Consolidation migration: document missing schema + fix gaps
-- Safe to run against the existing populated database
-- ============================================================

-- ---------- 1. ENUM ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'manager');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- 2. TABLES ----------

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- businesses (UUID version currently in production)
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  enable_entregando_stage boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- business_members
CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- ---------- 3. FIX DUPLICATE COLUMN ----------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS enable_entregando_stage boolean DEFAULT true;

UPDATE public.businesses
  SET enable_entregando_stage = true
  WHERE enable_entregando_stage IS NULL;

-- ---------- 4. FUNCTIONS ----------

CREATE OR REPLACE FUNCTION public.is_business_member(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE user_id = _user_id AND business_id = _business_id
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
    SELECT 1 FROM public.business_members
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_in_business(_user_id uuid, _business_id uuid)
RETURNS public.app_role
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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff')
  )
$$;

-- ---------- 5. handle_new_user TRIGGER ----------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  -- Consume pending invitations matching this email
  INSERT INTO public.business_members (business_id, user_id, role)
  SELECT pi.business_id, NEW.id, pi.role
  FROM public.pending_invitations pi
  WHERE lower(pi.email) = lower(NEW.email)
    AND pi.accepted_at IS NULL
  ON CONFLICT (business_id, user_id) DO NOTHING;

  UPDATE public.pending_invitations
  SET accepted_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND accepted_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- 6. CLEAN PERMISSIVE LEGACY POLICIES ----------

DROP POLICY IF EXISTS "Enable all for authenticated" ON public.orders;
DROP POLICY IF EXISTS "Enable read for all" ON public.orders;
DROP POLICY IF EXISTS "orders_policy" ON public.orders;

DROP POLICY IF EXISTS "Enable all for authenticated" ON public.order_items;
DROP POLICY IF EXISTS "Enable read for all" ON public.order_items;
DROP POLICY IF EXISTS "order_items_policy" ON public.order_items;

DROP POLICY IF EXISTS "Enable all for authenticated" ON public.categories;
DROP POLICY IF EXISTS "Enable read for all" ON public.categories;

DROP POLICY IF EXISTS "Enable all for authenticated" ON public.menu_items;
DROP POLICY IF EXISTS "Enable read for all" ON public.menu_items;

-- Ensure RLS stays enabled on all touched tables
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items    ENABLE ROW LEVEL SECURITY;
