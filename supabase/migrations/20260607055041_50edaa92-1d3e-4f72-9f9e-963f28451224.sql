ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS exibir_tela_busca boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS solicitar_origem boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exigir_origem boolean NOT NULL DEFAULT false;