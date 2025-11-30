-- Fix Anonymous Access Policies warning for all remaining tables
-- Drop and recreate policies with explicit restriction to authenticated users

-- Categories table
DROP POLICY IF EXISTS "Admin and staff can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admin and staff can update categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone authenticated can view categories" ON public.categories;
DROP POLICY IF EXISTS "Only admins can delete categories" ON public.categories;

CREATE POLICY "Admin and staff can insert categories" 
ON public.categories 
FOR INSERT 
TO authenticated
WITH CHECK (can_write(auth.uid()));

CREATE POLICY "Admin and staff can update categories" 
ON public.categories 
FOR UPDATE 
TO authenticated
USING (can_write(auth.uid()));

CREATE POLICY "Anyone authenticated can view categories" 
ON public.categories 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete categories" 
ON public.categories 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));

-- Products table
DROP POLICY IF EXISTS "Admin and staff can insert products" ON public.products;
DROP POLICY IF EXISTS "Admin and staff can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone authenticated can view products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;

CREATE POLICY "Admin and staff can insert products" 
ON public.products 
FOR INSERT 
TO authenticated
WITH CHECK (can_write(auth.uid()));

CREATE POLICY "Admin and staff can update products" 
ON public.products 
FOR UPDATE 
TO authenticated
USING (can_write(auth.uid()));

CREATE POLICY "Anyone authenticated can view products" 
ON public.products 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete products" 
ON public.products 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));

-- Requirements table
DROP POLICY IF EXISTS "Admin and staff can insert requirements" ON public.requirements;
DROP POLICY IF EXISTS "Admin and staff can update requirements" ON public.requirements;
DROP POLICY IF EXISTS "Anyone authenticated can view requirements" ON public.requirements;
DROP POLICY IF EXISTS "Only admins can delete requirements" ON public.requirements;

CREATE POLICY "Admin and staff can insert requirements" 
ON public.requirements 
FOR INSERT 
TO authenticated
WITH CHECK (can_write(auth.uid()));

CREATE POLICY "Admin and staff can update requirements" 
ON public.requirements 
FOR UPDATE 
TO authenticated
USING (can_write(auth.uid()));

CREATE POLICY "Anyone authenticated can view requirements" 
ON public.requirements 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete requirements" 
ON public.requirements 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));

-- Stock Movements table
DROP POLICY IF EXISTS "Admin and staff can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admin and staff can update stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Anyone authenticated can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Only admins can delete stock movements" ON public.stock_movements;

CREATE POLICY "Admin and staff can insert stock movements" 
ON public.stock_movements 
FOR INSERT 
TO authenticated
WITH CHECK (can_write(auth.uid()));

CREATE POLICY "Admin and staff can update stock movements" 
ON public.stock_movements 
FOR UPDATE 
TO authenticated
USING (can_write(auth.uid()));

CREATE POLICY "Anyone authenticated can view stock movements" 
ON public.stock_movements 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete stock movements" 
ON public.stock_movements 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));

-- Suppliers table
DROP POLICY IF EXISTS "Admin and staff can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admin and staff can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone authenticated can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Only admins can delete suppliers" ON public.suppliers;

CREATE POLICY "Admin and staff can insert suppliers" 
ON public.suppliers 
FOR INSERT 
TO authenticated
WITH CHECK (can_write(auth.uid()));

CREATE POLICY "Admin and staff can update suppliers" 
ON public.suppliers 
FOR UPDATE 
TO authenticated
USING (can_write(auth.uid()));

CREATE POLICY "Anyone authenticated can view suppliers" 
ON public.suppliers 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete suppliers" 
ON public.suppliers 
FOR DELETE 
TO authenticated
USING (is_admin(auth.uid()));