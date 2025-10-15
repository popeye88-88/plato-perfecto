-- Script de emergencia para mamapapa.mex@gmail.com
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Verificar estado completo del usuario
SELECT 
  'ESTADO COMPLETO DEL USUARIO' as status,
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  u.email_change_confirm_status,
  u.phone_confirmed_at,
  u.confirmation_sent_at,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN 'EMAIL CONFIRMADO'
    ELSE 'EMAIL NO CONFIRMADO'
  END as email_status
FROM auth.users u
WHERE u.email = 'mamapapa.mex@gmail.com';

-- 2. Verificar TODOS los roles del usuario
SELECT 
  'TODOS LOS ROLES' as status,
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'mamapapa.mex@gmail.com'
ORDER BY ur.created_at;

-- 3. Verificar TODOS los negocios del usuario
SELECT 
  'TODOS LOS NEGOCIOS' as status,
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

-- 4. SOLUCIÓN DE EMERGENCIA: Forzar confirmación de email
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmation_sent_at = NOW()
WHERE email = 'mamapapa.mex@gmail.com' 
  AND email_confirmed_at IS NULL;

-- 5. SOLUCIÓN DE EMERGENCIA: Asegurar rol staff
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id as user_id,
  'staff' as role
FROM auth.users u
WHERE u.email = 'mamapapa.mex@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. SOLUCIÓN DE EMERGENCIA: Asegurar negocio
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
      business_name := 'MAMAPAPA';
      
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
  u.email_confirmed_at,
  CASE WHEN ur.role IS NOT NULL THEN 'STAFF OK' ELSE 'SIN STAFF' END as staff_status,
  CASE WHEN bm.user_id IS NOT NULL THEN 'BUSINESS OK' ELSE 'SIN BUSINESS' END as business_status,
  b.name as business_name,
  bm.role as business_role,
  CASE WHEN u.email_confirmed_at IS NOT NULL THEN 'EMAIL OK' ELSE 'EMAIL PENDIENTE' END as email_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
LEFT JOIN public.business_members bm ON u.id = bm.user_id
LEFT JOIN public.businesses b ON bm.business_id = b.id
WHERE u.email = 'mamapapa.mex@gmail.com';
