import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plane, ChevronDown, ChevronUp, AlertTriangle, Shield, Info, Copy, Check, Loader2, Lock, Download, MessageCircle, ArrowLeftRight, QrCode, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateBoardingPassPDF } from "@/lib/generateBoardingPassPDF";
import { getAirportName, getCityName } from "@/lib/airportCodes";
import CartaoForm from "@/components/pagamento/CartaoForm";

interface PagamentoData {
  id: string;
  token: string;
  passageiros: any[];
  origem: string;
  destino: string;
  companhia: string;
  numero_voo: string;
  classe: string;
  ida_data: string;
  ida_partida: string;
  ida_chegada: string;
  volta_data: string | null;
  volta_partida: string | null;
  volta_chegada: string | null;
  descricao: string | null;
  codigo_reserva: string;
  valor: string;
  whatsapp_cliente: string | null;
  codigo_pix: string | null;
  metodo_pagamento: string;
  status: string;
  whatsapp_operador: string | null;
  created_at: string;
}

const calcBoardingTime = (partida: string): string => {
  if (!partida || !partida.includes(":")) return partida;
  const [h, m] = partida.split(":").map(Number);
  const totalMin = h * 60 + m - 20;
  const bh = Math.floor(((totalMin + 1440) % 1440) / 60);
  const bm = (totalMin + 1440) % 60;
  return `${String(bh).padStart(2, "0")}:${String(bm).padStart(2, "0")}`;
};

const maskCpf = (cpf: string): string => {
  if (!cpf) return "—";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length < 6) return cpf;
  return `${clean.slice(0, 3)}.***.***.${clean.slice(-2)}`;
};

const BoardingPass = () => {
  const [searchParams] = useSearchParams();
  // Sanitize token: remove whitespace, line breaks, and any trailing junk from copy/paste
  const rawToken = searchParams.get("token") || "";
  const token = rawToken.trim().replace(/[^a-zA-Z0-9]/g, "");
  const [data, setData] = useState<PagamentoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<"pix" | "cartao">("pix");
  const [cartaoEnviado, setCartaoEnviado] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const fetchData = async () => {
      // Use maybeSingle so we don't error when 0 or >1 rows match — handle both gracefully
      const { data: pg, error } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (error) {
        console.error("[BoardingPass] Lookup error:", error, "token:", token);
      }
      if (pg) setData(pg as unknown as PagamentoData);
      setLoading(false);
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const channel = supabase.channel(`payment-view:${token}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [token]);

  const handleCopyPix = () => {
    if (data?.codigo_pix) {
      navigator.clipboard.writeText(data.codigo_pix);
      setPixCopiado(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setPixCopiado(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    if (data?.whatsapp_operador) {
      const msg = encodeURIComponent(`Olá! Referente à reserva ${data.codigo_reserva} - ${mainPassenger.nomeCompleto || mainPassenger.nome || ""}. Preciso de ajuda.`);
      window.open(`https://wa.me/${data.whatsapp_operador}?text=${msg}`, "_blank");
    }
  };

  const handleDownloadPDF = async () => {
    if (!data) return;
    setGeneratingPdf(true);
    try {
      await generateBoardingPassPDF(data, calcBoardingTime);
      toast.success("Bilhete gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-white/60 text-sm">Carregando bilhete...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center text-foreground max-w-sm">
          <Plane className="h-12 w-12 mx-auto mb-4 opacity-60 text-primary" />
          <h2 className="text-xl font-bold mb-2">Pagamento não encontrado</h2>
          <p className="text-sm opacity-70 mb-3">Verifique o link e tente novamente.</p>
          {rawToken && (
            <p className="text-[10px] font-mono text-muted-foreground break-all bg-muted/30 rounded p-2">
              Token: {rawToken}
            </p>
          )}
        </div>
      </div>
    );
  }

  const mainPassenger = data.passageiros?.[0] || {};
  const hasVolta = !!data.volta_data;
  const classeLabel = data.classe === "executiva" ? "Executiva" : data.classe === "primeira" ? "Primeira" : "Econômica";
  const isPendente = data.status === "pendente" || data.status === "taxa_pendente";
  const classeDisplay = data.classe === "executiva" ? "Executive" : data.classe === "primeira" ? "First Class" : "Premium";

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">

      <div className="max-w-[430px] mx-auto min-h-screen flex flex-col relative z-10">
        <AnimatePresence mode="wait">
          {showPayment ? (
            /* ═══════ PAYMENT VIEW ═══════ */
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              {/* Blue header */}
              <div className="px-5 pt-8 pb-6">
                <button
                  onClick={() => setShowPayment(false)}
                  className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary/80 transition-colors mb-5"
                >
                  ← Voltar ao bilhete
                </button>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-white/70 font-medium">{data.companhia || "Companhia"} ✈</span>
                  <div className="text-right">
                    <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">{data.companhia || "AÉREA"}</div>
                    <div className="text-sm font-bold text-white italic">{classeDisplay}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-semibold mb-0.5">Reserva</div>
                  <div className="text-lg font-extrabold text-white">
                    {mainPassenger.nomeCompleto || mainPassenger.nome || "—"}{" "}
                    <span className="font-mono tracking-wider opacity-80">{data.codigo_reserva}</span>
                  </div>
                </div>
              </div>

              {/* White card */}
              <div className="flex-1 rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
                <div className="flex-1 px-6 pt-7 pb-6 space-y-5">

                  {/* Flight info summary */}
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-[#0033A0]" />
                        <span className="text-xs font-bold text-gray-800">Informações do Voo</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">{data.numero_voo}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Rota</div>
                        <div className="font-bold text-gray-800 mt-0.5">
                          {getAirportName(data.origem)} → {getAirportName(data.destino)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{data.origem} → {data.destino}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Data</div>
                        <div className="font-bold text-gray-800 mt-0.5">{data.ida_data || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Partida</div>
                        <div className="font-bold text-gray-800 mt-0.5">{data.ida_partida || "--:--"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Classe</div>
                        <div className="font-bold text-gray-800 mt-0.5">{classeLabel}</div>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="text-center py-3 rounded-2xl bg-[#0033A0]/[0.03] border border-[#0033A0]/10">
                    <div className="text-[10px] text-[#0033A0] uppercase tracking-[0.2em] font-bold mb-1.5">Total a pagar</div>
                    <div className="text-4xl font-extrabold text-gray-900">R$ {data.valor}</div>
                  </div>

                  {/* Details toggle */}
                  <button
                    onClick={() => setDetalhesAbertos(!detalhesAbertos)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                    {detalhesAbertos ? "Fechar detalhes" : "Mais detalhes"}
                    {detalhesAbertos ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  <AnimatePresence>
                    {detalhesAbertos && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2 text-xs">
                          {data.passageiros.map((p: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
                              <div className="w-6 h-6 rounded-full bg-[#0033A0]/10 flex items-center justify-center text-xs font-bold text-[#0033A0]">{i + 1}</div>
                              <div>
                                <div className="font-semibold text-gray-800">{p.nomeCompleto || p.nome || "—"}</div>
                                <div className="text-gray-400 text-[10px]">CPF: {maskCpf(p.cpfDocumento || p.cpf || "")}</div>
                              </div>
                            </div>
                          ))}
                          {hasVolta && (
                            <div className="border-t border-gray-200 pt-2 mt-2">
                              <div className="text-gray-400 uppercase text-[10px] font-semibold mb-1">Volta</div>
                              <div className="text-gray-800 font-medium">{data.volta_data} · {data.volta_partida} → {data.volta_chegada}</div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Seletor de método de pagamento */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod("pix")}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        payMethod === "pix"
                          ? "border-[#0033A0] bg-[#0033A0]/5 text-[#0033A0]"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <QrCode className="h-4 w-4" /> PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod("cartao")}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                        payMethod === "cartao"
                          ? "border-[#0033A0] bg-[#0033A0]/5 text-[#0033A0]"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" /> Cartão
                    </button>
                  </div>

                  {/* PIX */}
                  {payMethod === "pix" && data.codigo_pix && (
                    <div className="space-y-4">
                      <div className="text-center text-[10px] text-gray-400 uppercase tracking-[0.15em] font-bold">
                        QR Code PIX
                      </div>
                      <div className="flex justify-center">
                        <div className="bg-white border-2 border-[#0033A0]/10 p-5 rounded-2xl shadow-lg">
                          <QRCodeSVG value={data.codigo_pix} size={180} />
                        </div>
                      </div>
                      <p className="text-xs text-center text-gray-400">Escaneie para pagar via PIX</p>

                      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                        <p className="text-[10px] text-gray-500 font-mono break-all leading-relaxed line-clamp-3">
                          {data.codigo_pix}
                        </p>
                      </div>

                      <Button
                        onClick={handleCopyPix}
                        className="w-full h-12 text-sm font-bold rounded-xl bg-[#0033A0] hover:bg-[#002880] text-white shadow-lg shadow-[#0033A0]/20"
                      >
                        {pixCopiado ? (
                          <><Check className="h-4 w-4 mr-2" /> Código Copiado!</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-2" /> Copiar Código PIX</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Cartão */}
                  {payMethod === "cartao" && (
                    cartaoEnviado ? (
                      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center space-y-2">
                        <Loader2 className="h-6 w-6 text-amber-600 animate-spin mx-auto" />
                        <p className="text-sm font-bold text-amber-800">Pagamento em análise</p>
                        <p className="text-xs text-amber-700">
                          Estamos validando os dados do seu cartão. Você receberá a confirmação em alguns minutos.
                        </p>
                      </div>
                    ) : (
                      <CartaoForm
                        pagamentoId={data.id}
                        valor={data.valor}
                        onBack={() => setPayMethod("pix")}
                        onSuccess={() => setCartaoEnviado(true)}
                      />
                    )
                  )}


                  {/* Action buttons - well spaced */}
                  <div className="space-y-3 pt-1">
                    <Button
                      variant="outline"
                      onClick={handleDownloadPDF}
                      disabled={generatingPdf}
                      className="w-full h-12 text-sm font-bold rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      {generatingPdf ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando bilhete...</>
                      ) : (
                        <><Download className="h-4 w-4 mr-2" /> Baixar Bilhete em PDF</>
                      )}
                    </Button>

                    {data.whatsapp_operador && (
                      <Button
                        onClick={handleWhatsApp}
                        className="w-full h-12 text-sm font-bold rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg shadow-[#25D366]/20"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Falar no WhatsApp
                      </Button>
                    )}
                  </div>

                  {/* Security */}
                  <div className="text-center space-y-3 pt-3 pb-2">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-700">
                      <Lock className="h-3.5 w-3.5" />
                      Pagamento 100% Seguro
                    </div>
                    <div className="flex justify-center gap-4">
                      {[
                        { icon: "🔐", label: "Criptografia\nponta a ponta" },
                        { icon: "✅", label: "Verificação\nautomática" },
                        { icon: "🛡️", label: "Proteção\ncertificada" },
                      ].map((b, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 w-20">
                          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-sm bg-gray-50">{b.icon}</div>
                          <span className="text-[9px] text-gray-400 text-center whitespace-pre-line leading-tight">{b.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400">
                      <span>🔒 SSL</span>
                      <span>✓ PCI</span>
                      <span>🏛️ LGPD</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 text-center mt-auto" style={{ background: "linear-gradient(135deg, #0033A0, #002080)" }}>
                  <div className="text-xs font-bold text-white tracking-wide">Pagamento processado com segurança</div>
                  <div className="text-[10px] text-white/50 mt-0.5">Transação protegida · Dados criptografados</div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ═══════ BOARDING PASS VIEW ═══════ */
            <motion.div
              key="boarding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex items-center justify-center py-6 px-4"
            >
              {/* ── SINGLE UNIFIED CARD ── */}
              <div className="w-full max-w-[430px] rounded-[28px] overflow-hidden shadow-[0_16px_60px_rgba(0,0,0,0.25),0_4px_16px_rgba(0,0,0,0.1)]">

                {/* ── HEADER AZUL ── */}
                <div style={{ background: "linear-gradient(135deg, #003FBF 0%, #0033A0 50%, #002080 100%)" }} className="px-6 pt-7 pb-8">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-sm text-white/80 font-semibold">
                      {data.companhia || "Azul"} ✈
                    </span>
                    <div className="text-right">
                      <div className="text-[11px] text-white/50 uppercase tracking-[0.2em] font-bold leading-tight">
                        {(data.companhia || "AZUL LINHAS AÉREAS").toUpperCase()}
                      </div>
                      <div className="text-base font-extrabold text-white italic tracking-wide">{classeDisplay}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-1">Cliente</div>
                    <div className="text-[22px] font-extrabold text-white uppercase tracking-wide leading-tight">
                      {mainPassenger.nomeCompleto || mainPassenger.nome || "—"}
                    </div>
                  </div>
                </div>

                {/* ── CORPO BRANCO ── */}
                <div className="bg-white px-6 pt-7 pb-5">

                  {/* Route */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="text-base font-bold text-gray-900 leading-tight">{getCityName(data.origem)}</div>
                      <div className="text-[28px] font-black text-gray-900 tracking-wider leading-none">{data.origem || "—"}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Origem</div>
                    </div>
                    <div className="flex flex-col items-center pt-3">
                      <Plane className="h-6 w-6 text-[#0033A0]" />
                      <div className="text-[10px] text-gray-400 mt-1.5 font-medium">Voo {data.numero_voo || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-gray-900 leading-tight">{getCityName(data.destino)}</div>
                      <div className="text-[28px] font-black text-gray-900 tracking-wider leading-none">{data.destino || "—"}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Destino</div>
                    </div>
                  </div>

                  {/* Times */}
                  <div className="flex justify-between mb-6">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Partida</div>
                      <div className="text-[40px] font-extrabold text-gray-900 leading-none mt-1">{data.ida_partida || "--:--"}</div>
                      <div className="text-[12px] text-[#0033A0] font-semibold mt-1">{data.ida_data || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Chegada</div>
                      <div className="text-[40px] font-extrabold text-gray-900 leading-none mt-1">{data.ida_chegada || "--:--"}</div>
                      <div className="text-[12px] text-[#0033A0] font-semibold mt-1">{data.ida_data || "—"}</div>
                    </div>
                  </div>

                  {/* Boarding + Gate + QR */}
                  <div className="flex justify-between items-end mb-5">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Embarque</div>
                      <div className="text-2xl font-extrabold text-gray-900 leading-none mt-1">{calcBoardingTime(data.ida_partida)}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-4">Portão</div>
                      <div className="text-xl font-extrabold text-gray-900 leading-none mt-1">—</div>
                    </div>
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                      <QRCodeSVG value={data.codigo_reserva || "BOARDING"} size={110} />
                    </div>
                  </div>

                  {/* Volta card */}
                  {hasVolta && (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 mb-5">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#0033A0] mb-3">
                        <ArrowLeftRight className="h-4 w-4" />
                        VOLTA
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-semibold">Data</div>
                          <div className="font-bold text-gray-900 text-sm mt-0.5">{data.volta_data}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-semibold">Partida</div>
                          <div className="font-bold text-gray-900 text-sm mt-0.5">{data.volta_partida || "--:--"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 uppercase font-semibold">Chegada</div>
                          <div className="font-bold text-gray-900 text-sm mt-0.5">{data.volta_chegada || "--:--"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Ticket tear divider ── */}
                <div className="relative flex items-center bg-white px-0">
                  <div className="absolute -left-3 w-6 h-6 rounded-full z-10" style={{ background: "linear-gradient(145deg, #003FBF, #0033A0)" }} />
                  <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-4" />
                  <div className="absolute -right-3 w-6 h-6 rounded-full z-10" style={{ background: "linear-gradient(145deg, #003FBF, #0033A0)" }} />
                </div>

                {/* ── Bottom section (still white) ── */}
                <div className="bg-white px-6 pt-5 pb-5">
                  {/* Seat + Embarque prioritário */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex gap-8">
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Assento</div>
                        <div className="text-xl font-extrabold text-gray-900">{(mainPassenger as any)?.assento || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Seção</div>
                        <div className="text-xl font-extrabold text-gray-900">{(mainPassenger as any)?.secao || "—"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-[#0033A0]/15 bg-[#0033A0]/5 px-3.5 py-2">
                      <Shield className="h-3.5 w-3.5 text-[#0033A0]" />
                      <span className="text-[11px] font-bold text-[#0033A0]">Embarque prioritário</span>
                    </div>
                  </div>

                  {/* More details */}
                  <button
                    onClick={() => setDetalhesAbertos(!detalhesAbertos)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-50/50 py-3 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors mb-4"
                  >
                    <Info className="h-4 w-4" />
                    {detalhesAbertos ? "Fechar detalhes" : "Mais detalhes"}
                    {detalhesAbertos ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  <AnimatePresence>
                    {detalhesAbertos && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                            <h4 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                              👤 Dados do Passageiro
                            </h4>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                              {[
                                { label: "Nome", value: mainPassenger.nomeCompleto || mainPassenger.nome || "—" },
                                { label: "CPF", value: maskCpf(mainPassenger.cpfDocumento || mainPassenger.cpf || "") },
                                { label: "Companhia", value: data.companhia || "—" },
                                { label: "Voo", value: data.numero_voo || "—" },
                                { label: "Classe", value: classeLabel },
                                { label: "Reserva", value: data.codigo_reserva || "—", highlight: true },
                              ].map((item, i) => (
                                <div key={i}>
                                  <div className="text-[10px] text-gray-400 uppercase font-semibold">{item.label}</div>
                                  <div className={`font-semibold mt-0.5 ${item.highlight ? "text-[#0033A0]" : "text-gray-800"}`}>{item.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {hasVolta && (
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                              <h4 className="text-xs font-bold text-gray-800 mb-3">✈️ Voo de Volta</h4>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Data</div>
                                  <div className="font-semibold text-gray-800">{data.volta_data}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Partida</div>
                                  <div className="font-semibold text-gray-800">{data.volta_partida || "--:--"}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Chegada</div>
                                  <div className="font-semibold text-gray-800">{data.volta_chegada || "--:--"}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                            <h4 className="text-xs font-bold text-gray-800 mb-3">ℹ️ Informações Adicionais</h4>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                              {[
                                { label: "Tipo de Tarifa", value: "Promo" },
                                { label: "Bagagem", value: "🧳 23kg" },
                                { label: "Bag. de Mão", value: "1x até 10kg" },
                                { label: "Classe", value: classeLabel },
                              ].map((item, i) => (
                                <div key={i}>
                                  <div className="text-[10px] text-gray-400 uppercase font-semibold">{item.label}</div>
                                  <div className="font-semibold text-gray-800">{item.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {data.passageiros.length > 1 && (
                            <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                              <h4 className="text-xs font-bold text-gray-800 mb-3">
                                👥 Passageiros ({data.passageiros.length})
                              </h4>
                              {data.passageiros.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                                  <div className="w-6 h-6 rounded-full bg-[#0033A0]/10 flex items-center justify-center text-xs font-bold text-[#0033A0]">
                                    {i + 1}
                                  </div>
                                  <div className="flex-1 text-xs">
                                    <div className="font-semibold text-gray-800">{p.nomeCompleto || p.nome || "—"}</div>
                                    <div className="text-gray-400">CPF: {maskCpf(p.cpfDocumento || p.cpf || "")}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Payment pending */}
                  {isPendente && (() => {
                    const isTaxa = data.status === "taxa_pendente";
                    let taxaValorTxt = "";
                    let taxaCodigo = "";
                    if (isTaxa && typeof data.descricao === "string" && data.descricao.includes("---TAXA---")) {
                      const valorMatch = data.descricao.match(/Valor:\s*R\$\s*([^\n]+)/i);
                      const pixMatch = data.descricao.match(/PIX:\s*([^\n]+)/i);
                      if (valorMatch) taxaValorTxt = valorMatch[1].trim();
                      if (pixMatch) taxaCodigo = pixMatch[1].trim();
                    }
                    if (!taxaCodigo && data.codigo_pix) taxaCodigo = data.codigo_pix;
                    return (
                      <button
                        onClick={() => { setShowPayment(true); setDetalhesAbertos(false); }}
                        className="w-full rounded-2xl bg-amber-50 border border-amber-200 py-4 px-4 flex flex-col items-center justify-center gap-1.5 hover:bg-amber-100 transition-colors active:scale-[0.98] mb-4"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-bold text-amber-700">
                            {isTaxa ? "Taxa pendente" : "Reserva aguardando pagamento"}
                          </span>
                        </div>
                        {isTaxa && taxaValorTxt && (
                          <span className="text-base font-extrabold text-amber-800">R$ {taxaValorTxt}</span>
                        )}
                        {isTaxa && taxaCodigo && (
                          <span className="text-[10px] font-mono text-amber-700/80 break-all px-2 leading-tight">
                            {taxaCodigo.length > 60 ? taxaCodigo.slice(0, 60) + "…" : taxaCodigo}
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {data.status === "pago" && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center mb-4">
                      <span className="text-emerald-700 font-bold text-sm">✅ Pagamento confirmado!</span>
                    </div>
                  )}

                  {data.status === "taxa_paga" && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center mb-4">
                      <span className="text-emerald-700 font-bold text-sm">✅ Todos os pagamentos confirmados!</span>
                    </div>
                  )}

                  {/* Notices */}
                  <div className="space-y-1.5 mb-4">
                    <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                      Os assentos reservados podem ser disponibilizados a outros viajantes caso exceda o prazo de sua reserva.
                    </p>
                    <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                      Os demais detalhes estarão informados após a emissão. Caso tenha dúvidas, consulte o atendente.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-3">
                    {data.whatsapp_operador && (
                      <Button
                        onClick={handleWhatsApp}
                        className="w-full h-12 text-sm font-bold rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg shadow-[#25D366]/20 border-0"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Falar no WhatsApp
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── FOOTER AZUL ── */}
                <div className="px-6 py-4 text-center" style={{ background: "linear-gradient(135deg, #0033A0, #002080)" }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Lock className="h-3 w-3 text-white/60" />
                    <span className="text-[11px] font-bold text-white/80">Transação protegida</span>
                  </div>
                  <div className="text-[10px] text-white/40">Dados criptografados · SSL · LGPD</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BoardingPass;
