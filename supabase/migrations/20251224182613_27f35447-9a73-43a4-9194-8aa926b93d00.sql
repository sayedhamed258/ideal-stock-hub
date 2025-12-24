-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Anyone authenticated can view suppliers" ON public.suppliers;

-- Create new restrictive SELECT policy for admin and staff only
CREATE POLICY "Admin and staff can view suppliers"
ON public.suppliers
FOR SELECT
USING (can_write(auth.uid()));