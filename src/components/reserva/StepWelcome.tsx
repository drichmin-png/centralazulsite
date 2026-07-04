import { ShieldCheck, Zap, Headphones, ChevronRight, Lock, Star, Award, Users, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logoAzul from "@/assets/logo-azul.png.asset.json";
import windowImg from "@/assets/reserva-window.jpg";

interface StepWelcomeProps {
  onNext: () => void;
}

const StepWelcome = ({ onNext }: StepWelcomeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    >
      {/* Top bar with logo + secure badge */}
      <div className="flex items-center justify-between mb-6">
        <img src={logoAzul.url} alt="Azul" className="h-8 sm:h-10 w-auto" />
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <div className="leading-tight">
            <p className="text-[10px] font-semibold text-slate-700">Ambiente</p>
            <p className="text-[10px] font-bold text-slate-900">100% seguro</p>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center mb-8">
        <div className="sm:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm mb-4"
          >
            <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700">Reserva rápida e segura</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.05]"
          >
            Sua viagem<br />
            <span className="text-blue-600">começa</span> aqui
          </motion.h1>
          <div className="h-1 w-10 bg-blue-600 rounded-full mt-3 mb-4" />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md"
          >
            Preencha seus dados de forma rápida e segura e garanta sua viagem com a <span className="font-bold text-slate-900">Azul</span>.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="sm:col-span-2 relative"
        >
          <div className="relative rounded-[2rem] overflow-hidden shadow-xl shadow-blue-900/10 border border-slate-200">
            <img src={windowImg} alt="Vista da janela do avião" className="w-full h-56 sm:h-72 object-cover" width={1024} height={1024} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute -bottom-3 -left-3 sm:-left-6 bg-slate-900 text-white rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2 max-w-[180px]"
          >
            <Users className="h-4 w-4 text-blue-400 shrink-0" />
            <div className="leading-tight">
              <p className="text-[10px] font-semibold">Mais de 10 milhões</p>
              <p className="text-[10px] text-slate-300">de clientes voando com a Azul</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-3xl bg-white border border-slate-200 p-4 sm:p-5 mb-6 shadow-sm"
      >
        {[
          { Icon: ShieldCheck, title: "Seus dados protegidos", desc: "Informações criptografadas e 100% seguras." },
          { Icon: Zap, title: "Reserva em menos de 3 min", desc: "Processo rápido, simples e sem complicações." },
          { Icon: Headphones, title: "Atendimento especializado", desc: "Suporte humanizado antes, durante e depois." },
        ].map(({ Icon, title, desc }) => (
          <div key={title} className="flex sm:flex-col gap-3 sm:gap-2 sm:text-center items-start sm:items-center">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">{title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button
          onClick={onNext}
          className="w-full h-16 rounded-2xl text-base font-bold shadow-xl shadow-blue-600/25 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-between px-6"
        >
          <span className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <Plane className="h-5 w-5" />
          </span>
          <span>Começar Reserva</span>
          <ChevronRight className="h-5 w-5" />
        </Button>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          <span>Sem taxas ocultas. Transparência do início ao fim.</span>
        </div>
      </motion.div>

      {/* Trust row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-3 gap-3 mt-6 rounded-3xl bg-white border border-slate-200 p-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">10M+</p>
            <p className="text-[10px] text-slate-500">Clientes satisfeitos</p>
          </div>
        </div>
        <div className="text-center">
          <div className="flex justify-center gap-0.5 text-blue-600">
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
          </div>
          <p className="text-[11px] font-bold text-slate-900 mt-1">Avaliação excelente</p>
          <p className="text-[10px] text-slate-500">4,8/5 no Reclame Aqui</p>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Award className="h-5 w-5 text-blue-600" />
          <div className="leading-tight text-right">
            <p className="text-[11px] font-bold text-slate-900">Empresa brasileira</p>
            <p className="text-[10px] text-slate-500">Compromisso com você</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StepWelcome;
