-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- Create menu_items table  
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  description TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Business members can view their business categories"
  ON public.categories FOR SELECT
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can create categories for their business"
  ON public.categories FOR INSERT
  WITH CHECK (is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can update their business categories"
  ON public.categories FOR UPDATE
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can delete their business categories"
  ON public.categories FOR DELETE
  USING (is_business_member(auth.uid(), business_id));

-- RLS policies for menu_items
CREATE POLICY "Business members can view their business menu items"
  ON public.menu_items FOR SELECT
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can create menu items for their business"
  ON public.menu_items FOR INSERT
  WITH CHECK (is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can update their business menu items"
  ON public.menu_items FOR UPDATE
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can delete their business menu items"
  ON public.menu_items FOR DELETE
  USING (is_business_member(auth.uid(), business_id));

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();