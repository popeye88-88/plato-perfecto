-- Datos iniciales: user1, user2, negocios y permisos
-- Solo se ejecuta si las tablas están vacías

-- Usuarios por defecto (contraseñas en texto - migrar a hash en producción)
INSERT INTO public.app_users (id, username, password, created_at)
VALUES 
  ('user1', 'user1', '1234', now()),
  ('user2', 'user2', '5678', now())
ON CONFLICT (id) DO NOTHING;

-- Negocios por defecto
INSERT INTO public.businesses (id, name, description, created_at)
VALUES 
  ('business-mi-restaurante', 'mi restaurante', 'Negocio de user1', now()),
  ('business-n1', 'N1', 'Negocio compartido', now()),
  ('business-n2', 'N2', 'Negocio de user2', now())
ON CONFLICT (id) DO NOTHING;

-- Permisos: mi restaurante owner user1; N1 owner user1 staff user2; N2 owner user2
INSERT INTO public.business_user_access (business_id, user_id, role)
VALUES 
  ('business-mi-restaurante', 'user1', 'owner'),
  ('business-n1', 'user1', 'owner'),
  ('business-n1', 'user2', 'staff'),
  ('business-n2', 'user2', 'owner')
ON CONFLICT (business_id, user_id) DO UPDATE SET role = EXCLUDED.role;
