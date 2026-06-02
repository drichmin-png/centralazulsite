import { useState } from "react";
import { Plane, Mail, Loader2, X, Printer, BadgeCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface BoardingPassData {
  companhia: string;
  origem: string;
  destino: string;
  numeroVoo: string;
  classe: string;
  codigoReserva: string;
  idaData: string;
  idaPartida: string;
  idaChegada: string;
  voltaData?: string | null;
  voltaPartida?: string | null;
  voltaChegada?: string | null;
  passageiros: any[];
  assentos?: string[];
  token: string;
  valor: string;
}

interface BoardingPassViewerProps {
  data: BoardingPassData;
  onClose: () => void;
}

const maskCpf = (cpf: string): string => {
  if (!cpf) return "—";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length === 11) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  return cpf;
};

/** Horizontal boarding pass card matching the Azul reference layout */
const BoardingCard = ({ trecho, companhia, origem, destino, data, partida, chegada, paxNome, cpf, assento, codigoReserva, portao }: {
  trecho: "IDA" | "VOLTA";
  companhia: string;
  origem: string;
  destino: string;
  data: string;
  partida: string;
  chegada: string;
  paxNome: string;
  cpf: string;
  assento: string;
  codigoReserva: string;
  portao: string;
}) => {
  const embarque = partida || "--:--";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden shadow-lg border border-border bg-card print:shadow-none print:border print:border-gray-300"
    >
      {/* Blue Header */}
      <div className="bg-primary px-5 py-3 flex items-center gap-3">
        <Plane className="h-5 w-5 text-primary-foreground" />
        <span className="text-lg font-bold text-primary-foreground tracking-wide">
          Cartão de Embarque
        </span>
        <span className="ml-auto text-xs font-bold text-primary-foreground/80 uppercase tracking-widest">
          {companhia || "Companhia Aérea"}
        </span>
      </div>

      {/* Body — horizontal layout */}
      <div className="flex">
        {/* Left: vertical company name */}
        <div className="w-8 bg-muted/20 flex items-center justify-center shrink-0 border-r border-border">
          <span className="text-[10px] font-bold text-muted-foreground tracking-[3px] uppercase"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}>
            {companhia || "AERO"}
          </span>
        </div>

        {/* Center: flight details */}
        <div className="flex-1 p-4 space-y-3 min-w-0">
          {/* Route */}
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-foreground">{origem || "—"}</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <div className="h-px w-6 bg-border" />
              <Plane className="h-3.5 w-3.5 text-primary" />
              <div className="h-px w-6 bg-border" />
            </div>
            <span className="text-base font-bold text-foreground">{destino || "—"}</span>
            <Badge variant="outline" className="ml-auto text-[10px] h-5">
              {trecho}
            </Badge>
          </div>

          {/* Passenger */}
          <div className="border-t border-dashed border-border pt-2">
            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Passageiro:</div>
            <div className="text-sm font-bold text-foreground uppercase">{paxNome}</div>
            <div className="text-xs text-muted-foreground mt-0.5">CPF: {maskCpf(cpf)}</div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 border-t border-dashed border-border pt-2">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Horário saída</div>
              <div className="text-lg font-extrabold text-foreground">{partida || "--:--"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Chegada</div>
              <div className="text-lg font-extrabold text-foreground">{chegada || "--:--"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Assento</div>
              <div className="text-lg font-extrabold text-foreground">{assento || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Data</div>
              <div className="text-sm font-bold text-foreground">{data || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Portão</div>
              <div className="text-sm font-bold text-foreground">{portao || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Código de reserva</div>
              <div className="text-sm font-extrabold text-primary font-mono tracking-widest">{codigoReserva || "—"}</div>
            </div>
          </div>
        </div>

        {/* Barcode separator */}
        <div className="w-12 border-l border-dashed border-border flex flex-col items-center justify-center py-4 shrink-0">
          <div className="flex flex-col gap-[1px]">
            {Array.from({ length: 45 }).map((_, i) => (
              <div
                key={i}
                className="bg-foreground"
                style={{ height: Math.random() > 0.4 ? 2 : 1, width: 28 }}
              />
            ))}
          </div>
        </div>

        {/* Right: QR Code + Embarque */}
        <div className="w-44 border-l border-border bg-muted/10 flex flex-col items-center justify-center p-4 shrink-0">
          <div className="bg-card p-2 rounded-lg shadow-sm">
            <QRCodeSVG value={codigoReserva || "BOARDING"} size={100} />
          </div>
          <div className="mt-3 text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Horário de embarque</div>
            <div className="text-base font-extrabold text-foreground">{embarque}</div>
          </div>
          <div className="mt-2 text-center">
            <div className="text-[9px] text-muted-foreground leading-tight">
              Emissão oficial<br />
              <span className="font-semibold">{companhia || "AeroPayments"}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BoardingPassViewer = ({ data, onClose }: BoardingPassViewerProps) => {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPaid, setSendingPaid] = useState(false);
  const hasVolta = !!data.voltaData;

  const handleSendEmail = async () => {
    const mainP = data.passageiros?.[0] as any;
    if (!mainP?.email) {
      toast.error("Passageiro sem e-mail cadastrado");
      return;
    }
    setSendingEmail(true);
    try {
      const link = `${window.location.origin}/pagamento?token=${data.token}`;
      const { error } = await supabase.functions.invoke("send-reservation-email", {
        body: {
          type: "boarding_pass",
          codigoReserva: data.codigoReserva,
          passageiros: data.passageiros,
          assentos: data.assentos,
          companhia: data.companhia,
          origem: data.origem,
          destino: data.destino,
          numeroVoo: data.numeroVoo,
          classe: data.classe,
          idaData: data.idaData,
          idaPartida: data.idaPartida,
          idaChegada: data.idaChegada,
          voltaData: data.voltaData,
          voltaPartida: data.voltaPartida,
          voltaChegada: data.voltaChegada,
          valor: data.valor,
          linkPagamento: link,
        },
      });
      if (error) throw error;
      toast.success(`Cartão de embarque enviado para ${mainP.email}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar e-mail");
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4 print:bg-white print:static print:p-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl space-y-4">
        {/* Actions bar */}
        <div className="flex items-center justify-between print:hidden">
          <Badge variant="outline" className="text-xs bg-card">
            {hasVolta ? "Ida e Volta" : "Somente Ida"} • {data.passageiros?.length || 1} passageiro{(data.passageiros?.length || 1) > 1 ? "s" : ""}
          </Badge>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={sendingEmail} className="h-8 gap-1 text-xs bg-card">
              {sendingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
              Enviar E-mail
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 gap-1 text-xs bg-card">
              <Printer className="h-3 w-3" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 bg-card rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cards per passenger */}
        {(data.passageiros || []).map((pax: any, pi: number) => {
          const paxName = pax?.nomeCompleto || pax?.nome || "—";
          const paxCpf = pax?.cpfDocumento || pax?.cpf || "";
          const paxAssento = data.assentos?.[pi] || pax?.assento || "—";

          return (
            <div key={pi} className="space-y-3">
              {data.passageiros.length > 1 && (
                <div className="text-xs font-bold text-white/80 uppercase tracking-wider print:text-foreground">
                  Passageiro {pi + 1} de {data.passageiros.length}
                </div>
              )}

              {/* IDA */}
              <BoardingCard
                trecho="IDA"
                companhia={data.companhia}
                origem={data.origem}
                destino={data.destino}
                data={data.idaData}
                partida={data.idaPartida}
                chegada={data.idaChegada}
                paxNome={paxName}
                cpf={paxCpf}
                assento={paxAssento}
                codigoReserva={data.codigoReserva}
                portao=""
              />

              {/* VOLTA */}
              {hasVolta && (
                <BoardingCard
                  trecho="VOLTA"
                  companhia={data.companhia}
                  origem={data.destino}
                  destino={data.origem}
                  data={data.voltaData!}
                  partida={data.voltaPartida || ""}
                  chegada={data.voltaChegada || ""}
                  paxNome={paxName}
                  cpf={paxCpf}
                  assento={paxAssento}
                  codigoReserva={data.codigoReserva}
                  portao=""
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default BoardingPassViewer;
