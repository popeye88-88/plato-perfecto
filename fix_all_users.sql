-- Script para verificar y reparar los triggers de creación de usuarios
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Verificar que los triggers existan
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- 2. Verificar que las funciones existan
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('handle_new_user', 'handle_new_user_business')
ORDER BY routine_name;

-- 3. Verificar usuarios sin roles (problema común)
SELECT 
  'USUARIOS SIN ROL STAFF' as problema,
  u.email,
  u.created_at,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
WHERE ur.user_id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 4. Verificar usuarios sin negocios (problema común)
SELECT 
  'USUARIOS SIN NEGOCIO' as problema,
  u.email,
  u.created_at,
  bm.business_id
FROM auth.users u
LEFT JOIN public.business_members bm ON u.id = bm.user_id
WHERE bm.user_id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 5. SOLUCIÓN MASIVA: Asignar rol staff a todos los usuarios que no lo tienen
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id as user_id,
  'staff' as role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. SOLUCIÓN MASIVA: Crear negocios para usuarios que no tienen
DO $$
DECLARE
  user_record RECORD;
  new_business_id UUID;
  business_name TEXT;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
    FROM auth.users u
    LEFT JOIN public.business_members bm ON u.id = bm.user_id
    WHERE bm.user_id IS NULL
    ORDER BY u.created_at DESC
  LOOP
    -- Crear negocio para el usuario
    business_name := COALESCE(
      user_record.raw_user_meta_data->>'business_name',
      'Negocio de ' || COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email)
    );
    
    INSERT INTO public.businesses (name)
    VALUES (business_name)
    RETURNING id INTO new_business_id;
    
    -- Asignar usuario como admin del negocio
    INSERT INTO public.business_members (business_id, user_id, role)
    VALUES (new_business_id, user_record.id, 'admin');
    
    RAISE NOTICE 'Created business for user: %', user_record.email;
  END LOOP;
END $$;

-- 7. VERIFICAR RESULTADO FINAL
SELECT 
  'RESUMEN FINAL' as status,
  COUNT(*) as total_users,
  COUNT(ur.user_id) as users_with_staff_role,
  COUNT(bm.user_id) as users_with_business
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
LEFT JOIN public.business_members bm ON u.id = bm.user_id;
