-- ============================================
-- Migración completa: todas las tablas del app
-- ============================================

-- 1. USUARIOS (auth custom - puedes migrar a Supabase Auth después)
CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. NEGOCIOS
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. ACCESO USUARIO-NEGOCIO (permisos owner/staff)
CREATE TABLE IF NOT EXISTS public.business_user_access (
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  PRIMARY KEY (business_id, user_id)
);

-- 4. ELEMENTOS DEL MENÚ (por negocio)
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. CATEGORÍAS (por negocio)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(business_id, name)
);

-- 6. Añadir business_id a orders si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Campos adicionales en orders para compatibilidad
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE public.orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_reason') THEN
    ALTER TABLE public.orders ADD COLUMN discount_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'edited') THEN
    ALTER TABLE public.orders ADD COLUMN edited BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'initial_items') THEN
    ALTER TABLE public.orders ADD COLUMN initial_items JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'individual_items_status') THEN
    ALTER TABLE public.orders ADD COLUMN individual_items_status JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'edit_history') THEN
    ALTER TABLE public.orders ADD COLUMN edit_history JSONB;
  END IF;
END $$;

-- 8. Campos adicionales en order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'original_quantity') THEN
    ALTER TABLE public.order_items ADD COLUMN original_quantity INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'cancelled_at') THEN
    ALTER TABLE public.order_items ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'cancelled_in_stage') THEN
    ALTER TABLE public.order_items ADD COLUMN cancelled_in_stage TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'cancellation_reason') THEN
    ALTER TABLE public.order_items ADD COLUMN cancellation_reason TEXT;
  END IF;
END $$;

-- 9. RLS y políticas
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según tu auth)
CREATE POLICY "app_users_select" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "app_users_insert" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "app_users_update" ON public.app_users FOR UPDATE USING (true);

CREATE POLICY "businesses_select" ON public.businesses FOR SELECT USING (true);
CREATE POLICY "businesses_insert" ON public.businesses FOR INSERT WITH CHECK (true);
CREATE POLICY "businesses_update" ON public.businesses FOR UPDATE USING (true);
CREATE POLICY "businesses_delete" ON public.businesses FOR DELETE USING (true);

CREATE POLICY "business_user_access_all" ON public.business_user_access FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "menu_items_all" ON public.menu_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "categories_all" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_business_user_access_user ON public.business_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_business_user_access_business ON public.business_user_access(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_business ON public.menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_business ON public.categories(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business ON public.orders(business_id);
