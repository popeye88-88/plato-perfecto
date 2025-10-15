-- Script para diagnosticar usuarios problemáticos
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Verificar usuarios en auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
FROM auth.users 
WHERE email IN ('mamapapa.mex@gmail.com', 'test2@example.com', 'test3@example.com')
ORDER BY email;

-- 2. Verificar roles en user_roles
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email IN ('mamapapa.mex@gmail.com', 'test2@example.com', 'test3@example.com')
ORDER BY u.email;

-- 3. Verificar membresías en business_members
SELECT 
  bm.user_id,
  u.email,
  bm.role as business_role,
  b.name as business_name,
  bm.created_at
FROM public.business_members bm
JOIN auth.users u ON bm.user_id = u.id
JOIN public.businesses b ON bm.business_id = b.id
WHERE u.email IN ('mamapapa.mex@gmail.com', 'test2@example.com', 'test3@example.com')
ORDER BY u.email;

-- 4. Verificar negocios asociados
SELECT 
  b.id,
  b.name,
  b.created_at,
  COUNT(bm.user_id) as member_count
FROM public.businesses b
LEFT JOIN public.business_members bm ON b.id = bm.business_id
WHERE b.id IN (
  SELECT DISTINCT business_id 
  FROM public.business_members bm2
  JOIN auth.users u ON bm2.user_id = u.id
  WHERE u.email IN ('mamapapa.mex@gmail.com', 'test2@example.com', 'test3@example.com')
)
GROUP BY b.id, b.name, b.created_at;
