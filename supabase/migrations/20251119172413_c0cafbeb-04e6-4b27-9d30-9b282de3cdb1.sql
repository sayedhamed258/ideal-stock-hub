-- Add security documentation comments to SECURITY DEFINER functions

-- Document handle_stock_movement function
COMMENT ON FUNCTION public.handle_stock_movement() IS 
'SECURITY NOTE: Uses SECURITY DEFINER to update stock across tables. 
Only called via trigger on stock_movements table - never expose as RPC endpoint.
Bypasses RLS to allow automatic stock updates when movements are recorded.';

-- Document check_low_stock function  
COMMENT ON FUNCTION public.check_low_stock() IS
'SECURITY NOTE: Uses SECURITY DEFINER to create requirement records.
Only called via trigger on products table when stock falls below minimum.
Bypasses RLS to allow automatic requirement generation - never expose as RPC endpoint.';

-- Document handle_requirement_received function
COMMENT ON FUNCTION public.handle_requirement_received() IS
'SECURITY NOTE: Uses SECURITY DEFINER to update product stock quantities.
Only called via trigger on requirements table when status changes to Received.
Bypasses RLS to allow automatic stock updates - never expose as RPC endpoint.';