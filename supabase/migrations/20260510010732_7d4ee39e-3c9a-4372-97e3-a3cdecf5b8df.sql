-- Add size support to menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS has_sizes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sizes jsonb;

-- Insert categories for MAMAPAPA business
INSERT INTO public.categories (business_id, name)
SELECT '94a1c7c9-034b-4327-ae67-a56362d34c4e'::uuid, v.name
FROM (VALUES ('Tortilluca'), ('Entradas')) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories
  WHERE business_id = '94a1c7c9-034b-4327-ae67-a56362d34c4e'::uuid AND name = v.name
);

-- Clear existing menu items for this business to avoid duplicates
DELETE FROM public.menu_items WHERE business_id = '94a1c7c9-034b-4327-ae67-a56362d34c4e'::uuid;

-- Insert Tortilluca items (with sizes)
INSERT INTO public.menu_items (business_id, name, price, category, has_sizes, sizes) VALUES
('94a1c7c9-034b-4327-ae67-a56362d34c4e','Güera',70,'Tortilluca',true,
  '[{"id":"s1","name":"Pincho","price":70},{"id":"s2","name":"Bocata","price":150},{"id":"s3","name":"Mediana","price":380},{"id":"s4","name":"Familiar","price":480}]'::jsonb),
('94a1c7c9-034b-4327-ae67-a56362d34c4e','Colorá',80,'Tortilluca',true,
  '[{"id":"s1","name":"Pincho","price":80},{"id":"s2","name":"Bocata","price":170},{"id":"s3","name":"Mediana","price":440},{"id":"s4","name":"Familiar","price":540}]'::jsonb),
('94a1c7c9-034b-4327-ae67-a56362d34c4e','Gordibuena',80,'Tortilluca',true,
  '[{"id":"s1","name":"Pincho","price":80},{"id":"s2","name":"Bocata","price":170},{"id":"s3","name":"Mediana","price":440},{"id":"s4","name":"Familiar","price":540}]'::jsonb),
('94a1c7c9-034b-4327-ae67-a56362d34c4e','Colibrí',90,'Tortilluca',true,
  '[{"id":"s1","name":"Pincho","price":90},{"id":"s2","name":"Bocata","price":190},{"id":"s3","name":"Mediana","price":490},{"id":"s4","name":"Familiar","price":590}]'::jsonb),
('94a1c7c9-034b-4327-ae67-a56362d34c4e','G. de los quesos',90,'Tortilluca',true,
  '[{"id":"s1","name":"Pincho","price":90},{"id":"s2","name":"Bocata","price":190},{"id":"s3","name":"Mediana","price":490},{"id":"s4","name":"Familiar","price":590}]'::jsonb),
('94a1c7c9-034b-4327-ae67-a56362d34c4e','Ensaladilla de Toñuska',55,'Entradas',false,NULL),
('94a1c7c9-034b-4327-ae67-a56362d34c4e','Mamahuevos',155,'Entradas',false,NULL);
