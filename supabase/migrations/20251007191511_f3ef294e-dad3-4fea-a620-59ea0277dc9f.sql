-- Add missing INSERT policy for profiles table
-- This allows the trigger to create profiles when users sign up
CREATE POLICY "Users can create their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());