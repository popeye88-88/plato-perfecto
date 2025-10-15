-- Script para solucionar usuarios problemáticos
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Asignar rol de staff a usuarios que no lo tienen
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id as user_id,
  'staff' as role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
WHERE u.email IN ('mamapapa.mex@gmail.com', 'test2@example.com', 'test3@example.com')
  AND ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Crear negocios para usuarios que no tienen ninguno
DO $$
DECLARE
  user_record RECORD;
  new_business_id UUID;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.business_members bm ON u.id = bm.user_id
    WHERE u.email IN ('mamapapa.mex@gmail.com', 'test2@example.com', 'test3@example.com')
      AND bm.user_id IS NULL
  LOOP
    -- Crear negocio para el usuario
    INSERT INTO public.businesses (name)
    VALUES (COALESCE(
      user_record.raw_user_meta_data->>'business_name',
      'Negocio de ' || COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email)
    ))
    RETURNING id INTO new_business_id;
    
    -- Asignar usuario como admin del negocio
    INSERT INTO public.business_members (business_id, user_id, role)
    VALUES (new_business_id, user_record.id, 'admin');
    
    RAISE NOTICE 'Created business for user: %', user_record.email;
  END LOOP;
END $$;

-- 3. Verificar el resultado
SELECT 
  'RESULTADO FINAL' as status,
  u.email,
  CASE WHEN ur.role IS NOT NULL THEN 'STAFF OK' ELSE 'SIN STAFF' END as staff_status,
  CASE WHEN bm.user_id IS NOT NULL THEN 'BUSINESS OK' ELSE 'SIN BUSINESS' END as business_status,
  b.name as business_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
LEFT JOIN public.business_members bm ON u.id = bm.user_id
LEFT JOIN public.businesses b ON bm.business_id = b.id
WHERE u.email IN ('mamapapa.mex@gmail.com', 'test2@example.com', 'test3@example.com')
ORDER BY u.email;
