import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Minus, Upload, ClipboardPaste, ChevronUp, ChevronDown, X, Loader2, Eye, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Passageiro } from "@/types/pagamento";
import { useGatewayStore } from "@/stores/gatewayStore";

const NovoPagamentoForm = ({ operadorId }: { operadorId?: string }) => {
  const allGateways = useGatewayStore((s) => s.gateways);
  const activeGateways = useMemo(() => allGateways.filter((g) => g.ativo && g.secretKey), [allGateways]);
  const [metodoPagamento, setMetodoPagamento] = useState<"pix" | "gateway">("pix");
  const [gatewaySelected, setGatewaySelected] = useState("");
  const [isProcessingGateway, setIsProcessingGateway] = useState(false);
  const [numPassageiros, setNumPassageiros] = useState(1);
  const [passageirosAbertos, setPassageirosAbertos] = useState<number[]>([0]);
  const [passageiros, setPassageiros] = useState<Partial<Passageiro>[]>([{}]);

  // Auto-generate flight number
  const generateFlightNumber = () => {
    const prefixes = ["AD", "G3", "LA", "JJ", "TP", "AV", "CM", "AA", "DL", "UA"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${num}`;
  };

  // Flight info
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [companhia, setCompanhia] = useState("");
  const [numeroVoo, setNumeroVoo] = useState(() => generateFlightNumber());
  const [classe, setClasse] = useState("economica");

  // IDA
  const [idaData, setIdaData] = useState("");
  const [idaPartida, setIdaPartida] = useState("");
  const [idaChegada, setIdaChegada] = useState("");

  // VOLTA
  const [voltaData, setVoltaData] = useState("");
  const [voltaPartida, setVoltaPartida] = useState("");
  const [voltaChegada, setVoltaChegada] = useState("");

  // Payment
  const [descricao, setDescricao] = useState("");
  const [codReserva, setCodReserva] = useState("");
  const [valor, setValor] = useState("");
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [codigoPix, setCodigoPix] = useState("");
  const [linkDetalhes, setLinkDetalhes] = useState("");

  // Config link
  const [exibirTelaBusca, setExibirTelaBusca] = useState(true);
  const [solicitarOrigem, setSolicitarOrigem] = useState(false);
  const [exigirOrigem, setExigirOrigem] = useState(false);

  // Upload & AI - main quotation
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & AI - connection details
  const [connectionPreview, setConnectionPreview] = useState<string | null>(null);
  const [isExtractingConnection, setIsExtractingConnection] = useState(false);
  const connectionFileInputRef = useRef<HTMLInputElement>(null);

  // Paste text modal
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [textoReserva, setTextoReserva] = useState("");
  const [isPastingExtract, setIsPastingExtract] = useState(false);

  // Generated link + presence
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  // Track viewers via presence when a token is generated
  useEffect(() => {
    if (!generatedToken) return;
    const channel = supabase.channel(`payment-view:${generatedToken}`);

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      setViewerCount(count);
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [generatedToken]);

  // Auto-fetch reservation seats when codReserva changes
  useEffect(() => {
    const fetchReservaAssentos = async () => {
      if (!codReserva || codReserva.length < 5) return;
      try {
        const { data: reserva } = await supabase
          .from("reservas")
          .select("assentos, passageiros")
          .eq("codigo_reserva", codReserva)
          .maybeSingle();

        if (reserva?.assentos && Array.isArray(reserva.assentos)) {
          const assentos = reserva.assentos as string[];
          setPassageiros((prev) =>
            prev.map((p, idx) => ({
              ...p,
              assento: assentos[idx] || (p as any).assento || "",
            }))
          );
        }
      } catch (err) {
        console.error("Erro ao buscar assentos da reserva:", err);
      }
    };
    fetchReservaAssentos();
  }, [codReserva]);

  const addPassageiro = () => {
    setNumPassageiros((n) => n + 1);
    setPassageiros((p) => [...p, {}]);
    setPassageirosAbertos((o) => [...o, passageiros.length]);
  };

  const removePassageiro = () => {
    if (numPassageiros <= 1) return;
    setNumPassageiros((n) => n - 1);
    setPassageiros((p) => p.slice(0, -1));
  };

  const togglePassageiro = (idx: number) => {
    setPassageirosAbertos((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const updatePassageiro = (idx: number, field: string, value: string) => {
    setPassageiros((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const looksLikeHuraSecretKey = (value?: string) => /^sk_(live|test)_/i.test((value || "").trim());
  const looksLikeHuraPublicKey = (value?: string) => /^hurapay_(live|test)_/i.test((value || "").trim());

  const normalizeGatewayCredentials = (gateway: { id: string; secretKey: string; publicKey: string }) => {
    let secretKey = gateway.secretKey.trim();
    let publicKey = gateway.publicKey.trim();

    if (gateway.id === "hura-pay" && !looksLikeHuraSecretKey(secretKey) && looksLikeHuraSecretKey(publicKey)) {
      [secretKey, publicKey] = [publicKey, secretKey];
    }

    return {
      secretKey,
      publicKey,
      huraKeysLookConfigured:
        gateway.id !== "hura-pay" ||
        looksLikeHuraSecretKey(secretKey) ||
        looksLikeHuraPublicKey(publicKey),
    };
  };

  const applyExtractedData = (data: any) => {
    if (data.origem) setOrigem(data.origem);
    if (data.destino) setDestino(data.destino);
    if (data.companhia) setCompanhia(data.companhia);
    if (data.numeroVoo) setNumeroVoo(data.numeroVoo);
    if (data.classe) setClasse(data.classe);
    if (data.codigoReserva) setCodReserva(data.codigoReserva);
    if (data.valor) setValor(data.valor);
    if (data.whatsappCliente) setWhatsappCliente(data.whatsappCliente);
    if (data.descricao) setDescricao(data.descricao);

    if (data.ida) {
      if (data.ida.data) setIdaData(data.ida.data);
      if (data.ida.partida) setIdaPartida(data.ida.partida);
      if (data.ida.chegada) setIdaChegada(data.ida.chegada);
    }
    if (data.volta) {
      if (data.volta.data) setVoltaData(data.volta.data);
      if (data.volta.partida) setVoltaPartida(data.volta.partida);
      if (data.volta.chegada) setVoltaChegada(data.volta.chegada);
    }

    if (data.passageiros && data.passageiros.length > 0) {
      const newPassageiros = data.passageiros.map((p: any) => ({
        nomeCompleto: p.nomeCompleto || "",
        cpfDocumento: p.cpfDocumento || "",
        dataNascimento: p.dataNascimento || "",
        sexo: p.sexo || "",
        telefone: p.telefone || "",
        email: p.email || "",
        assento: p.assento || "",
        secao: p.secao || "",
      }));
      setPassageiros(newPassageiros);
      setNumPassageiros(newPassageiros.length);
      setPassageirosAbertos(newPassageiros.map((_: any, i: number) => i));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie apenas imagens (JPG, PNG, etc.)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setUploadPreview(base64);
      setIsExtracting(true);

      try {
        const { data, error } = await supabase.functions.invoke("extract-flight-data", {
          body: { imageBase64: base64 },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Falha na extração");
        applyExtractedData(data.data);
        toast.success("Dados extraídos com sucesso!");
      } catch (err: any) {
        console.error("Extraction error:", err);
        toast.error(err.message || "Erro ao extrair dados da imagem");
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConnectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie apenas imagens (JPG, PNG, etc.)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setConnectionPreview(base64);
      setIsExtractingConnection(true);

      try {
        const { data, error } = await supabase.functions.invoke("extract-flight-data", {
          body: { imageBase64: base64, isConnectionImage: true },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Falha na extração");
        // Apply connection-specific data (flight details only, not overwrite passengers)
        if (data.data.origem) setOrigem(data.data.origem);
        if (data.data.destino) setDestino(data.data.destino);
        if (data.data.companhia) setCompanhia(data.data.companhia);
        if (data.data.numeroVoo) setNumeroVoo(data.data.numeroVoo);
        if (data.data.ida) {
          if (data.data.ida.data) setIdaData(data.data.ida.data);
          if (data.data.ida.partida) setIdaPartida(data.data.ida.partida);
          if (data.data.ida.chegada) setIdaChegada(data.data.ida.chegada);
        }
        if (data.data.volta) {
          if (data.data.volta.data) setVoltaData(data.data.volta.data);
          if (data.data.volta.partida) setVoltaPartida(data.data.volta.partida);
          if (data.data.volta.chegada) setVoltaChegada(data.data.volta.chegada);
        }
        if (data.data.descricao) setDescricao((prev) => prev ? `${prev}\n${data.data.descricao}` : data.data.descricao);
        toast.success("Detalhes da conexão extraídos!");
      } catch (err: any) {
        console.error("Connection extraction error:", err);
        toast.error(err.message || "Erro ao extrair dados da imagem");
      } finally {
        setIsExtractingConnection(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteTextExtract = async () => {
    if (!textoReserva.trim()) {
      toast.error("Cole o texto de reserva primeiro");
      return;
    }

    setIsPastingExtract(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-flight-data", {
        body: { textReserva: textoReserva },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha na extração");
      applyExtractedData(data.data);
      setPasteModalOpen(false);
      setTextoReserva("");
      toast.success("Dados extraídos do texto com sucesso!");
    } catch (err: any) {
      console.error("Text extraction error:", err);
      toast.error(err.message || "Erro ao extrair dados do texto");
    } finally {
      setIsPastingExtract(false);
    }
  };

  const removeUpload = () => {
    setUploadPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeConnectionUpload = () => {
    setConnectionPreview(null);
    if (connectionFileInputRef.current) connectionFileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!valor) {
      toast.error("Informe o valor do pagamento");
      return;
    }
    if (!codigoPix && metodoPagamento === "pix") {
      toast.error("Informe o código PIX");
      return;
    }
    if (metodoPagamento === "gateway" && !gatewaySelected) {
      toast.error("Selecione um gateway de pagamento");
      return;
    }
    const selectedGw = allGateways.find((g) => g.id === gatewaySelected);
    const normalizedGw = selectedGw ? normalizeGatewayCredentials(selectedGw) : null;
    if (metodoPagamento === "gateway" && (!selectedGw || !normalizedGw?.secretKey)) {
      toast.error("O gateway selecionado não tem Secret Key configurada. Configure na aba Gateways.");
      return;
    }

    if (metodoPagamento === "gateway" && gatewaySelected === "hura-pay" && normalizedGw && !normalizedGw.huraKeysLookConfigured) {
      toast.error("Na Hura Pay, confira se a Secret Key começa com sk_live_ e a Public Key com hurapay_live_.");
      return;
    }

    let pixCodeFinal = codigoPix;

    // If gateway, call the edge function to generate PIX via gateway
    if (metodoPagamento === "gateway" && selectedGw && normalizedGw) {
      setIsProcessingGateway(true);
      try {
        const mainPax = passageiros[0] || {};
        const amountCents = Math.round(parseFloat(valor.replace(/[^\d.,]/g, "").replace(",", ".")) * 100);
        
        const { data: gwResult, error: gwError } = await supabase.functions.invoke("process-gateway-payment", {
          body: {
            gateway: gatewaySelected,
            secretKey: normalizedGw.secretKey,
            publicKey: normalizedGw.publicKey,
            amount: amountCents,
            customer: {
              name: mainPax.nomeCompleto || "Cliente",
              email: mainPax.email || "",
              cpf: mainPax.cpfDocumento || "",
              phone: mainPax.telefone || "",
            },
            description: descricao || `Reserva ${codReserva}`,
            codigoReserva: codReserva,
          },
        });

        if (gwError) throw gwError;
        if (!gwResult?.success) throw new Error(gwResult?.error || "Erro ao processar gateway");

        pixCodeFinal = gwResult.pixCode || gwResult.rawResponse?.data?.pix?.qr_code || gwResult.rawResponse?.pix?.qr_code || "";
        if (!pixCodeFinal) {
          toast.warning("Gateway processado mas código PIX não retornado. Verifique a resposta.");
          console.log("Gateway raw response:", gwResult.rawResponse);
        } else {
          toast.success(`Pagamento gerado via ${gatewaySelected === "hura-pay" ? "Hura Pay" : "Anubis Pay"}!`);
        }
      } catch (err: any) {
        console.error("Gateway error:", err);
        toast.error(
          gatewaySelected === "hura-pay"
            ? "Erro no gateway: confira se a Secret Key é sk_live_ e a Public Key é hurapay_live_."
            : "Erro no gateway: " + (err.message || "Tente novamente")
        );
        setIsProcessingGateway(false);
        return;
      } finally {
        setIsProcessingGateway(false);
      }
    }

    try {
      const { data, error } = await supabase
        .from("pagamentos")
        .insert({
          passageiros: passageiros as any,
          origem,
          destino,
          companhia,
          numero_voo: numeroVoo,
          classe,
          ida_data: idaData,
          ida_partida: idaPartida,
          ida_chegada: idaChegada,
          volta_data: voltaData || null,
          volta_partida: voltaPartida || null,
          volta_chegada: voltaChegada || null,
          descricao,
          codigo_reserva: codReserva,
          valor,
          whatsapp_cliente: whatsappCliente,
          codigo_pix: pixCodeFinal || null,
          link_detalhes: linkDetalhes.trim() || null,
          metodo_pagamento: metodoPagamento,
          status: "pendente",
          operador_id: operadorId || null,
        } as any)
        .select("token")
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/p/${data.token}`;
      await navigator.clipboard.writeText(link);
      setGeneratedToken(data.token);
      toast.success("Pagamento gerado! Link copiado para a área de transferência.");
    } catch (err: any) {
      toast.error("Erro ao gerar pagamento: " + (err.message || "Tente novamente"));
    }
  };

  const generatedLink = generatedToken ? `${window.location.origin}/p/${generatedToken}` : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground">
        <Plus className="h-4 w-4" /> Novo Pagamento
      </h3>

      {/* Image Upload Blocks - Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Connection Details Image Block (LEFT) */}
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            ✈️ Detalhes da Conexão (imagem)
          </Label>
          <input
            ref={connectionFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleConnectionImageUpload}
          />
          {!connectionPreview ? (
            <div
              onClick={() => connectionFileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-6 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {isExtractingConnection ? (
                <>
                  <Loader2 className="h-6 w-6 text-primary animate-spin mb-2" />
                  <span className="text-xs text-primary font-medium">Extraindo detalhes...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground text-center px-2">Envie imagem com detalhes da conexão</span>
                </>
              )}
            </div>
          ) : (
            <div className="relative rounded-lg border border-border overflow-hidden">
              <img src={connectionPreview} alt="Conexão" className="w-full max-h-36 object-contain bg-muted/30" />
              {isExtractingConnection && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Extraindo...</span>
                  </div>
                </div>
              )}
              <button
                onClick={removeConnectionUpload}
                className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Main Quotation Image Block (RIGHT) */}
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            📋 Upload de Cotação (leitura automática)
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          {!uploadPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-6 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-6 w-6 text-primary animate-spin mb-2" />
                  <span className="text-xs text-primary font-medium">Extraindo dados com IA...</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground text-center px-2">Envie a imagem da cotação para preenchimento automático</span>
                </>
              )}
            </div>
          ) : (
            <div className="relative rounded-lg border border-border overflow-hidden">
              <img src={uploadPreview} alt="Cotação" className="w-full max-h-36 object-contain bg-muted/30" />
              {isExtracting && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Extraindo dados...</span>
                  </div>
                </div>
              )}
              <button
                onClick={removeUpload}
                className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Colar texto de reserva - inline collapsible */}
      <div className="mb-5 rounded-lg border-2 border-dashed border-border overflow-hidden">
        <button
          onClick={() => setPasteModalOpen(!pasteModalOpen)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-3"
        >
          <ClipboardPaste className="h-4 w-4" />
          {pasteModalOpen ? "Fechar campo de colagem" : "Colar texto de reserva"}
        </button>

        {pasteModalOpen && (
          <div className="px-4 pb-4 space-y-3">
            <Textarea
              value={textoReserva}
              onChange={(e) => setTextoReserva(e.target.value)}
              placeholder="Cole aqui o texto da reserva..."
              rows={5}
              className="resize-none border-border bg-background"
            />
            <Button
              onClick={handlePasteTextExtract}
              disabled={isPastingExtract || !textoReserva.trim()}
              className="w-full"
              variant="outline"
            >
              {isPastingExtract ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extraindo...
                </>
              ) : (
                <>
                  <ClipboardPaste className="h-4 w-4" />
                  Interpretar Texto
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Método de Pagamento */}
      <div className="mb-4">
        <Label className="text-xs font-medium mb-2 block">Método de Pagamento</Label>
        <div className="flex gap-2">
          <button
            onClick={() => setMetodoPagamento("pix")}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              metodoPagamento === "pix"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            📱 PIX Manual
          </button>
          <button
            onClick={() => setMetodoPagamento("gateway")}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              metodoPagamento === "gateway"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            ⚡ Gateway
          </button>
        </div>
      </div>

      {/* Gateway selector - shown when gateway is selected */}
      {metodoPagamento === "gateway" && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="text-xs font-semibold text-primary flex items-center gap-1">⚡ Gateway de Pagamento</div>
          {activeGateways.length === 0 ? (
            <p className="text-xs text-destructive">Nenhum gateway ativo. Configure e ative um gateway na aba <strong>Gateways</strong>.</p>
          ) : (
            <div>
              <Label className="text-xs">Selecione o gateway</Label>
              <Select value={gatewaySelected} onValueChange={setGatewaySelected}>
                <SelectTrigger><SelectValue placeholder="Escolha um gateway ativo" /></SelectTrigger>
                <SelectContent>
                  {activeGateways.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">O PIX será gerado automaticamente pela API do gateway selecionado.</p>
        </div>
      )}

      {/* N° de Passageiros */}
      <div className="mb-5">
        <Label className="text-xs font-medium mb-2 flex items-center gap-1">
          👥 N° de Passageiros
        </Label>
        <div className="flex items-center gap-3">
          <button
            onClick={removePassageiro}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm font-semibold">
            {numPassageiros}
          </span>
          <button
            onClick={addPassageiro}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
          </button>
          <span className="text-xs text-muted-foreground">{numPassageiros} passageiro{numPassageiros > 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Passengers */}
      {passageiros.map((p, idx) => (
        <div key={idx} className="mb-4 rounded-lg border border-border">
          <button
            onClick={() => togglePassageiro(idx)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
          >
            <span>{idx + 1} &nbsp; Passageiro {idx + 1}</span>
            {passageirosAbertos.includes(idx) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {passageirosAbertos.includes(idx) && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              <div>
                <Label className="text-xs">Nome Completo *</Label>
                <Input placeholder="Nome completo" value={p.nomeCompleto || ""} onChange={(e) => updatePassageiro(idx, "nomeCompleto", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">CPF/Documento *</Label>
                  <Input placeholder="000.000.000-00" value={p.cpfDocumento || ""} onChange={(e) => updatePassageiro(idx, "cpfDocumento", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Data de Nascimento</Label>
                  <Input placeholder="DD/MM/AAAA" value={p.dataNascimento || ""} onChange={(e) => updatePassageiro(idx, "dataNascimento", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Sexo</Label>
                  <Select value={p.sexo || ""} onValueChange={(v) => updatePassageiro(idx, "sexo", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input placeholder="(11) 99999-9999" value={p.telefone || ""} onChange={(e) => updatePassageiro(idx, "telefone", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Assento</Label>
                  <Input placeholder="Ex: 14A" value={(p as any).assento || ""} onChange={(e) => updatePassageiro(idx, "assento", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Seção</Label>
                  <Input placeholder="Ex: A, B, C" value={(p as any).secao || ""} onChange={(e) => updatePassageiro(idx, "secao", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input placeholder="email@exemplo.com" value={p.email || ""} onChange={(e) => updatePassageiro(idx, "email", e.target.value)} />
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={addPassageiro} className="mb-5 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors w-full justify-center py-2">
        <Plus className="h-3.5 w-3.5" /> Adicionar passageiro
      </button>

      {/* Flight info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="text-xs">Origem</Label>
          <Input placeholder="Ex: GRU" value={origem} onChange={(e) => setOrigem(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Destino *</Label>
          <Input placeholder="Ex: SDU" value={destino} onChange={(e) => setDestino(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <Label className="text-xs">Companhia</Label>
          <Input placeholder="Ex: LATAM" value={companhia} onChange={(e) => setCompanhia(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">N° Voo</Label>
          <Input placeholder="AD5062" value={numeroVoo} onChange={(e) => setNumeroVoo(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Classe</Label>
          <Select value={classe} onValueChange={setClasse}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="economica">Econômica</SelectItem>
              <SelectItem value="executiva">Executiva</SelectItem>
              <SelectItem value="primeira">Primeira</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* IDA */}
      <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-primary">✈️ IDA</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Data</Label>
            <Input placeholder="DD/MM/YYYY" value={idaData} onChange={(e) => setIdaData(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Partida</Label>
            <Input placeholder="HH:MM" value={idaPartida} onChange={(e) => setIdaPartida(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Chegada</Label>
            <Input placeholder="HH:MM" value={idaChegada} onChange={(e) => setIdaChegada(e.target.value)} />
          </div>
        </div>
      </div>

      {/* VOLTA */}
      <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-primary">🔄 VOLTA</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Data</Label>
            <Input placeholder="DD/MM/YYYY" value={voltaData} onChange={(e) => setVoltaData(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Partida</Label>
            <Input placeholder="HH:MM" value={voltaPartida} onChange={(e) => setVoltaPartida(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Chegada</Label>
            <Input placeholder="HH:MM" value={voltaChegada} onChange={(e) => setVoltaChegada(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Descrição, Reserva, Valor */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="text-xs">Descrição</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Cód. Reserva</Label>
          <Input placeholder="Ex: ABC123" value={codReserva} onChange={(e) => setCodReserva(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label className="text-xs">Valor (R$) *</Label>
          <Input value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">WhatsApp</Label>
          <Input placeholder="5511999999999" value={whatsappCliente} onChange={(e) => setWhatsappCliente(e.target.value)} />
        </div>
      </div>

      {/* Config do Link */}
      <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="mb-3 flex items-center gap-1 text-xs font-semibold text-primary">
          ⚙️ Configuração do Link (desta reserva)
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground">Exibir tela de busca</span>
            <Switch checked={exibirTelaBusca} onCheckedChange={setExibirTelaBusca} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground">Solicitar campo Origem</span>
            <Switch checked={solicitarOrigem} onCheckedChange={setSolicitarOrigem} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground">Exigir origem para validar</span>
            <Switch checked={exigirOrigem} onCheckedChange={setExigirOrigem} />
          </div>
        </div>
      </div>

      {/* Código PIX - only for manual PIX */}
      {metodoPagamento === "pix" && (
        <div className="mb-5">
          <Label className="text-xs">Código PIX *</Label>
          <Textarea
            value={codigoPix}
            onChange={(e) => setCodigoPix(e.target.value)}
            placeholder="Cole aqui qualquer texto para o cliente copiar (chave PIX, código copia e cola, dados bancários, etc.)"
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Este texto será exibido para o cliente copiar na tela de pagamento.
          </p>
        </div>
      )}

      {metodoPagamento === "gateway" && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">
            ⚡ O código PIX será gerado automaticamente pelo gateway <strong>{activeGateways.find(g => g.id === gatewaySelected)?.nome || "selecionado"}</strong> ao gerar o pagamento.
          </p>
        </div>
      )}

      {/* Link de Detalhes do Voo */}
      <div className="mb-5">
        <Label className="text-xs">🔗 Link de detalhes do voo (opcional)</Label>
        <Input
          type="url"
          value={linkDetalhes}
          onChange={(e) => setLinkDetalhes(e.target.value)}
          placeholder="https://... (ex: link da reserva, itinerário, etc.)"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Será exibido para o cliente como o botão <strong>"Mais detalhes do voo"</strong> na tela de pagamento.
        </p>
      </div>


      {/* Submit */}
      <Button onClick={handleSubmit} disabled={isProcessingGateway} className="w-full h-12 text-sm font-semibold">
        {isProcessingGateway ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processando gateway...</>
        ) : (
          <>Gerar Pagamento ({numPassageiros} passageiro{numPassageiros > 1 ? "s" : ""})</>
        )}
      </Button>

      {/* Generated Link Section */}
      {generatedLink && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase">Link de Pagamento</span>
            {viewerCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Eye className="h-3.5 w-3.5" />
                <span>{viewerCount} visitando</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input value={generatedLink} readOnly className="flex-1 text-xs font-mono" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(generatedLink);
                toast.success("Link copiado!");
              }}
              className="shrink-0"
            >
              Copiar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NovoPagamentoForm;
