
-- Seed menu for Negocio de MAMAPAPA
INSERT INTO public.categories (business_id, name) VALUES
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'Tortilluca'),
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'Entradas')
ON CONFLICT DO NOTHING;

INSERT INTO public.menu_items (business_id, name, price, category, has_sizes, sizes, color_style) VALUES
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'Güera', 70, 'Tortilluca', true,
   '[{"id":"s1","name":"Pincho","price":70},{"id":"s2","name":"Bocata","price":150},{"id":"s3","name":"Mediana","price":380},{"id":"s4","name":"Familiar","price":480}]'::jsonb, 'fill'),
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'Colorá', 80, 'Tortilluca', true,
   '[{"id":"s1","name":"Pincho","price":80},{"id":"s2","name":"Bocata","price":170},{"id":"s3","name":"Mediana","price":440},{"id":"s4","name":"Familiar","price":540}]'::jsonb, 'fill'),
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'Gordibuena', 80, 'Tortilluca', true,
   '[{"id":"s1","name":"Pincho","price":80},{"id":"s2","name":"Bocata","price":170},{"id":"s3","name":"Mediana","price":440},{"id":"s4","name":"Familiar","price":540}]'::jsonb, 'fill'),
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'Colibrí', 90, 'Tortilluca', true,
   '[{"id":"s1","name":"Pincho","price":90},{"id":"s2","name":"Bocata","price":190},{"id":"s3","name":"Mediana","price":490},{"id":"s4","name":"Familiar","price":590}]'::jsonb, 'fill'),
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'G. de los quesos', 90, 'Tortilluca', true,
   '[{"id":"s1","name":"Pincho","price":90},{"id":"s2","name":"Bocata","price":190},{"id":"s3","name":"Mediana","price":490},{"id":"s4","name":"Familiar","price":590}]'::jsonb, 'fill'),
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'Ensaladilla de Toñuska', 55, 'Entradas', false, NULL, 'fill'),
  ('94a1c7c9-034b-4327-ae67-a56362d34c4e', 'Mamahuevos', 155, 'Entradas', false, NULL, 'fill');
