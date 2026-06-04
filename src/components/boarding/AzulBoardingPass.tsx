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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  // expect DD/MM/YYYY
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
  const isPendente = data.status === "pendente" || data.status === "taxa_pendente";
  const isPago = data.status === "pago" || data.status === "taxa_paga";
  const hasVolta = !!data.volta_data;
  const passageiros = data.passageiros || [];
  const destinoNome = data.destino_nome || data.destino || "—";
  const origemNome = data.origem_nome || data.origem || "—";

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-32">
      {/* ─── Header dark blue ─── */}
      <header
        className="sticky top-0 z-30 px-4 pt-5 pb-4 text-white"
        style={{
          background: "linear-gradient(180deg, #002a6e 0%, #00194a 100%)",
        }}
      >
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <button className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold tracking-wide">Próxima viagem</h1>
          <div className="w-7" />
        </div>
      </header>

      <div className="max-w-[480px] mx-auto px-4 pt-4 space-y-4">
        {/* ─── Pendência (se pendente) ─── */}
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
                    Não se preocupe, você ainda pode concluir essa compra. Entre em contato com seu agente de viagens ou agência e garanta sua reserva.
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

        {/* ─── Sua viagem para ─── */}
        <div className="border-b border-dashed border-gray-300 pb-5">
          <div className="flex items-start justify-between">
            <h2 className="text-[26px] font-light text-gray-800 leading-tight">
              Sua viagem para{" "}
              <span className="text-[#0066cc]">{destinoNome}</span>
            </h2>
            <button className="text-[#0066cc] p-1">
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[15px] text-gray-500 mt-2 leading-snug">
            {formatDateLong(data.ida_data)}
            {hasVolta && <><br />até {formatDateLong(data.volta_data)}</>}
          </p>
          <p className="text-[15px] text-gray-600 mt-3">
            Código da reserva:{" "}
            <span className="font-bold text-gray-900">{data.codigo_reserva || "—"}</span>
          </p>
        </div>

        {/* ─── Viajantes ─── */}
        <div>
          <h3 className="text-xl text-gray-800 mb-3 font-light">Viajantes</h3>
          <div className="border-t border-b border-gray-200">
            <button
              onClick={() => setViajantesOpen((v) => !v)}
              className="w-full flex items-center justify-between py-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full border border-gray-300 flex items-center justify-center text-[11px] font-semibold text-gray-600">
                  {initials(passageiros[0]?.nomeCompleto || passageiros[0]?.nome || "")}
                </div>
              </div>
              {viajantesOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
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
                    {/* Aviso fidelidade */}
                    <div className="rounded-lg bg-[#eef4fb] border border-[#dbe7f5] p-4 flex gap-3">
                      <div className="text-[#0066cc] text-xl">👥</div>
                      <div>
                        <p className="text-[13px] text-gray-700 leading-snug">
                          Alguns passageiros não estão pontuando nessa viagem, cadastre-se para acumular pontos no programa de fidelidade
                        </p>
                        <button className="text-[#0066cc] text-[13px] font-medium mt-2 underline-offset-2 hover:underline">
                          Recolher viajantes
                        </button>
                      </div>
                    </div>

                    {/* Quick action bar */}
                    <div className="bg-gray-100 rounded-md flex items-center justify-between px-4 py-3">
                      <div className="text-gray-500">👤</div>
                      <div className="flex gap-4 text-gray-500">
                        <Luggage className="h-4 w-4" />
                        <Armchair className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Lista de passageiros */}
                    {passageiros.map((p: any, i: number) => (
                      <div
                        key={i}
                        className="rounded-lg border border-gray-200 bg-white p-4 flex items-center gap-3"
                      >
                        <div className="h-10 w-10 rounded-full border border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {initials(p.nomeCompleto || p.nome || "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-gray-900 leading-tight">
                            {p.nomeCompleto || p.nome || "—"}
                          </div>
                          <div className="text-[12px] text-gray-500">
                            CPF: {maskCpf(p.cpfDocumento || p.cpf || "")}
                          </div>
                          <div className="text-[12px] text-[#0066cc] mt-0.5">
                            Inserir nº fidelidade
                          </div>
                        </div>
                        <div className="text-[#0066cc] flex items-center gap-1 text-xs font-medium">
                          <Luggage className="h-4 w-4" /> 0
                        </div>
                      </div>
                    ))}

                    {passageiros.length > 0 && (
                      <div className="rounded-lg bg-[#eef4fb] border-t-0 border border-[#dbe7f5] p-4">
                        <p className="text-[13px] text-[#0066cc] leading-snug mb-3">
                          Adicione seu número de fidelidade ou Cadastre-se e acumule pontos no programa.
                        </p>
                        <button className="bg-[#0066cc] text-white text-[13px] font-semibold px-4 py-2.5 rounded-md flex items-center gap-2">
                          Realizar cadastro <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── Voos (tabs) ─── */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl text-gray-800 font-light">Voos</h3>
            <div className="flex items-center gap-3 text-[13px] text-[#0066cc]">
              <button className="flex items-center gap-1">
                <Edit2 className="h-3.5 w-3.5" /> Alterar voo
              </button>
              <span className="text-gray-300">|</span>
              <button className="flex items-center gap-1">
                ✕ Cancelar voo
              </button>
            </div>
          </div>

          {hasVolta && (
            <div className="flex border-b border-gray-200 mb-3">
              <button
                onClick={() => setTab("ida")}
                className={`flex-1 py-2.5 text-sm font-semibold relative ${
                  tab === "ida" ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {data.origem} ✈ {data.destino}
                {tab === "ida" && (
                  <motion.div
                    layoutId="azul-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
                  />
                )}
              </button>
              <button
                onClick={() => setTab("volta")}
                className={`flex-1 py-2.5 text-sm font-semibold relative ${
                  tab === "volta" ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {data.destino} ✈ {data.origem}
                {tab === "volta" && (
                  <motion.div
                    layoutId="azul-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
                  />
                )}
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
              {detalhesVoo ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            <AnimatePresence>
              {detalhesVoo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-gray-50 space-y-3 text-[13px] text-gray-700">
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Companhia</span>
                      <span className="font-semibold">{data.companhia || "—"}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Classe</span>
                      <span className="font-semibold capitalize">{data.classe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reserva</span>
                      <span className="font-semibold">{data.codigo_reserva}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── Card Azul Fidelidade ─── */}
        <div
          className="rounded-xl p-6 text-white mt-2"
          style={{ background: "linear-gradient(180deg, #0066cc 0%, #0052a3 100%)" }}
        >
          <h3 className="text-[22px] font-light leading-snug">
            Conheça o <span className="font-bold">Programa Fidelidade</span>
          </h3>
          <div className="h-px bg-white/20 my-4" />
          <p className="text-[14px] leading-relaxed">
            Sabia que ao se cadastrar, além de acumular pontos com essa viagem, você pode ter benefícios como:
          </p>
          <ul className="mt-4 space-y-2.5 text-[14px]">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" /> Despacho de bagagem gratuito
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" /> Embarque prioritário
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" /> Acesso a salas VIP
            </li>
          </ul>
          <button className="mt-5 bg-white text-[#0066cc] font-semibold text-[15px] px-6 py-3 rounded-md w-full">
            Cadastre-se
          </button>
        </div>

        {/* ─── Complete sua viagem ─── */}
        <div className="pt-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-full border-2 border-[#0066cc] flex items-center justify-center text-[#0066cc] text-lg">
              +
            </div>
            <h3 className="text-[22px] font-light text-gray-800">Complete sua viagem</h3>
          </div>
          <p className="text-[14px] text-[#0066cc] mb-4">
            Adicione hotéis e ingressos e acumule mais pontos no programa de fidelidade.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "Hotéis", desc: "Sua viagem com conforto e desconto! Ganhe 15% Off no Hotel.", badge: "15%", cta: "CUPOM15", emoji: "🏨" },
              { title: "Carros", desc: "Mais uma comodidade para sua viagem ser inesquecível!", badge: "15%", cta: "CUPOM15", emoji: "🚗" },
              { title: "Seguro Viagem", desc: "Mais tranquilidade a partir de R$ 89,95 por pessoa", badge: null, cta: "Adicionar", emoji: "🛡️" },
              { title: "Ingressos", desc: "Enriqueça sua viagem com Ingressos e Passeios incríveis.", badge: "10%", cta: "Ver opções", emoji: "🎟️" },
            ].map((card, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
                <div className="relative h-24 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-4xl">
                  {card.badge && (
                    <span className="absolute top-0 left-0 bg-[#0066cc] text-white text-xs font-bold px-2 py-1">
                      {card.badge}
                    </span>
                  )}
                  {card.emoji}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="text-[16px] text-[#0066cc] font-medium">{card.title}</div>
                  <p className="text-[12px] text-gray-600 mt-1 leading-snug flex-1">{card.desc}</p>
                  <div className="border-t border-gray-100 mt-3 pt-2">
                    <button className="text-[13px] text-[#0066cc] font-semibold flex items-center justify-between w-full">
                      {card.cta} <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Busque sua reserva */}
          {(data as any).link_detalhes && (
            <a
              href={(data as any).link_detalhes}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <Search className="h-5 w-5 text-[#0066cc] mt-0.5" />
                <p className="text-[14px] text-gray-700 flex-1">
                  Não localizou a reserva do seu voo, hotel ou ingresso?
                </p>
              </div>
              <div className="border border-[#0066cc] rounded-md py-3 text-center text-[#0066cc] font-semibold text-[15px]">
                Busque sua reserva
              </div>
            </a>
          )}
        </div>

        {/* ─── Pagamento PIX (se pendente) ─── */}
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
              {pixCopiado ? (
                <><Check className="h-4 w-4 mr-2" /> Copiado!</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" /> Copiar código PIX</>
              )}
            </Button>
          </div>
        )}

        {/* ─── Bottom actions ─── */}
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            onClick={onDownloadPDF}
            disabled={generatingPdf}
            className="w-full h-12 rounded-lg border-gray-300 text-gray-700 font-semibold"
          >
            {generatingPdf ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Baixar bilhete em PDF</>
            )}
          </Button>
          {data.whatsapp_operador && (
            <Button
              onClick={onWhatsApp}
              className="w-full h-12 rounded-lg bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold"
            >
              <MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* ─── Bottom action tabs (fixed) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
        <div className="max-w-[480px] mx-auto grid grid-cols-4">
          {[
            { icon: Luggage, label: "Bagagens", active: true },
            { icon: Armchair, label: "Assentos", active: true },
            { icon: Mail, label: "Confirmação", active: false },
            { icon: MessageCircle, label: "Mais serviços", active: true },
          ].map((b, i) => {
            const Icon = b.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  if (b.label === "Confirmação") onDownloadPDF();
                  if (b.label === "Mais serviços" && data.whatsapp_operador) onWhatsApp();
                }}
                className={`flex flex-col items-center gap-1 py-3 text-white text-[11px] font-medium ${
                  b.active ? "bg-[#0066cc]" : "bg-gray-400"
                }`}
              >
                <Icon className="h-5 w-5" />
                {b.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AzulBoardingPass;
