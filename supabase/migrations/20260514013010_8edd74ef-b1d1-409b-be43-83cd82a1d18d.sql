
-- Add manager value to enum (idempotent)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';

-- Add email to profiles for member display
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Role history
CREATE TABLE IF NOT EXISTS public.role_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  target_user_id uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.role_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view role history of their business" ON public.role_history;
CREATE POLICY "Members can view role history of their business"
  ON public.role_history FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

DROP POLICY IF EXISTS "Admins and managers can insert role history" ON public.role_history;
CREATE POLICY "Admins and managers can insert role history"
  ON public.role_history FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_admin(auth.uid(), business_id)
    OR public.get_user_role_in_business(auth.uid(), business_id) = 'manager'
  );

CREATE INDEX IF NOT EXISTS idx_role_history_business ON public.role_history(business_id, created_at DESC);

-- Pending invitations
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  business_id uuid NOT NULL,
  role app_role NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(email, business_id)
);
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view invitations for their business" ON public.pending_invitations;
CREATE POLICY "Members can view invitations for their business"
  ON public.pending_invitations FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

DROP POLICY IF EXISTS "Admins and managers can insert invitations" ON public.pending_invitations;
CREATE POLICY "Admins and managers can insert invitations"
  ON public.pending_invitations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_admin(auth.uid(), business_id)
    OR public.get_user_role_in_business(auth.uid(), business_id) = 'manager'
  );

DROP POLICY IF EXISTS "Admins and managers can delete invitations" ON public.pending_invitations;
CREATE POLICY "Admins and managers can delete invitations"
  ON public.pending_invitations FOR DELETE TO authenticated
  USING (
    public.is_business_admin(auth.uid(), business_id)
    OR public.get_user_role_in_business(auth.uid(), business_id) = 'manager'
  );

CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON public.pending_invitations(lower(email));

-- Drop the auto-create-business trigger so onboarding handles it
DROP TRIGGER IF EXISTS on_auth_user_created_business ON auth.users;

-- Update handle_new_user to also store email and consume pending invitations
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
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

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

-- Backfill email on existing profiles where possible
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- business_members needs unique (business_id, user_id) for ON CONFLICT above
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_members_business_id_user_id_key'
  ) THEN
    ALTER TABLE public.business_members
      ADD CONSTRAINT business_members_business_id_user_id_key UNIQUE (business_id, user_id);
  END IF;
END $$;

-- Helper: lookup user id by email for invites (only callable by authenticated)
-- Returns user id even if not yet a member; safe because it only returns id, not other PII,
-- and is only useful in the invite flow gated by RLS on inserts.
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;
