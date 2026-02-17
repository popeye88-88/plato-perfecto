-- 1. Drop legacy app_users table with plaintext passwords
DROP TABLE IF EXISTS public.app_users CASCADE;

-- 2. Fix profiles RLS: replace overly broad staff policy with business-scoped access
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Staff can only view profiles of users in the same business
CREATE POLICY "Users can view profiles of business members"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.business_members bm1
      JOIN public.business_members bm2 ON bm1.business_id = bm2.business_id
      WHERE bm1.user_id = auth.uid()
        AND bm2.user_id = profiles.id
    )
  );