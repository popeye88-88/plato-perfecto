-- Borrar todos los datos de la app y todos los usuarios
DELETE FROM public.order_edit_history;
DELETE FROM public.menu_items;
DELETE FROM public.categories;
DELETE FROM public.business_members;
DELETE FROM public.businesses;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;