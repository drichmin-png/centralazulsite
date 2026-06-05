import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Shield, ShieldOff, Ban, CheckCircle, Loader2, RefreshCw, KeyRound, Copy, Check, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOperatorLoginUrl } from "@/lib/operatorAccess";

interface OperadorRow {
  id: string;
  codigo_acesso: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  ultimo_acesso: string | null;
  sessao_ativa: boolean;
  created_at: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-border" },
  bloqueado: { label: "Bloqueado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const OperadoresSection = () => {
  const [operadores, setOperadores] = useState<OperadorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<OperadorRow | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OperadorRow | null>(null);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState("operador");

  const fetchOperadores = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("operador-auth", {
        body: { action: "listar" },
      });
      if (error) throw error;
      if (data?.operadores) setOperadores(data.operadores);
    } catch {
      toast.error("Erro ao carregar operadores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOperadores(); }, [fetchOperadores]);

  const handleCriar = async () => {
    if (!nome || !senha) { toast.error("Preencha nome e senha"); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("operador-auth", {
        body: { action: "criar", nome, senha, perfil },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao criar");
      toast.success("Operador criado!");
      setNome(""); setSenha(""); setPerfil("operador");
      setDialogOpen(false);
      fetchOperadores();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar operador");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (operadorId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("operador-auth", {
        body: { action: "atualizar_status", operadorId, status: newStatus },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      toast.success(`Status alterado para ${newStatus}`);
      fetchOperadores();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status");
    }
  };

  const handleResetSenha = async () => {
    if (!resetTarget || !novaSenha) return;
    try {
      const { data, error } = await supabase.functions.invoke("operador-auth", {
        body: { action: "resetar_senha", operadorId: resetTarget.id, novaSenha },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      toast.success("Senha resetada!");
      setResetDialogOpen(false);
      setNovaSenha("");
      setResetTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao resetar senha");
    }
  };

  const handleExcluir = async () => {
    if (!deleteTarget) return;
    try {
      const { data, error } = await supabase.functions.invoke("operador-auth", {
        body: { action: "excluir", operadorId: deleteTarget.id, hard: true },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);
      toast.success("Operador excluído!");
      setDeleteTarget(null);
      fetchOperadores();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir operador");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Nunca";
    return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const getPainelLink = (op: OperadorRow) => {
    return getOperatorLoginUrl(op.codigo_acesso);
  };

  const copyPainelLink = (op: OperadorRow) => {
    navigator.clipboard.writeText(getPainelLink(op));
    setCopiedLinkId(op.id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const onlineCount = operadores.filter(o => o.sessao_ativa).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-foreground">Operadores</h3>
          <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-muted text-muted-foreground text-[11px] font-bold px-1.5">
            {operadores.length}
          </span>
          {onlineCount > 0 && (
            <span className="inline-flex items-center gap-1 h-5 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-semibold px-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {onlineCount} online
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchOperadores} disabled={loading} className="h-9 w-9 p-0">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 rounded-xl text-xs font-semibold gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Operador</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label className="text-xs font-medium">Nome</Label><Input placeholder="Nome do operador" value={nome} onChange={e => setNome(e.target.value)} className="mt-1.5" /></div>
                <div><Label className="text-xs font-medium">Senha</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} className="mt-1.5" /></div>
                <div>
                  <Label className="text-xs font-medium">Perfil</Label>
                  <Select value={perfil} onValueChange={setPerfil}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCriar} disabled={creating} className="w-full h-10 rounded-xl font-semibold">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Cadastrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reset password dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetar Senha — {resetTarget?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="text-xs font-medium">Nova Senha</Label><Input type="password" placeholder="Nova senha" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="mt-1.5" /></div>
            <Button onClick={handleResetSenha} className="w-full h-10 rounded-xl font-semibold">
              <KeyRound className="h-4 w-4 mr-2" /> Resetar Senha
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir operador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-2">Carregando operadores...</p>
        </div>
      ) : operadores.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhum operador cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Novo" para criar o primeiro</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {operadores.map((op) => {
            const sc = statusConfig[op.status] || { label: op.status, className: "" };
            return (
              <div key={op.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-sm font-bold text-primary">
                          {op.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${op.sessao_ativa ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">{op.nome}</span>
                          {op.perfil === "admin" && <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{op.perfil === "admin" ? "Administrador" : "Operador"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0 ${sc.className}`}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Link row */}
                  <div className="mt-3 rounded-xl bg-muted/30 border border-border/50 px-3 py-2 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">{getPainelLink(op)}</span>
                    <button
                      onClick={() => copyPainelLink(op)}
                      className="shrink-0 rounded-lg p-1.5 hover:bg-muted transition-colors"
                    >
                      {copiedLinkId === op.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                    <p className="text-[10px] text-muted-foreground">
                      Último acesso: <span className="font-medium text-foreground">{formatDate(op.ultimo_acesso)}</span>
                    </p>
                    <div className="flex gap-0.5">
                      {op.status !== "ativo" && (
                        <Button variant="ghost" size="sm" onClick={() => handleStatusChange(op.id, "ativo")} className="h-7 w-7 p-0 rounded-lg" title="Ativar">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                      )}
                      {op.status !== "inativo" && (
                        <Button variant="ghost" size="sm" onClick={() => handleStatusChange(op.id, "inativo")} className="h-7 w-7 p-0 rounded-lg" title="Desativar">
                          <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                      {op.status !== "bloqueado" && (
                        <Button variant="ghost" size="sm" onClick={() => handleStatusChange(op.id, "bloqueado")} className="h-7 w-7 p-0 rounded-lg" title="Bloquear">
                          <Ban className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { setResetTarget(op); setResetDialogOpen(true); }} className="h-7 w-7 p-0 rounded-lg" title="Resetar senha">
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(op)} className="h-7 w-7 p-0 rounded-lg" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OperadoresSection;
