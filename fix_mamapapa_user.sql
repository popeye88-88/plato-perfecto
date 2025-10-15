-- Script específico para diagnosticar mamapapa.mex@gmail.com
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Verificar si el usuario existe y está confirmado
SELECT 
  'USUARIO INFO' as status,
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'EMAIL CONFIRMADO'
    ELSE 'EMAIL NO CONFIRMADO'
  END as email_status
FROM auth.users 
WHERE email = 'mamapapa.mex@gmail.com';

-- 2. Verificar roles del usuario
SELECT 
  'ROLES DEL USUARIO' as status,
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'mamapapa.mex@gmail.com'
ORDER BY ur.created_at;

-- 3. Verificar negocios del usuario
SELECT 
  'NEGOCIOS DEL USUARIO' as status,
  u.email,
  bm.role as business_role,
  b.id as business_id,
  b.name as business_name,
  bm.created_at
FROM auth.users u
LEFT JOIN public.business_members bm ON u.id = bm.user_id
LEFT JOIN public.businesses b ON bm.business_id = b.id
WHERE u.email = 'mamapapa.mex@gmail.com'
ORDER BY bm.created_at;

-- 4. Verificar si hay algún problema con RLS policies
SELECT 
  'POLÍTICAS RLS' as status,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('user_roles', 'business_members', 'businesses')
ORDER BY tablename, policyname;

-- 5. SOLUCIÓN: Asignar rol staff si no lo tiene
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id as user_id,
  'staff' as role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
WHERE u.email = 'mamapapa.mex@gmail.com'
  AND ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. SOLUCIÓN: Crear negocio si no tiene uno
DO $$
DECLARE
  target_user_id UUID;
  new_business_id UUID;
  business_name TEXT;
BEGIN
  -- Obtener el ID del usuario
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'mamapapa.mex@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Verificar si ya tiene un negocio
    IF NOT EXISTS (SELECT 1 FROM public.business_members WHERE user_id = target_user_id) THEN
      -- Crear negocio
      business_name := 'Negocio de mamapapa.mex@gmail.com';
      
      INSERT INTO public.businesses (name)
      VALUES (business_name)
      RETURNING id INTO new_business_id;
      
      -- Asignar usuario como admin del negocio
      INSERT INTO public.business_members (business_id, user_id, role)
      VALUES (new_business_id, target_user_id, 'admin');
      
      RAISE NOTICE 'Created business % for user mamapapa.mex@gmail.com', new_business_id;
    ELSE
      RAISE NOTICE 'User mamapapa.mex@gmail.com already has a business';
    END IF;
  ELSE
    RAISE NOTICE 'User mamapapa.mex@gmail.com not found';
  END IF;
END $$;

-- 7. VERIFICAR RESULTADO FINAL
SELECT 
  'RESULTADO FINAL' as status,
  u.email,
  CASE WHEN ur.role IS NOT NULL THEN 'STAFF OK' ELSE 'SIN STAFF' END as staff_status,
  CASE WHEN bm.user_id IS NOT NULL THEN 'BUSINESS OK' ELSE 'SIN BUSINESS' END as business_status,
  b.name as business_name,
  CASE WHEN u.email_confirmed_at IS NOT NULL THEN 'EMAIL OK' ELSE 'EMAIL PENDIENTE' END as email_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
LEFT JOIN public.business_members bm ON u.id = bm.user_id
LEFT JOIN public.businesses b ON bm.business_id = b.id
WHERE u.email = 'mamapapa.mex@gmail.com';
