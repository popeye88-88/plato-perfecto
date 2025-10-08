-- Add staff access to view all profiles for customer support
CREATE POLICY "Staff can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Add role update protection to prevent self-privilege escalation
CREATE POLICY "Admins can update roles for others only"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') AND
    user_id != auth.uid()
  );

-- Note: To create the first admin user, run this SQL after a user signs up:
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('<user_id_from_auth_users>', 'admin');