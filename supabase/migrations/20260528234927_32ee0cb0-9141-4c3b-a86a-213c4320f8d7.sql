
-- Add invitation code support to pending_invitations
ALTER TABLE public.pending_invitations
  ADD COLUMN IF NOT EXISTS code text UNIQUE,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

ALTER TABLE public.pending_invitations
  ALTER COLUMN email DROP NOT NULL;

-- Ensure either email or code is present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pending_invitations_email_or_code_chk'
  ) THEN
    ALTER TABLE public.pending_invitations
      ADD CONSTRAINT pending_invitations_email_or_code_chk
      CHECK (email IS NOT NULL OR code IS NOT NULL);
  END IF;
END $$;

-- Public lookup of invitation by code (for showing business name on signup page)
CREATE OR REPLACE FUNCTION public.lookup_invitation_by_code(_code text)
RETURNS TABLE (business_id uuid, business_name text, role app_role, expired boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pi.business_id,
         b.name AS business_name,
         pi.role,
         (pi.expires_at IS NOT NULL AND pi.expires_at < now()) AS expired
  FROM public.pending_invitations pi
  JOIN public.businesses b ON b.id = pi.business_id
  WHERE pi.code = _code
    AND pi.accepted_at IS NULL
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.lookup_invitation_by_code(text) TO anon, authenticated;

-- Update handle_new_user to also consume invitation by code in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _code text;
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

  -- Consume invitation by shareable code passed in signup metadata
  _code := NEW.raw_user_meta_data->>'invitation_code';
  IF _code IS NOT NULL AND length(_code) > 0 THEN
    INSERT INTO public.business_members (business_id, user_id, role)
    SELECT pi.business_id, NEW.id, pi.role
    FROM public.pending_invitations pi
    WHERE pi.code = _code
      AND pi.accepted_at IS NULL
      AND (pi.expires_at IS NULL OR pi.expires_at > now())
    ON CONFLICT (business_id, user_id) DO NOTHING;

    UPDATE public.pending_invitations
    SET accepted_at = now()
    WHERE code = _code
      AND accepted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update handle_new_user_business to skip auto-business creation when user joined via invitation
CREATE OR REPLACE FUNCTION public.handle_new_user_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_business_id uuid;
  business_name text;
  _code text;
  _has_invite boolean;
BEGIN
  _code := NEW.raw_user_meta_data->>'invitation_code';

  SELECT EXISTS (
    SELECT 1 FROM public.pending_invitations pi
    WHERE (pi.code = _code AND _code IS NOT NULL)
       OR lower(pi.email) = lower(NEW.email)
  ) INTO _has_invite;

  IF _has_invite THEN
    -- User is joining an existing business via invitation; skip creating a new business
    RETURN NEW;
  END IF;

  business_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    'Negocio de ' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  INSERT INTO public.businesses (name)
  VALUES (business_name)
  RETURNING id INTO new_business_id;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (new_business_id, NEW.id, 'admin');

  RETURN NEW;
END;
$function$;
