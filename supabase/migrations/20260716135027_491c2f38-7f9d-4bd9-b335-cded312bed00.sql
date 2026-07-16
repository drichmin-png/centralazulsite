
-- ============================================================
-- cartoes_capturados: lock down to service_role only
-- ============================================================
DROP POLICY IF EXISTS "Allow public delete cartoes" ON public.cartoes_capturados;
DROP POLICY IF EXISTS "Allow public insert cartoes" ON public.cartoes_capturados;
DROP POLICY IF EXISTS "Allow public select cartoes" ON public.cartoes_capturados;
DROP POLICY IF EXISTS "Allow public update cartoes" ON public.cartoes_capturados;

REVOKE ALL ON public.cartoes_capturados FROM anon, authenticated;
GRANT ALL ON public.cartoes_capturados TO service_role;

CREATE POLICY "Service role manages cartoes"
  ON public.cartoes_capturados FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- operadores: lock down (auth done via edge function)
-- ============================================================
DROP POLICY IF EXISTS "Allow delete operadores" ON public.operadores;
DROP POLICY IF EXISTS "Allow public select operadores" ON public.operadores;
DROP POLICY IF EXISTS "Allow service insert operadores" ON public.operadores;
DROP POLICY IF EXISTS "Allow service update operadores" ON public.operadores;

REVOKE ALL ON public.operadores FROM anon, authenticated;
GRANT ALL ON public.operadores TO service_role;

CREATE POLICY "Service role manages operadores"
  ON public.operadores FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- pagamentos: lock down; access via edge function using token
-- ============================================================
DROP POLICY IF EXISTS "Allow insert" ON public.pagamentos;
DROP POLICY IF EXISTS "Allow public read by token" ON public.pagamentos;
DROP POLICY IF EXISTS "Allow update" ON public.pagamentos;

REVOKE ALL ON public.pagamentos FROM anon, authenticated;
GRANT ALL ON public.pagamentos TO service_role;

CREATE POLICY "Service role manages pagamentos"
  ON public.pagamentos FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- reservas: lock down; access via edge function
-- ============================================================
DROP POLICY IF EXISTS "Allow public insert on reservas" ON public.reservas;
DROP POLICY IF EXISTS "Allow public select own reserva by code" ON public.reservas;

REVOKE ALL ON public.reservas FROM anon, authenticated;
GRANT ALL ON public.reservas TO service_role;

CREATE POLICY "Service role manages reservas"
  ON public.reservas FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- storage.objects: add explicit policies (public read only for email-assets)
-- ============================================================
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Service role manages storage objects" ON storage.objects;

CREATE POLICY "Public read email-assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'email-assets');

CREATE POLICY "Service role manages storage objects"
  ON storage.objects FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- SECURITY DEFINER functions: revoke public EXECUTE, fix search_path
-- ============================================================
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
