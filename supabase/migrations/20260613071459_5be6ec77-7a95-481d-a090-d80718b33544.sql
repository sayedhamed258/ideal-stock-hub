
-- Restrict products SELECT to admin/staff (can_write)
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "All authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Anyone authenticated can view products" ON public.products;
DROP POLICY IF EXISTS "Users can view products" ON public.products;
DROP POLICY IF EXISTS "Admin and staff can view products" ON public.products;
CREATE POLICY "Admin and staff can view products"
ON public.products FOR SELECT TO authenticated
USING (public.can_write(auth.uid()));

-- Suppliers: allow admin+staff, scoped to authenticated
DROP POLICY IF EXISTS "Only admins can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admin and staff can view suppliers" ON public.suppliers;
CREATE POLICY "Admin and staff can view suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (public.can_write(auth.uid()));
