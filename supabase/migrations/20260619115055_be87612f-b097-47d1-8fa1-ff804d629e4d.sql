
REVOKE EXECUTE ON FUNCTION public.handle_stock_movement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_low_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_requirement_received() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write(uuid) TO authenticated;
