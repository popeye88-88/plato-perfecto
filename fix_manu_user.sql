-- Script para diagnosticar y solucionar el usuario manu.bpg@gmail.com
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Verificar si el usuario existe
SELECT 
  'USUARIO ENCONTRADO' as status,
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'manu.bpg@gmail.com';

-- 2. Verificar si tiene rol de staff
SELECT 
  'VERIFICAR ROL STAFF' as status,
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
WHERE u.email = 'manu.bpg@gmail.com';

-- 3. Verificar si tiene negocio asociado
SELECT 
  'VERIFICAR NEGOCIO' as status,
  u.email,
  bm.role as business_role,
  b.name as business_name,
  bm.created_at
FROM auth.users u
LEFT JOIN public.business_members bm ON u.id = bm.user_id
LEFT JOIN public.businesses b ON bm.business_id = b.id
WHERE u.email = 'manu.bpg@gmail.com';

-- 4. SOLUCIÓN: Asignar rol de staff si no lo tiene
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id as user_id,
  'staff' as role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.role = 'staff'
WHERE u.email = 'manu.bpg@gmail.com'
  AND ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. SOLUCIÓN: Crear negocio si no tiene uno
DO $$
DECLARE
  user_id UUID;
  new_business_id UUID;
  business_name TEXT;
BEGIN
  -- Obtener el ID del usuario
  SELECT id INTO user_id FROM auth.users WHERE email = 'manu.bpg@gmail.com';
  
  IF user_id IS NOT NULL THEN
    -- Verificar si ya tiene un negocio
    IF NOT EXISTS (SELECT 1 FROM public.business_members WHERE user_id = user_id) THEN
      -- Crear negocio
      business_name := 'Negocio de manu.bpg@gmail.com';
      
      INSERT INTO public.businesses (name)
      VALUES (business_name)
      RETURNING id INTO new_business_id;
      
      -- Asignar usuario como admin del negocio
      INSERT INTO public.business_members (business_id, user_id, role)
      VALUES (new_business_id, user_id, 'admin');
      
      RAISE NOTICE 'Created business % for user manu.bpg@gmail.com', new_business_id;
    ELSE
      RAISE NOTICE 'User manu.bpg@gmail.com already has a business';
    END IF;
  ELSE
    RAISE NOTICE 'User manu.bpg@gmail.com not found';
  END IF;
END $$;

-- 6. VERIFICAR RESULTADO FINAL
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
WHERE u.email = 'manu.bpg@gmail.com';
