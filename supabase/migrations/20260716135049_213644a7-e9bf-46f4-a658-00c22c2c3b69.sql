
-- Remove listing policy; public bucket files remain reachable by direct URL
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;

-- Lock email queue definer functions to service_role only
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;
