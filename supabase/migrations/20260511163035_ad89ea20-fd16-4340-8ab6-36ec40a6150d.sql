ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS color_style text NOT NULL DEFAULT 'fill';