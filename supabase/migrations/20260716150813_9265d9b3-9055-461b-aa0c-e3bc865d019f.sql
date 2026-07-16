
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartoes_capturados TO anon, authenticated;
GRANT ALL ON public.cartoes_capturados TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO anon, authenticated;
GRANT ALL ON public.pagamentos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservas TO anon, authenticated;
GRANT ALL ON public.reservas TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operadores TO anon, authenticated;
GRANT ALL ON public.operadores TO service_role;
