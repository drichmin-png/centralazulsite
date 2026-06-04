import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Plane, Check, X, GripVertical } from "lucide-react";
import { toast } from "sonner";

export type EstiloCartao = "classico" | "azul";

const STORAGE_KEY = "preferencia_estilo_cartao";
const POS_KEY = "fab_estilo_cartao_pos";

export const getEstiloPreferido = (): EstiloCartao => {
  if (typeof window === "undefined") return "classico";
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "azul" ? "azul" : "classico";
};

const EstiloCartaoFAB = () => {
  const [open, setOpen] = useState(false);
  const [estilo, setEstilo] = useState<EstiloCartao>(getEstiloPreferido());
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") return { x: 20, y: 120 };
    try {
      const s = localStorage.getItem(POS_KEY);
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return { x: window.innerWidth - 80, y: window.innerHeight - 200 };
  });
  const dragRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, estilo);
  }, [estilo]);

  useEffect(() => {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }, [pos]);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => ({
        x: Math.min(Math.max(8, p.x), window.innerWidth - 64),
        y: Math.min(Math.max(8, p.y), window.innerHeight - 64),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleSelect = (v: EstiloCartao) => {
    setEstilo(v);
    setOpen(false);
    toast.success(
      v === "azul"
        ? "Estilo Azul ativado para novos links"
        : "Estilo Clássico ativado para novos links"
    );
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{
        left: 0,
        top: 0,
        right: typeof window !== "undefined" ? window.innerWidth - 64 : 0,
        bottom: typeof window !== "undefined" ? window.innerHeight - 64 : 0,
      }}
      onDragEnd={(_, info) => {
        setPos({
          x: Math.min(Math.max(8, info.point.x - 28), window.innerWidth - 64),
          y: Math.min(Math.max(8, info.point.y - 28), window.innerHeight - 64),
        });
      }}
      initial={false}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ position: "fixed", top: 0, left: 0, zIndex: 60, touchAction: "none" }}
      ref={dragRef}
    >
      <div className="relative">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 8 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-16 right-0 w-64 rounded-2xl border border-border bg-card shadow-2xl p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Estilo do Cartão
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                Define o estilo aplicado aos novos links de pagamento gerados.
              </p>

              <button
                onClick={() => handleSelect("classico")}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 mb-2 transition-all ${
                  estilo === "classico"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#0033A0] to-[#001a5c] flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-foreground">Clássico</div>
                  <div className="text-[10px] text-muted-foreground">Cartão atual</div>
                </div>
                {estilo === "classico" && <Check className="h-4 w-4 text-primary" />}
              </button>

              <button
                onClick={() => handleSelect("azul")}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  estilo === "azul"
                    ? "border-[#0033A0] bg-[#0033A0]/5"
                    : "border-border hover:border-[#0033A0]/40"
                }`}
              >
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#003FBF] to-[#0033A0] flex items-center justify-center">
                  <Plane className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-foreground">Estilo Azul</div>
                  <div className="text-[10px] text-muted-foreground">Próxima viagem</div>
                </div>
                {estilo === "azul" && <Check className="h-4 w-4 text-[#0033A0]" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setOpen((v) => !v)}
          className="relative h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white"
          style={{
            background:
              estilo === "azul"
                ? "linear-gradient(135deg, #003FBF, #0033A0)"
                : "linear-gradient(135deg, #0033A0, #001a5c)",
            boxShadow: "0 8px 28px rgba(0,51,160,0.45), 0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {estilo === "azul" ? <Plane className="h-6 w-6" /> : <Ticket className="h-6 w-6" />}
          </motion.div>
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white" />
          <GripVertical className="absolute -left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-white/70" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default EstiloCartaoFAB;
