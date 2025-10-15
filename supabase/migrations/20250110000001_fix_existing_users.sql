-- Ensure existing users have staff role assigned
-- This migration fixes existing users who might not have the staff role

-- Insert staff role for all users who don't have any role assigned
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id as user_id,
  'staff' as role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Also ensure all business members have staff role
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT
  bm.user_id,
  'staff' as role
FROM public.business_members bm
LEFT JOIN public.user_roles ur ON bm.user_id = ur.user_id AND ur.role = 'staff'
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
