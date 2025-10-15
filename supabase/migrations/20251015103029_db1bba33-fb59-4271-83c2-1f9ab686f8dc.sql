-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pieces',
  barcode TEXT,
  min_stock_level INTEGER DEFAULT 10,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create stock_movements table
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  movement_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create requirements table
CREATE TABLE public.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) NOT NULL,
  needed_qty INTEGER NOT NULL,
  requested_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'Ordered', 'Received', 'Closed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for authenticated users (internal app)
CREATE POLICY "Allow all for authenticated users" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.requirements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to update stock quantity on stock movement
CREATE OR REPLACE FUNCTION public.handle_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.movement_type = 'IN' THEN
    UPDATE public.products 
    SET stock_qty = stock_qty + NEW.quantity 
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'OUT' THEN
    UPDATE public.products 
    SET stock_qty = stock_qty - NEW.quantity 
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for stock movement
CREATE TRIGGER on_stock_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_stock_movement();

-- Function to check and create requirements when stock is low
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stock_qty < NEW.min_stock_level THEN
    -- Check if there's already an open requirement for this product
    IF NOT EXISTS (
      SELECT 1 FROM public.requirements 
      WHERE product_id = NEW.id 
      AND status IN ('Open', 'Ordered')
    ) THEN
      INSERT INTO public.requirements (product_id, needed_qty, priority, notes)
      VALUES (
        NEW.id, 
        NEW.min_stock_level - NEW.stock_qty,
        'High',
        'Auto-generated: Stock below minimum level'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to check low stock after product update
CREATE TRIGGER on_product_stock_update
  AFTER UPDATE OF stock_qty ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_low_stock();

-- Function to handle requirement received status
CREATE OR REPLACE FUNCTION public.handle_requirement_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Received' AND OLD.status != 'Received' THEN
    -- Increase stock when requirement is marked as received
    UPDATE public.products 
    SET stock_qty = stock_qty + NEW.needed_qty 
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for requirement status update
CREATE TRIGGER on_requirement_received
  AFTER UPDATE OF status ON public.requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_requirement_received();

-- Insert default categories
INSERT INTO public.categories (name, description) VALUES
  ('Armatures', 'Armature components and parts'),
  ('Drill Machines', 'Electric drill machines and accessories'),
  ('Blades', 'Cutting blades and saw blades'),
  ('Mixture/Grinder', 'Mixer grinder parts and components'),
  ('Fan Winding', 'Fan winding materials and copper wire'),
  ('Iron', 'Electric iron parts and heating elements'),
  ('Electrical Components', 'Switches, sockets, and electrical fittings'),
  ('Tools', 'Hand tools and power tools'),
  ('Wires', 'Electrical wires and cables'),
  ('Motors', 'Electric motors and motor parts');