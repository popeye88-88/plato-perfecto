-- Script de diagnóstico avanzado para mamapapa.mex@gmail.com
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Verificar estado completo del usuario
SELECT 
  'ESTADO COMPLETO DEL USUARIO' as status,
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN 'EMAIL CONFIRMADO'
    ELSE 'EMAIL NO CONFIRMADO'
  END as email_status,
  CASE 
    WHEN u.last_sign_in_at IS NOT NULL THEN 'HA INICIADO SESIÓN'
    ELSE 'NUNCA HA INICIADO SESIÓN'
  END as login_status
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

-- 4. Verificar si el usuario puede acceder a las tablas (RLS)
SELECT 
  'VERIFICAR ACCESO A TABLAS' as status,
  'user_roles' as tabla,
  COUNT(*) as registros_accesibles
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'mamapapa.mex@gmail.com'

UNION ALL

SELECT 
  'VERIFICAR ACCESO A TABLAS' as status,
  'business_members' as tabla,
  COUNT(*) as registros_accesibles
FROM public.business_members bm
JOIN auth.users u ON bm.user_id = u.id
WHERE u.email = 'mamapapa.mex@gmail.com'

UNION ALL

SELECT 
  'VERIFICAR ACCESO A TABLAS' as status,
  'businesses' as tabla,
  COUNT(*) as registros_accesibles
FROM public.businesses b
JOIN public.business_members bm ON b.id = bm.business_id
JOIN auth.users u ON bm.user_id = u.id
WHERE u.email = 'mamapapa.mex@gmail.com';

-- 5. SOLUCIÓN COMPLETA: Asegurar que el usuario tenga todo lo necesario
DO $$
DECLARE
  target_user_id UUID;
  new_business_id UUID;
  business_name TEXT;
  staff_role_exists BOOLEAN;
  business_exists BOOLEAN;
BEGIN
  -- Obtener el ID del usuario
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'mamapapa.mex@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Processing user: %', target_user_id;
    
    -- Verificar si tiene rol staff
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles 
      WHERE user_id = target_user_id AND role = 'staff'
    ) INTO staff_role_exists;
    
    -- Verificar si tiene negocio
    SELECT EXISTS(
      SELECT 1 FROM public.business_members 
      WHERE user_id = target_user_id
    ) INTO business_exists;
    
    RAISE NOTICE 'Staff role exists: %, Business exists: %', staff_role_exists, business_exists;
    
    -- Asignar rol staff si no lo tiene
    IF NOT staff_role_exists THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target_user_id, 'staff')
      ON CONFLICT (user_id, role) DO NOTHING;
      RAISE NOTICE 'Assigned staff role to user';
    END IF;
    
    -- Crear negocio si no tiene uno
    IF NOT business_exists THEN
      business_name := 'Negocio de mamapapa.mex@gmail.com';
      
      INSERT INTO public.businesses (name)
      VALUES (business_name)
      RETURNING id INTO new_business_id;
      
      INSERT INTO public.business_members (business_id, user_id, role)
      VALUES (new_business_id, target_user_id, 'admin');
      
      RAISE NOTICE 'Created business % for user', new_business_id;
    END IF;
    
  ELSE
    RAISE NOTICE 'User mamapapa.mex@gmail.com not found';
  END IF;
END $$;

-- 6. VERIFICAR RESULTADO FINAL COMPLETO
SELECT 
  'RESULTADO FINAL COMPLETO' as status,
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
