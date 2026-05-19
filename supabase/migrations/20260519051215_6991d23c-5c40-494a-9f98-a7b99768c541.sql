ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MXN';