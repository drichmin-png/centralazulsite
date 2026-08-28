import { useState, useEffect, useCallback } from "react";
import { Link2, Copy, Check, Eye, ExternalLink, Search, RefreshCw, Loader2, Plus, DollarSign, ChevronDown, ChevronUp, Mail, Pencil, Save, CreditCard, Plane, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import BoardingPassViewer from "./BoardingPassViewer";

interface PagamentoLink {
  id: string;
  token: string;
  codigo_reserva: string;
  valor: string;
  status: string;
  companhia: string;
  origem: string;
  destino: string;
  created_at: string;
  passageiros: any[];
  codigo_pix: string | null;
  numero_voo: string;
  classe: string;
  ida_data: string;
  ida_partida: string;
  ida_chegada: string;
  volta_data: string | null;
  volta_partida: string | null;
  volta_chegada: string | null;
  assentos?: string[];
  whatsapp_operador?: string | null;
}

const PaymentLinksBlock = ({ operadorId, isAdmin }: { operadorId?: string; isAdmin?: boolean }) => {
  const [links, setLinks] = useState<PagamentoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [sendingBoardingEmailId, setSendingBoardingEmailId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [taxaOpenId, setTaxaOpenId] = useState<string | null>(null);
  const [taxaValor, setTaxaValor] = useState("");
  const [taxaPix, setTaxaPix] = useState("");
  const [taxaMotivo, setTaxaMotivo] = useState("");
  const [taxaSaving, setTaxaSaving] = useState(false);
  const [editPixId, setEditPixId] = useState<string | null>(null);
  const [editPixValue, setEditPixValue] = useState("");
  const [savingPix, setSavingPix] = useState(false);
  const [viewBoardingPass, setViewBoardingPass] = useState<PagamentoLink | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [concluindoId, setConcluindoId] = useState<string | null>(null);
  const [editAssentosId, setEditAssentosId] = useState<string | null>(null);
  const [editAssentosValue, setEditAssentosValue] = useState("");
  const [savingAssentos, setSavingAssentos] = useState(false);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pagamentos")
        .select("id, token, codigo_reserva, valor, status, companhia, origem, destino, created_at, passageiros, codigo_pix, numero_voo, classe, ida_data, ida_partida, ida_chegada, volta_data, volta_partida, volta_chegada, whatsapp_operador, operador_id")
        .neq("status", "lixeira")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!isAdmin && operadorId) {
        query = query.eq("operador_id", operadorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setLinks((data || []) as PagamentoLink[]);
    } catch {
      toast.error("Erro ao carregar links");
    } finally {
      setLoading(false);
    }
  }, [operadorId, isAdmin]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  useEffect(() => {
    const channel = supabase
      .channel("pagamentos-links-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "pagamentos" }, () => fetchLinks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLinks]);

  useEffect(() => {
    if (links.length === 0) return;
    const channels = links.map((link) => {
      const ch = supabase.channel(`payment-view:${link.token}`);
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        setViewerCounts((prev) => ({ ...prev, [link.token]: Object.keys(state).length }));
      });
      ch.subscribe();
      return ch;
    });
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [links]);

  const getLink = (token: string) => `${window.location.origin}/p/${token}`;

  const copyLink = (token: string, id: string) => {
    navigator.clipboard.writeText(getLink(token));
    setCopiedId(id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPix = (pix: string, id: string) => {
    navigator.clipboard.writeText(pix);
    setCopiedId(`pix-${id}`);
    toast.success("PIX copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendTripDetails = async (l: PagamentoLink) => {
    const mainP = l.passageiros?.[0] as any;
    if (!mainP?.email) {
      toast.error("Passageiro sem e-mail cadastrado");
      return;
    }
    setSendingEmailId(l.id);
    try {
      const link = getLink(l.token);
      const { error } = await supabase.functions.invoke("send-reservation-email", {
        body: {
          type: "trip_details",
          codigoReserva: l.codigo_reserva,
          passageiros: l.passageiros,
          companhia: l.companhia,
          origem: l.origem,
          destino: l.destino,
          numeroVoo: l.numero_voo,
          classe: l.classe,
          idaData: l.ida_data,
          idaPartida: l.ida_partida,
          idaChegada: l.ida_chegada,
          voltaData: l.volta_data,
          voltaPartida: l.volta_partida,
          voltaChegada: l.volta_chegada,
          valor: l.valor,
          status: l.status,
          metodoPagamento: "pix",
          linkPagamento: link,
          whatsappOperador: l.whatsapp_operador || "",
        },
      });
      if (error) throw error;
      toast.success(`E-mail de detalhes enviado para ${mainP.email}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar e-mail");
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleSendBoardingPassEmail = async (l: PagamentoLink) => {
    const mainP = l.passageiros?.[0] as any;
    if (!mainP?.email) {
      toast.error("Passageiro sem e-mail cadastrado");
      return;
    }
    setSendingBoardingEmailId(l.id);
    try {
      const link = getLink(l.token);
      const { error } = await supabase.functions.invoke("send-reservation-email", {
        body: {
          type: "boarding_pass",
          codigoReserva: l.codigo_reserva,
          passageiros: l.passageiros,
          companhia: l.companhia,
          origem: l.origem,
          destino: l.destino,
          numeroVoo: l.numero_voo,
          classe: l.classe,
          idaData: l.ida_data,
          idaPartida: l.ida_partida,
          idaChegada: l.ida_chegada,
          voltaData: l.volta_data,
          voltaPartida: l.volta_partida,
          voltaChegada: l.volta_chegada,
          valor: l.valor,
          linkPagamento: link,
          whatsappOperador: l.whatsapp_operador || "",
        },
      });
      if (error) throw error;
      toast.success(`Cartão de embarque enviado para ${mainP.email}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar cartão de embarque");
    } finally {
      setSendingBoardingEmailId(null);
    }
  };

  const handleAddTaxa = async (pagamentoId: string) => {
    if (!taxaValor) {
      toast.error("Informe o valor da taxa");
      return;
    }
    setTaxaSaving(true);
    try {
      const taxaInfo = `---TAXA---\nValor: R$ ${taxaValor}\nPIX: ${taxaPix}\nMotivo: ${taxaMotivo}\nData: ${new Date().toLocaleString("pt-BR")}`;
      const current = links.find(l => l.id === pagamentoId);
      const { error } = await supabase
        .from("pagamentos")
        .update({
          descricao: taxaInfo,
          status: "taxa_pendente",
          codigo_pix: taxaPix || current?.codigo_pix,
        })
        .eq("id", pagamentoId);
      if (error) throw error;
      toast.success("Taxa adicionada com sucesso!");
      setTaxaOpenId(null);
      setTaxaValor("");
      setTaxaPix("");
      setTaxaMotivo("");
      fetchLinks();
    } catch (err: any) {
      toast.error("Erro ao adicionar taxa: " + (err.message || "Tente novamente"));
    } finally {
      setTaxaSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("pagamentos").update({ status: "lixeira" }).eq("id", id);
      if (error) throw error;
      toast.success("Movido para a lixeira!");
      if (expandedId === id) setExpandedId(null);
      fetchLinks();
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = links.filter((l) => {
    if (statusFilter !== "todos" && l.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const mainName = (l.passageiros?.[0] as any)?.nomeCompleto || (l.passageiros?.[0] as any)?.nome || "";
    return l.codigo_reserva.toLowerCase().includes(q) || mainName.toLowerCase().includes(q) || l.companhia.toLowerCase().includes(q);
  });

  const isExpanded = (id: string) => expandedId === id;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 pb-3">
        <h3 className="text-lg font-bold text-foreground">pagamentos</h3>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border/60 bg-muted/20 text-xs font-medium text-foreground appearance-none cursor-pointer pr-7 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center]"
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="confirmado">Confirmado</option>
            <option value="taxa_pendente">Taxa Pendente</option>
          </select>
          <Button variant="outline" size="icon" onClick={fetchLinks} disabled={loading} className="h-9 w-9 rounded-xl border-border/50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, reserva ou companhia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10 rounded-xl text-sm bg-muted/20 border-border/40"
          />
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-2">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Link2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
            {filtered.map((l, i) => {
              const mainName = (l.passageiros?.[0] as any)?.nomeCompleto || (l.passageiros?.[0] as any)?.nome || "—";
              const viewers = viewerCounts[l.token] || 0;
              const expanded = isExpanded(l.id);
              const isTaxaOpen = taxaOpenId === l.id;
              const linkUrl = getLink(l.token);

              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.2 }}
                  className="rounded-2xl border border-border/50 bg-muted/10 overflow-hidden"
                >
                  {/* Collapsed header - always visible */}
                  <button
                    onClick={() => setExpandedId(expanded ? null : l.id)}
                    className="w-full flex items-center gap-2.5 p-3 sm:p-4 text-left transition-colors hover:bg-muted/20"
                  >
                    <Plane className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-semibold text-foreground truncate max-w-[140px] sm:max-w-none">{mainName}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {l.companhia} – {l.origem}›{l.destino} · {l.passageiros?.length || 1}p
                        {viewers > 0 && (
                          <span className="inline-flex items-center gap-1 ml-1.5 text-primary font-medium">
                            <Eye className="h-3 w-3" />{viewers}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-primary whitespace-nowrap shrink-0">R$ {l.valor}</span>
                    <motion.div
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0"
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 sm:px-4 pb-4 space-y-3">
                          {/* Link URL display */}
                          <div className="rounded-xl border border-border/40 bg-card px-3 py-2">
                            <p className="text-[10px] text-muted-foreground font-mono truncate leading-relaxed">{linkUrl}</p>
                          </div>

                          {/* Emitir Taxa + Novo Valor buttons */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaxaOpenId(isTaxaOpen ? null : l.id);
                              }}
                              className="h-11 rounded-xl text-xs font-semibold border-warning/30 text-warning hover:bg-warning/5 gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" /> Emitir Taxa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditPixId(l.id);
                                setEditPixValue(l.codigo_pix || "");
                              }}
                              className="h-11 rounded-xl text-xs font-semibold border-border/60 gap-1.5"
                            >
                              <DollarSign className="h-3.5 w-3.5" /> Novo Valor
                            </Button>
                          </div>

                          {/* Taxa form */}
                          <AnimatePresence>
                            {isTaxaOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="rounded-xl border border-border/40 bg-card p-3 space-y-3">
                                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                                    <DollarSign className="h-3.5 w-3.5" /> Taxa Adicional
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold text-muted-foreground">Valor (R$) *</Label>
                                      <Input placeholder="150,00" value={taxaValor} onChange={(e) => setTaxaValor(e.target.value)} className="h-9 rounded-xl" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold text-muted-foreground">Motivo</Label>
                                      <Input placeholder="Taxa de embarque" value={taxaMotivo} onChange={(e) => setTaxaMotivo(e.target.value)} className="h-9 rounded-xl" />
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground">PIX da Taxa</Label>
                                    <Textarea placeholder="Cole o código PIX" value={taxaPix} onChange={(e) => setTaxaPix(e.target.value)} rows={2} className="resize-none rounded-xl" />
                                  </div>
                                  <Button onClick={() => handleAddTaxa(l.id)} disabled={taxaSaving || !taxaValor} size="sm" className="w-full h-10 rounded-xl font-semibold text-xs">
                                    {taxaSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Salvando...</> : <><Plus className="h-3.5 w-3.5 mr-1.5" /> Gerar Taxa</>}
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Edit PIX inline */}
                          {editPixId === l.id && (
                            <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2.5">
                              <Textarea
                                value={editPixValue}
                                onChange={(e) => setEditPixValue(e.target.value)}
                                rows={2}
                                className="text-xs resize-none rounded-xl"
                                placeholder="Cole o código PIX..."
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={savingPix}
                                  onClick={async () => {
                                    setSavingPix(true);
                                    try {
                                      const { error } = await supabase.from("pagamentos").update({ codigo_pix: editPixValue }).eq("id", l.id);
                                      if (error) throw error;
                                      toast.success("PIX atualizado!");
                                      setEditPixId(null);
                                      fetchLinks();
                                    } catch {
                                      toast.error("Erro ao salvar PIX");
                                    } finally {
                                      setSavingPix(false);
                                    }
                                  }}
                                  className="h-9 gap-1.5 text-xs rounded-xl flex-1"
                                >
                                  {savingPix ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                  Salvar
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditPixId(null)} className="h-9 text-xs rounded-xl">
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Alterar Código PIX */}
                          {editPixId !== l.id && (
                            <Button
                              variant="outline"
                              onClick={() => { setEditPixId(l.id); setEditPixValue(l.codigo_pix || ""); }}
                              className="w-full h-11 rounded-xl text-xs font-semibold border-border/50 gap-1.5"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Alterar Código PIX
                            </Button>
                          )}

                          {/* Enviar e-mail (detalhes da viagem) + Cartão de embarque (email) */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <Button
                              variant="outline"
                              onClick={() => handleSendTripDetails(l)}
                              disabled={sendingEmailId === l.id}
                              className="h-11 rounded-xl text-xs font-semibold border-border/50 gap-1.5"
                            >
                              {sendingEmailId === l.id ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...</>
                              ) : (
                                <><Mail className="h-3.5 w-3.5" /> Enviar e-mail</>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleSendBoardingPassEmail(l)}
                              disabled={sendingBoardingEmailId === l.id}
                              className="h-11 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 gap-1.5"
                            >
                              {sendingBoardingEmailId === l.id ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...</>
                              ) : (
                                <><Plane className="h-3.5 w-3.5" /> Cartão embarque</>
                              )}
                            </Button>
                          </div>

                          {/* Copiar link + Remover */}
                          <div className="grid grid-cols-[1fr_auto] gap-2.5">
                            <Button
                              variant="outline"
                              onClick={() => copyLink(l.token, l.id)}
                              className="h-11 rounded-xl text-xs font-semibold border-border/50 gap-1.5"
                            >
                              {copiedId === l.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Link2 className="h-3.5 w-3.5" />}
                              {copiedId === l.id ? "Copiado!" : "Copiar link"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDelete(l.id)}
                              disabled={deletingId === l.id}
                              className="h-11 rounded-xl text-xs font-semibold border-destructive/30 text-destructive hover:bg-destructive/5 gap-1.5 px-4"
                            >
                              {deletingId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              Remover
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Boarding Pass Viewer Modal */}
      {viewBoardingPass && (
        <BoardingPassViewer
          data={{
            companhia: viewBoardingPass.companhia,
            origem: viewBoardingPass.origem,
            destino: viewBoardingPass.destino,
            numeroVoo: viewBoardingPass.numero_voo,
            classe: viewBoardingPass.classe,
            codigoReserva: viewBoardingPass.codigo_reserva,
            idaData: viewBoardingPass.ida_data,
            idaPartida: viewBoardingPass.ida_partida,
            idaChegada: viewBoardingPass.ida_chegada,
            voltaData: viewBoardingPass.volta_data,
            voltaPartida: viewBoardingPass.volta_partida,
            voltaChegada: viewBoardingPass.volta_chegada,
            passageiros: viewBoardingPass.passageiros,
            token: viewBoardingPass.token,
            valor: viewBoardingPass.valor,
          }}
          onClose={() => setViewBoardingPass(null)}
        />
      )}
    </div>
  );
};

export default PaymentLinksBlock;
