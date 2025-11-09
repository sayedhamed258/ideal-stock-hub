-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Helper function to check if user can write (admin or staff)
CREATE OR REPLACE FUNCTION public.can_write(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'staff')
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.is_admin(auth.uid()));

-- Update RLS policies for existing tables
-- Categories
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.categories;
CREATE POLICY "Anyone authenticated can view categories"
ON public.categories FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and staff can insert categories"
ON public.categories FOR INSERT
WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "Admin and staff can update categories"
ON public.categories FOR UPDATE
USING (public.can_write(auth.uid()));

CREATE POLICY "Only admins can delete categories"
ON public.categories FOR DELETE
USING (public.is_admin(auth.uid()));

-- Suppliers
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.suppliers;
CREATE POLICY "Anyone authenticated can view suppliers"
ON public.suppliers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and staff can insert suppliers"
ON public.suppliers FOR INSERT
WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "Admin and staff can update suppliers"
ON public.suppliers FOR UPDATE
USING (public.can_write(auth.uid()));

CREATE POLICY "Only admins can delete suppliers"
ON public.suppliers FOR DELETE
USING (public.is_admin(auth.uid()));

-- Products
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.products;
CREATE POLICY "Anyone authenticated can view products"
ON public.products FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and staff can insert products"
ON public.products FOR INSERT
WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "Admin and staff can update products"
ON public.products FOR UPDATE
USING (public.can_write(auth.uid()));

CREATE POLICY "Only admins can delete products"
ON public.products FOR DELETE
USING (public.is_admin(auth.uid()));

-- Stock Movements
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.stock_movements;
CREATE POLICY "Anyone authenticated can view stock movements"
ON public.stock_movements FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and staff can insert stock movements"
ON public.stock_movements FOR INSERT
WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "Admin and staff can update stock movements"
ON public.stock_movements FOR UPDATE
USING (public.can_write(auth.uid()));

CREATE POLICY "Only admins can delete stock movements"
ON public.stock_movements FOR DELETE
USING (public.is_admin(auth.uid()));

-- Requirements
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.requirements;
CREATE POLICY "Anyone authenticated can view requirements"
ON public.requirements FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin and staff can insert requirements"
ON public.requirements FOR INSERT
WITH CHECK (public.can_write(auth.uid()));

CREATE POLICY "Admin and staff can update requirements"
ON public.requirements FOR UPDATE
USING (public.can_write(auth.uid()));

CREATE POLICY "Only admins can delete requirements"
ON public.requirements FOR DELETE
USING (public.is_admin(auth.uid()));