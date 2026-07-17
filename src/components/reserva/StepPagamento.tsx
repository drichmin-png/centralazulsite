import { CreditCard, QrCode, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface StepPagamentoProps {
  selected: string;
  onChange: (method: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const methods = [
  {
    id: "pix",
    label: "PIX",
    description: "Pagamento instantâneo via código",
    icon: QrCode,
    available: true,
  },
  {
    id: "cartao",
    label: "Cartão de Crédito",
    description: "Parcelamento em até 12x sem juros",
    icon: CreditCard,
    available: true,
  },
  {
    id: "boleto",
    label: "Boleto",
    description: "Indisponível no momento",
    icon: FileText,
    available: false,
  },
];

const StepPagamento = ({ selected, onChange, onNext, onBack }: StepPagamentoProps) => {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground">Pagamento</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Selecione a forma de pagamento</p>
        </div>
      </div>

      <div className="space-y-3">
        {methods.map((m) => {
          const Icon = m.icon;
          const isSelected = selected === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={!m.available}
              onClick={() => m.available && onChange(m.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                  : m.available
                  ? "border-border bg-card hover:border-primary/30"
                  : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">{m.label}</span>
                  {!m.available && (
                    <span className="text-[10px] font-bold text-destructive uppercase px-1.5 py-0.5 bg-destructive/10 rounded-md">Esgotado</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
              </div>
              {m.available && (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? "border-primary" : "border-muted"
                }`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Button onClick={onNext} size="lg" className="w-full text-lg font-bold h-14 rounded-xl">
        Finalizar Reserva
      </Button>
      <button type="button" onClick={onBack} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
        ← Voltar
      </button>
    </motion.div>
  );
};

export default StepPagamento;
