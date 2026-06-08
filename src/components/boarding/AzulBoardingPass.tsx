import { useState } from "react";
import {
  ArrowLeft,
  Plane,
  Edit2,
  ChevronDown,
  ChevronUp,
  Luggage,
  Armchair,
  Mail,
  AlertCircle,
  Check,
  ExternalLink,
  Search,
  Copy,
  MessageCircle,
  Shield,
  Loader2,
  Download,
  Briefcase,
  Backpack,
  Phone,
  CreditCard,
  Facebook,
  Twitter,
  Youtube,
  Instagram,
  Linkedin,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoAzul from "@/assets/logo-azul.png.asset.json";

// Subtract minutes from "HH:MM"
const subtractMinutes = (time: string, minutes: number): string => {
  if (!time || !time.includes(":")) return "--:--";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "--:--";
  const total = (h * 60 + m - minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

// Deterministic hash for stable random per reservation
const hashCode = (s: string): number => {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const getTerminal = (seed: string): string => {
  const t = ["1", "2", "3"];
  return t[hashCode(seed + ":terminal") % t.length];
};

const getPortao = (seed: string): string => {
  const letters = ["A", "B", "C", "D", "E"];
  const h = hashCode(seed + ":portao");
  const letra = letters[h % letters.length];
  const num = (h % 25) + 1;
  return `${letra}${num}`;
};

interface AzulProps {
  data: any;
  onCopyPix: () => void;
  pixCopiado: boolean;
  onWhatsApp: () => void;
  onDownloadPDF: () => void;
  generatingPdf: boolean;
}

const maskCpf = (cpf: string): string => {
  if (!cpf) return "—";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length < 6) return cpf;
  return `${clean.slice(0, 3)}.***.***.${clean.slice(-2)}`;
};

const formatDateLong = (d: string): string => {
  if (!d) return "—";
  const [dd, mm, yyyy] = d.split("/").map((x) => x.trim());
  if (!yyyy) return d;
  const date = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(date.getTime())) return d;
  const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return `${dias[date.getDay()]}, ${dd}/${mm}/${yyyy}`;
};

const initials = (name: string) => {
  if (!name) return "??";
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const AzulBoardingPass = ({
  data,
  onCopyPix,
  pixCopiado,
  onWhatsApp,
  onDownloadPDF,
  generatingPdf,
}: AzulProps) => {
  const [tab, setTab] = useState<"ida" | "volta">("ida");
  const [viajantesOpen, setViajantesOpen] = useState(true);
  const [detalhesVoo, setDetalhesVoo] = useState(false);
  const [modal, setModal] = useState<null | "bagagem" | "assentos" | "confirmacao" | "servicos" | "alterar" | "cancelar">(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isPendente = data.status === "pendente" || data.status === "taxa_pendente";
  const isPago = data.status === "pago" || data.status === "taxa_paga";
  const hasVolta = !!data.volta_data;
  const passageiros = data.passageiros || [];
  const destinoNome = data.destino_nome || data.destino || "—";
  const origemNome = data.origem_nome || data.origem || "—";
  const mainPassenger = passageiros[0] || {};
  const clienteEmail = mainPassenger.email || "";

  const handleEnviarConfirmacao = async () => {
    if (!clienteEmail) {
      toast.error("Nenhum e-mail de cliente encontrado nesta reserva");
      return;
    }
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("send-reservation-email", {
        body: { type: "confirmation", ...data },
      });
      if (error) throw error;
      setEmailSent(true);
      toast.success(`Confirmação enviada para ${clienteEmail}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar e-mail");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAbrirWhatsAppOperador = () => {
    if (!data.whatsapp_operador) {
      toast.error("Atendente não configurou WhatsApp");
      return;
    }
    onWhatsApp();
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-8">
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 pt-5 pb-4 text-white"
        style={{ background: "linear-gradient(180deg, #002a6e 0%, #00194a 100%)" }}
      >
        <div className="max-w-[640px] mx-auto flex items-center justify-between">
          <button className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <img src={logoAzul.url} alt="Azul" className="h-5 w-auto bg-white rounded px-1 py-0.5" />
            <h1 className="text-base font-semibold tracking-wide">Próxima viagem</h1>
          </div>
          <div className="w-7" />
        </div>

      </header>

      <div className="max-w-[640px] mx-auto px-4 pt-4 space-y-4">
        <AnimatePresence>
          {isPendente && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-[#fff6e8] border border-[#f5e4c1] p-4"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-[#a87613] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[15px] font-medium text-[#1a3a6c] leading-snug">
                    Identificamos uma pendência no pagamento da sua viagem
                  </div>
                  <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">
                    Não se preocupe, você ainda pode concluir essa compra. Entre em contato com seu agente de viagens e garanta sua reserva.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {isPago && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-2"
            >
              <Check className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">
                Pagamento confirmado! Boa viagem.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sua viagem para */}
        <div className="border-b border-dashed border-gray-300 pb-5">
          <div className="flex items-start justify-between">
            <h2 className="text-[26px] font-light text-gray-800 leading-tight">
              Sua viagem para <span className="text-[#0066cc]">{destinoNome}</span>
            </h2>
            <button onClick={() => setModal("alterar")} className="text-[#0066cc] p-1">
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[15px] text-gray-500 mt-2 leading-snug">
            {formatDateLong(data.ida_data)}
            {hasVolta && <><br />até {formatDateLong(data.volta_data)}</>}
          </p>
          <p className="text-[15px] text-gray-600 mt-3">
            Código da reserva: <span className="font-bold text-gray-900">{data.codigo_reserva || "—"}</span>
          </p>
        </div>

        {/* Viajantes */}
        <div>
          <h3 className="text-xl text-gray-800 mb-3 font-light">Viajantes</h3>
          <div className="border-t border-b border-gray-200">
            <button
              onClick={() => setViajantesOpen((v) => !v)}
              className="w-full flex items-center justify-between py-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center text-[11px] font-semibold text-gray-600">
                  {initials(mainPassenger.nomeCompleto || mainPassenger.nome || "")}
                </div>
                <span className="text-sm text-gray-700">{passageiros.length} passageiro(s)</span>
              </div>
              {viajantesOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
            </button>

            <AnimatePresence initial={false}>
              {viajantesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pb-4 space-y-3">
                    {passageiros.map((p: any, i: number) => (
                      <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full border border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {initials(p.nomeCompleto || p.nome || "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-gray-900 leading-tight truncate">
                            {p.nomeCompleto || p.nome || "—"}
                          </div>
                          <div className="text-[12px] text-gray-500">
                            CPF: {maskCpf(p.cpfDocumento || p.cpf || "")}
                          </div>
                          {p.assento && (
                            <div className="text-[12px] text-[#0066cc] mt-0.5 font-semibold">
                              Assento {p.assento}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── Quick actions (inline, between Viajantes and Voos) ─── */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="grid grid-cols-4">
            {[
              { key: "bagagem", icon: Luggage, label: "Bagagens" },
              { key: "assentos", icon: Armchair, label: "Assentos" },
              { key: "confirmacao", icon: Mail, label: "Confirmação" },
              { key: "servicos", icon: MessageCircle, label: "Mais serviços" },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <motion.button
                  key={b.key}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setModal(b.key as any)}
                  className="flex flex-col items-center gap-1 py-3 text-[#0066cc] text-[11px] font-semibold hover:bg-blue-50 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  {b.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Voos */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl text-gray-800 font-light">Voos</h3>
            <div className="flex items-center gap-3 text-[13px] text-[#0066cc]">
              <button onClick={() => setModal("alterar")} className="flex items-center gap-1">
                <Edit2 className="h-3.5 w-3.5" /> Alterar voo
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setModal("cancelar")} className="flex items-center gap-1">
                ✕ Cancelar voo
              </button>
            </div>
          </div>

          {hasVolta && (
            <div className="flex border-b border-gray-200 mb-3">
              <button
                onClick={() => setTab("ida")}
                className={`flex-1 py-2.5 text-sm font-semibold relative ${tab === "ida" ? "text-gray-900" : "text-gray-400"}`}
              >
                {data.origem} ✈ {data.destino}
                {tab === "ida" && <motion.div layoutId="azul-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />}
              </button>
              <button
                onClick={() => setTab("volta")}
                className={`flex-1 py-2.5 text-sm font-semibold relative ${tab === "volta" ? "text-gray-900" : "text-gray-400"}`}
              >
                {data.destino} ✈ {data.origem}
                {tab === "volta" && <motion.div layoutId="azul-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />}
              </button>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <Plane className="h-7 w-7 text-[#0066cc]" />
              <div>
                <div className="text-[15px] text-gray-600">Seu voo para</div>
                <div className="text-[17px] font-bold text-gray-900">
                  {tab === "ida" ? destinoNome : origemNome}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-5">
              <div>
                <div className="text-[36px] font-light text-gray-900 leading-none">
                  {tab === "ida" ? data.origem : data.destino}
                </div>
                <div className="text-[20px] text-[#0066cc] font-semibold mt-2">
                  {tab === "ida" ? data.ida_partida : data.volta_partida || "--:--"}
                </div>
                <div className="text-[13px] text-gray-500">
                  {tab === "ida" ? data.ida_data : data.volta_data}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <Plane className="h-5 w-5 text-gray-700 rotate-90" />
                <div className="text-[12px] text-gray-500 mt-2">Voo {data.numero_voo}</div>
              </div>
              <div className="text-right">
                <div className="text-[36px] font-light text-gray-900 leading-none">
                  {tab === "ida" ? data.destino : data.origem}
                </div>
                <div className="text-[20px] text-[#0066cc] font-semibold mt-2">
                  {tab === "ida" ? data.ida_chegada : data.volta_chegada || "--:--"}
                </div>
                <div className="text-[13px] text-gray-500">
                  {tab === "ida" ? data.ida_data : data.volta_data}
                </div>
              </div>
            </div>

            <button
              onClick={() => setDetalhesVoo((v) => !v)}
              className="w-full bg-gray-50 border-t border-gray-100 py-3 text-[14px] text-[#0066cc] font-medium flex items-center justify-center gap-1"
            >
              {detalhesVoo ? "Ocultar detalhes" : "Mostrar detalhes"}
              {detalhesVoo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence>
              {detalhesVoo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-gray-50 space-y-4">
                    {/* Início da viagem - sub card */}
                    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                      <div className="bg-[#eaf2fb] text-center py-2 text-[13px] text-gray-700 font-medium border-b border-gray-200">
                        Início da viagem
                      </div>
                      <div className="p-4 space-y-3 text-[13px]">
                        <div className="text-[15px] font-semibold text-gray-900">
                          Voo {data.numero_voo || "—"}
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-bold text-[#0066cc] leading-tight">
                              {tab === "ida" ? origemNome : destinoNome}
                            </div>
                            <div className="text-[12px] text-gray-500 mt-1">
                              Partida <span className="text-gray-900 font-semibold">{tab === "ida" ? data.ida_partida : data.volta_partida || "--:--"}</span>
                            </div>
                          </div>
                          <div className="text-gray-400 pt-1">→</div>
                          <div className="flex-1 min-w-0 text-right">
                            <div className="text-[15px] font-bold text-[#0066cc] leading-tight">
                              {tab === "ida" ? destinoNome : origemNome}
                            </div>
                            <div className="text-[12px] text-gray-500 mt-1">
                              Chegada <span className="text-gray-900 font-semibold">{tab === "ida" ? data.ida_chegada : data.volta_chegada || "--:--"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between text-[12px] text-gray-600">
                          <div>Embarque: <span className="text-gray-900 font-semibold">{subtractMinutes(tab === "ida" ? data.ida_partida : data.volta_partida, 30)}</span></div>
                          <div>Fim do embarque: <span className="text-gray-900 font-semibold">{subtractMinutes(tab === "ida" ? data.ida_partida : data.volta_partida, 5)}</span></div>
                        </div>
                        <div className="text-[12px] text-gray-600">
                          Terminal <span className="text-gray-900 font-semibold">{getTerminal(data.codigo_reserva + tab)}</span> · Portão <span className="text-gray-900 font-semibold">{getPortao(data.codigo_reserva + tab)}</span>
                        </div>


                        <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between text-[12px]">
                          <div>
                            <div className="text-gray-500">Voo operado por</div>
                            <div className="text-gray-900 font-semibold">{data.companhia || "—"}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-500">Aeronave</div>
                            <div className="text-gray-900 font-semibold">—</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tarifa / Classe */}
                    <div className="flex items-center justify-between text-[13px] px-1">
                      <div>Tarifa <span className="font-bold text-gray-900">{data.companhia || "—"}</span></div>
                      <div>Classe Tarifária <span className="font-bold text-gray-900 capitalize">({(data.classe || "—").toString().charAt(0).toUpperCase()})</span></div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-[13px]">
                      <span className="text-gray-500">Código da reserva</span>
                      <span className="font-bold text-gray-900 tracking-wider">{data.codigo_reserva || "—"}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PIX */}
        {isPendente && data.codigo_pix && (
          <div className="rounded-xl border-2 border-[#0066cc] bg-white p-5 mt-4">
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-2 text-[#0066cc] font-bold text-sm uppercase tracking-wider">
                <Shield className="h-4 w-4" /> Conclua o pagamento
              </div>
              <div className="text-3xl font-extrabold text-gray-900 mt-2">R$ {data.valor}</div>
            </div>
            <div className="flex justify-center mb-3">
              <div className="bg-white border-2 border-gray-100 p-3 rounded-xl">
                <QRCodeSVG value={data.codigo_pix} size={160} />
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 mb-3">
              <p className="text-[10px] text-gray-600 font-mono break-all line-clamp-3 leading-relaxed">
                {data.codigo_pix}
              </p>
            </div>
            <Button
              onClick={onCopyPix}
              className="w-full h-12 rounded-lg bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold"
            >
              {pixCopiado ? <><Check className="h-4 w-4 mr-2" /> Copiado!</> : <><Copy className="h-4 w-4 mr-2" /> Copiar código PIX</>}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            onClick={onDownloadPDF}
            disabled={generatingPdf}
            className="w-full h-12 rounded-lg border-gray-300 text-gray-700 font-semibold"
          >
            {generatingPdf ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><Download className="h-4 w-4 mr-2" /> Baixar bilhete em PDF</>}
          </Button>
          {data.whatsapp_operador && (
            <Button onClick={onWhatsApp} className="w-full h-12 rounded-lg bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold">
              <MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp
            </Button>
          )}
        </div>

        {/* ─── TudoAzul – Diamante Único ─── */}
        <section className="mt-6 -mx-4 px-4 py-6 rounded-none bg-gradient-to-br from-[#001a4d] via-[#002868] to-[#001638] text-white relative overflow-hidden">
          <div className="absolute right-2 top-6 opacity-10 pointer-events-none select-none text-[140px] leading-none">◆</div>
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-blue-200 mb-3 font-semibold">TudoAzul · Programa de Fidelidade</h3>
          <div className="rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-4 max-w-[92%]">
            <div className="text-[15px] font-extrabold mb-3">Nível 5 | DIAMANTE ÚNICO</div>
            <div className="space-y-3 text-[12.5px]">
              <div>
                <div className="font-bold">Economia Extra</div>
                <div className="text-blue-100/90">Mais espaço e conforto em suas viagens internacionais.</div>
              </div>
              <div className="border-t border-white/10 pt-2">
                <div className="font-bold">Lounge Azul em Viracopos</div>
                <div className="text-blue-100/90">Tenha uma experiência especial enquanto espera pelo seu voo.</div>
              </div>
              <div className="border-t border-white/10 pt-2">
                <div className="font-bold">Passagem cortesia para acompanhante</div>
                <div className="text-blue-100/90">Aproveite 4 trechos* para voar Azul com quem você mais gosta.</div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-[14px] font-bold text-white/40">
            <div>Nível 4 | DIAMANTE</div>
            <div>Nível 3 | SAFIRA</div>
            <div>Nível 2 | TOPÁZIO</div>
            <div>Nível 1 | Azul Fidelidade</div>
          </div>
          <p className="text-[10px] text-blue-200/70 mt-3 text-right">*Consulte as condições</p>
        </section>

        {/* ─── Cartão Azul Itaú ─── */}
        <section className="mt-0 -mx-4 px-4 py-6 bg-gradient-to-br from-slate-100 via-white to-blue-50">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#002868] mb-3 font-semibold">Cartão Azul Itaú</h3>
          <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4 shadow-sm">
            <div className="text-[14px] font-extrabold text-[#001638] mb-3 leading-snug">
              Azul Itaú Mastercard Skyline / Visa Infinite
            </div>
            <div className="space-y-3 text-[12.5px] text-gray-700">
              <div>
                <div className="font-bold text-[#001638]">Até 3,5 pontos</div>
                <div>A cada dólar gasto.</div>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <div className="font-bold text-[#001638]">Ganhe 40 mil pontos de bônus</div>
                <div>Mediante o gasto mensal de R$ 20 mil nos 3 primeiros meses.</div>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <div className="font-bold text-[#001638]">Torne-se Diamante</div>
                <div>E garanta os benefícios do nível mais alto do programa.</div>
              </div>
            </div>
            <div className="flex justify-end mt-3">
              <div className="flex -space-x-3">
                <div className="w-14 h-9 rounded-md bg-gradient-to-br from-slate-200 to-slate-400 border border-white shadow-sm" />
                <div className="w-14 h-9 rounded-md bg-gradient-to-br from-blue-200 to-blue-500 border border-white shadow-sm" />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-[14px] font-bold text-slate-400">
            <div>Azul Itaú Platina</div>
            <div>Azul Itaú Gold</div>
            <div>Azul Itaú Internacional</div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 text-right">*Cartão sujeito à análise de crédito.</p>
        </section>

        {/* ─── Regras: Alteração / Cancelamento / Reembolso ─── */}
        <section className="mt-0 -mx-4 bg-white">
          <RegrasTarifaTabs />
        </section>

        {/* ─── Bloco "Ficou com alguma dúvida?" ─── */}
        <section className="mt-4 -mx-4 px-4">
          <div className="rounded-xl bg-[#0066cc] text-white p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <div className="font-bold text-[13px]">Ficou com alguma dúvida? Fale com a gente!</div>
              </div>
              <p className="text-[11px] text-blue-100 leading-snug">
                Estamos aqui para te ajudar. Entre em contato com seu atendente pelo WhatsApp.
              </p>
            </div>
            {data.whatsapp_operador && (
              <button
                onClick={onWhatsApp}
                className="bg-white text-[#0066cc] text-[12px] font-bold px-3 py-2 rounded-md shrink-0"
              >
                Entrar em contato
              </button>
            )}
          </div>
        </section>


        {/* ─── Rodapé estilo Azul (mobile-friendly) ─── */}
        <footer className="mt-8 -mx-4 bg-white border-t border-gray-200">
          <div className="px-4 py-6 space-y-6 text-[13px] text-gray-700">
            {/* Colunas empilhadas no mobile */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Ajuda</h4>
                <ul className="space-y-1.5 text-[12px]">
                  <li><a className="text-[#0066cc]">Central de ajuda</a></li>
                  <li><a className="text-[#0066cc]">Sua solicitação</a></li>
                  <li><a className="text-[#0066cc]">Cancelamento</a></li>
                  <li><a className="text-[#0066cc]">Check-in</a></li>
                  <li><a className="text-[#0066cc]">Status do voo</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">Conheça</h4>
                <ul className="space-y-1.5 text-[12px]">
                  <li><a className="text-[#0066cc]">Programa Fidelidade</a></li>
                  <li><a className="text-[#0066cc]">Empresas</a></li>
                  <li><a className="text-[#0066cc]">Mapa de rotas</a></li>
                  <li><a className="text-[#0066cc]">Revista</a></li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-2">Formas de Pagamento</h4>
              <p className="text-[11px] text-gray-500 mb-2">Crédito</p>
              <div className="flex flex-wrap gap-1.5">
                {["Visa","Master","Amex","Hiper","Elo","Diners"].map((b) => (
                  <span key={b} className="text-[10px] font-bold bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700">
                    {b}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-3 mb-2">Outros</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-bold bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700">PIX</span>
                <span className="text-[10px] font-bold bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700">Boleto</span>
              </div>
            </div>

            <div className="rounded-lg bg-[#eef4fb] border border-[#dbe7f5] p-4">
              <h4 className="font-bold text-gray-900 mb-2">Precisa falar com a gente?</h4>
              <p className="text-[12px] text-gray-600 mb-3">
                Fale com seu atendente pelo WhatsApp para suporte imediato.
              </p>
              {data.whatsapp_operador && (
                <button
                  onClick={onWhatsApp}
                  className="w-full bg-[#25D366] text-white text-[13px] font-semibold px-3 py-2.5 rounded-md flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" /> Bate-papo no WhatsApp
                </button>
              )}
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-2">Nossas redes sociais</h4>
              <div className="flex gap-3 text-[#0066cc]">
                <Facebook className="h-5 w-5" />
                <Twitter className="h-5 w-5" />
                <Youtube className="h-5 w-5" />
                <Instagram className="h-5 w-5" />
                <Linkedin className="h-5 w-5" />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-bold text-gray-900 mb-2 text-[12px]">Condições da tarifa</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Esta é uma tarifa promocional com regras específicas de utilização. Compras realizadas estão sujeitas a regras de cancelamento, alteração e reembolso conforme tarifa adquirida.
              </p>
              <div className="mt-4 text-[10.5px] text-gray-500 leading-relaxed">
                Av. Marcos P. de U. Rodrigues, 939 - Edif. C. Branco Office Park, Torre Jatobá, 11º andar<br />
                Alphaville Industrial - Barueri, SP - 06460-040 - CNPJ: 09.296.295/0001-60
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                © {new Date().getFullYear()} Azul — Linhas Aéreas Brasileiras
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* ─── Modais ─── */}
      <Dialog open={modal === "bagagem"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0066cc]">
              <Luggage className="h-5 w-5" /> Bagagens incluídas
            </DialogTitle>
            <DialogDescription>
              Sua reserva tem {passageiros.length} passageiro(s). Cada um tem direito a:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {passageiros.map((p: any, i: number) => (
              <div key={i} className="rounded-lg border border-gray-200 p-3">
                <div className="text-sm font-bold text-gray-900 mb-2">
                  {p.nomeCompleto || p.nome || `Passageiro ${i + 1}`}
                </div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Briefcase className="h-4 w-4 text-[#0066cc]" /> 1 bagagem despachada de até <b>23 kg</b>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Backpack className="h-4 w-4 text-[#0066cc]" /> 1 mochila/item pessoal para a cabine
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-gray-500">
              Total: {passageiros.length} bagagem(ns) de 23 kg + {passageiros.length} mochila(s) de cabine.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "assentos"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0066cc]">
              <Armchair className="h-5 w-5" /> Assentos confirmados
            </DialogTitle>
            <DialogDescription>
              Assentos selecionados ao gerar o link da sua reserva:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {passageiros.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div className="text-sm font-semibold text-gray-800 truncate">
                  {p.nomeCompleto || p.nome || `Passageiro ${i + 1}`}
                </div>
                <div className="flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-[#0066cc]" />
                  <span className="font-bold text-[#0066cc]">{p.assento || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "confirmacao"} onOpenChange={(o) => { if (!o) { setModal(null); setEmailSent(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0066cc]">
              <Mail className="h-5 w-5" /> Confirmação por e-mail
            </DialogTitle>
            <DialogDescription>
              Enviar todos os detalhes da reserva para <b>{clienteEmail || "—"}</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900">
            ⚠️ A liberação para embarque só será feita após o pagamento completo. O comprovante deve ser encaminhado ao atendente para liberação rápida.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Fechar</Button>
            <Button
              onClick={handleEnviarConfirmacao}
              disabled={sendingEmail || emailSent || !clienteEmail}
              className="bg-[#0066cc] hover:bg-[#0052a3]"
            >
              {sendingEmail ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : emailSent ? <><Check className="h-4 w-4 mr-2" /> Enviado</> : <><Mail className="h-4 w-4 mr-2" /> Enviar agora</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "servicos"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0066cc]">
              <MessageCircle className="h-5 w-5" /> Mais serviços
            </DialogTitle>
            <DialogDescription>
              Para serviços adicionais, fale com o atendente responsável pela sua reserva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-[12px] text-gray-500 mb-1">Atendente</div>
              <div className="font-bold text-gray-900 flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#0066cc]" />
                {data.whatsapp_operador || "Não informado"}
              </div>
            </div>
            <Button
              onClick={handleAbrirWhatsAppOperador}
              disabled={!data.whatsapp_operador}
              className="w-full bg-[#25D366] hover:bg-[#20BD5A]"
            >
              <MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "alterar"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" /> Alteração não disponível
            </DialogTitle>
            <DialogDescription>
              Esta compra é uma <b>tarifa promocional</b> e não permite alteração direta.
            </DialogDescription>
          </DialogHeader>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            Somente o atendente responsável pela reserva pode realizar alterações. Entre em contato pelo WhatsApp para verificar disponibilidade e condições.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Fechar</Button>
            {data.whatsapp_operador && (
              <Button onClick={onWhatsApp} className="bg-[#25D366] hover:bg-[#20BD5A]">
                <MessageCircle className="h-4 w-4 mr-2" /> Falar com atendente
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "cancelar"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" /> Aviso Importante
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[13px] text-gray-700 leading-relaxed">
            <p>
              Esta é uma <b>tarifa promocional</b> com condições especiais de emissão. Após a confirmação da compra, cancelamentos, desistências, alterações ou solicitações de encerramento da reserva poderão resultar na <b>perda total dos valores pagos</b>, sem direito a reembolso, conforme as regras aplicáveis à tarifa adquirida.
            </p>
            <p>
              Em situações em que alterações ou cancelamentos sejam permitidos, poderão ser aplicadas <b>multas, taxas operacionais e diferenças tarifárias</b>. Ao finalizar a compra, o cliente concorda expressamente com estas condições e reconhece estar adquirindo uma reserva promocional sujeita a regras específicas de utilização.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Entendi</Button>
            {data.whatsapp_operador && (
              <Button onClick={onWhatsApp} className="bg-[#25D366] hover:bg-[#20BD5A]">
                <MessageCircle className="h-4 w-4 mr-2" /> Falar com atendente
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AzulBoardingPass;
