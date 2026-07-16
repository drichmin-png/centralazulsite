
-- Restore anon/authenticated access so the app (which uses the anon key with custom operador-auth) can read/write again.
-- The previous lockdown broke the panel and client screens. Custom auth is enforced in application code + edge functions.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservas TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operadores TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartoes_capturados TO anon, authenticated;
GRANT ALL ON public.reservas, public.pagamentos, public.operadores, public.cartoes_capturados TO service_role;

-- Permissive policies (app relies on custom auth, not Supabase auth)
DROP POLICY IF EXISTS "App access reservas" ON public.reservas;
CREATE POLICY "App access reservas" ON public.reservas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "App access pagamentos" ON public.pagamentos;
CREATE POLICY "App access pagamentos" ON public.pagamentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "App access operadores" ON public.operadores;
CREATE POLICY "App access operadores" ON public.operadores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "App access cartoes" ON public.cartoes_capturados;
CREATE POLICY "App access cartoes" ON public.cartoes_capturados FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
