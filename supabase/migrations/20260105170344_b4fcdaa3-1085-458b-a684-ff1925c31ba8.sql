-- Drop the existing SELECT policy that allows staff access
DROP POLICY IF EXISTS "Admin and staff can view suppliers" ON public.suppliers;

-- Create new policy restricting SELECT to admins only
CREATE POLICY "Only admins can view suppliers" 
ON public.suppliers 
FOR SELECT 
USING (is_admin(auth.uid()));