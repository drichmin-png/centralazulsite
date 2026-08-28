import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Copy, Check, ChevronDown, ChevronUp, Loader2, RefreshCw, CreditCard, Search, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface Reserva {
  id: string;
  codigo_reserva: string;
  adultos: number;
  criancas: number;
  bebes: number;
  passageiros: any[];
  assentos: string[];
  metodo_pagamento: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  confirmado: { label: "Confirmado", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive border-destructive/20" },
  pago: { label: "Pago", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

const statusBadge = (status: string) => {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${config.className}`}>
      {config.label}
    </span>
  );
};

interface PedidosSectionProps {
  onCountChange?: (count: number) => void;
  operadorId?: string;
  isAdmin?: boolean;
}

const PedidosSection = ({ onCountChange, operadorId, isAdmin }: PedidosSectionProps) => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchReservas = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("reservas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!isAdmin && operadorId) {
        query = query.eq("operador_id", operadorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []) as Reserva[];
      setReservas(list);
      onCountChange?.(list.length);
    } catch {
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, [onCountChange, operadorId, isAdmin]);

  useEffect(() => { fetchReservas(); }, [fetchReservas]);

  useEffect(() => {
    const channel = supabase
      .channel("reservas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => fetchReservas())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReservas]);

  const sexoLabel = (s: string) => {
    if (s === "masculino") return "Masculino";
    if (s === "feminino") return "Feminino";
    return "—";
  };

  const copyPedido = (r: Reserva) => {
    const passageirosText = (r.passageiros || []).map((p: any, i: number) => {
      return [
        `Passageiro ${i + 1}: ${p.nomeCompleto || p.nome || "—"}`,
        `  CPF: ${p.cpf || p.cpfDocumento || "—"}`,
        `  Nascimento: ${p.dataNascimento || "—"}`,
        `  Sexo: ${sexoLabel(p.sexo || "")}`,
        `  Telefone: ${p.telefone || "—"}`,
        `  Email: ${p.email || "—"}`,
      ].join("\n");
    }).join("\n\n");

    const text = [
      `Código: ${r.codigo_reserva}`,
      `Status: ${r.status}`,
      `Data: ${new Date(r.created_at).toLocaleString("pt-BR")}`,
      `Adultos: ${r.adultos} | Crianças: ${r.criancas} | Bebês: ${r.bebes}`,
      `Assentos: ${(r.assentos || []).join(", ") || "Nenhum"}`,
      `Pagamento: ${r.metodo_pagamento}`,
      "",
      passageirosText,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedId(r.id);
    toast.success("Dados copiados!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = reservas.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.codigo_reserva.toLowerCase().includes(q) ||
      (r.passageiros || []).some((p: any) =>
        (p.nomeCompleto || p.nome || "").toLowerCase().includes(q) ||
        (p.cpf || p.cpfDocumento || "").includes(q) ||
        (p.email || "").toLowerCase().includes(q)
      );
  });

  const totalPax = (r: Reserva) => r.adultos + r.criancas + r.bebes;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-foreground">Pedidos</h3>
          <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold px-1.5">
            {reservas.length}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar pedido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-8 w-full sm:w-52 bg-muted/30 border-border/60 text-sm"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchReservas}
            disabled={loading}
            className="h-9 w-9 p-0 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {reservas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const total = isAdmin ? reservas.length : reservas.length;
                if (!confirm(`Limpar ${total} pedido(s) coletado(s)? Esta ação não pode ser desfeita.`)) return;
                try {
                  let q = supabase.from("reservas").delete();
                  if (!isAdmin && operadorId) q = q.eq("operador_id", operadorId);
                  else q = q.not("id", "is", null);
                  const { error } = await q;
                  if (error) throw error;
                  toast.success("Dados limpos com sucesso");
                  fetchReservas();
                } catch {
                  toast.error("Erro ao limpar dados");
                }
              }}
              className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpar dados
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">Carregando pedidos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-3">
            <ClipboardList className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhum pedido encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Os pedidos aparecerão aqui automaticamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, index) => {
            const mainP = r.passageiros?.[0] as any;
            const isExpanded = expandedId === r.id;

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="rounded-2xl border border-border bg-card overflow-hidden transition-shadow duration-200 hover:shadow-sm"
              >
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 shrink-0">
                    <User className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {mainP?.nomeCompleto || mainP?.nome || "Sem nome"}
                      </span>
                      {statusBadge(r.status)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                      <span className="font-mono font-medium">{r.codigo_reserva}</span>
                      <span className="text-border">•</span>
                      <span>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                      <span className="text-border">•</span>
                      <span>{totalPax(r)} pax</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyPedido(r); }}
                      className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      {copiedId === r.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border/60"
                    >
                      <div className="px-4 py-4 space-y-4">
                        {/* Summary grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: "Código", value: r.codigo_reserva, mono: true, accent: true },
                            { label: "Pagamento", value: r.metodo_pagamento.toUpperCase() },
                            { label: "Passageiros", value: `${r.adultos}A ${r.criancas}C ${r.bebes}B` },
                            { label: "Assentos", value: (r.assentos || []).join(", ") || "—" },
                          ].map((item) => (
                            <div key={item.label} className="rounded-xl bg-muted/30 px-3 py-2.5">
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{item.label}</p>
                              <p className={`text-sm font-semibold mt-0.5 ${item.mono ? "font-mono" : ""} ${item.accent ? "text-primary" : "text-foreground"}`}>
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Passengers */}
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Passageiros ({(r.passageiros || []).length})
                          </p>
                          <div className="space-y-2">
                            {(r.passageiros || []).map((p: any, i: number) => (
                              <div key={i} className="rounded-xl border border-border/60 p-3 bg-muted/10">
                                <p className="font-semibold text-sm text-foreground">{p.nomeCompleto || p.nome || "—"}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5">
                                  <p className="text-[11px] text-muted-foreground">CPF: <span className="text-foreground font-medium">{p.cpf || p.cpfDocumento || "—"}</span></p>
                                  <p className="text-[11px] text-muted-foreground">Nasc: <span className="text-foreground font-medium">{p.dataNascimento || "—"}</span></p>
                                  <p className="text-[11px] text-muted-foreground">Sexo: <span className="text-foreground font-medium">{sexoLabel(p.sexo || "")}</span></p>
                                  <p className="text-[11px] text-muted-foreground">Tel: <span className="text-foreground font-medium">{p.telefone || "—"}</span></p>
                                  <p className="text-[11px] text-muted-foreground col-span-2">Email: <span className="text-foreground font-medium">{p.email || "—"}</span></p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyPedido(r)}
                            className="flex-1 h-10 rounded-xl text-xs font-semibold"
                          >
                            {copiedId === r.id ? <><Check className="h-3.5 w-3.5 mr-1.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar Dados</>}
                          </Button>
                          <Button size="sm" className="flex-1 h-10 rounded-xl text-xs font-semibold">
                            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Gerar Pagamento
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
  );
};

export default PedidosSection;
