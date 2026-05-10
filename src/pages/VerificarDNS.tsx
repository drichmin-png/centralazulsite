import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

const DOMAIN = "notify.voeazull.pro";

type DnsAnswer = { name: string; type: number; data: string; TTL?: number };
type DnsResult = { Status: number; Answer?: DnsAnswer[] };

type CheckState = {
  loading: boolean;
  ok: boolean;
  records: string[];
  detail?: string;
};

const initial: CheckState = { loading: true, ok: false, records: [] };

async function resolve(name: string, type: string): Promise<DnsAnswer[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    );
    const json: DnsResult = await res.json();
    return json.Answer ?? [];
  } catch {
    return [];
  }
}

export default function VerificarDNS() {
  const [mx, setMx] = useState<CheckState>(initial);
  const [spf, setSpf] = useState<CheckState>(initial);
  const [dkim, setDkim] = useState<CheckState>(initial);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runCheck = useCallback(async () => {
    setMx(initial);
    setSpf(initial);
    setDkim(initial);

    // MX no subdomínio notify
    const mxAns = await resolve(DOMAIN, "MX");
    const mxRecords = mxAns.map((a) => a.data);
    setMx({
      loading: false,
      ok: mxRecords.length > 0,
      records: mxRecords,
      detail: mxRecords.length > 0 ? "MX encontrado" : "Nenhum MX encontrado",
    });

    // SPF (TXT contendo v=spf1)
    const txtAns = await resolve(DOMAIN, "TXT");
    const spfRecords = txtAns
      .map((a) => a.data.replace(/^"|"$/g, ""))
      .filter((d) => d.toLowerCase().includes("v=spf1"));
    setSpf({
      loading: false,
      ok: spfRecords.length > 0,
      records: spfRecords,
      detail: spfRecords.length > 0 ? "SPF válido" : "SPF não encontrado",
    });

    // DKIM — tentamos seletores comuns (resend._domainkey e amazonses)
    const selectors = [
      `resend._domainkey.${DOMAIN}`,
      `amazonses._domainkey.${DOMAIN}`,
    ];
    let dkimRecords: string[] = [];
    for (const sel of selectors) {
      const cname = await resolve(sel, "CNAME");
      const txt = await resolve(sel, "TXT");
      const found = [
        ...cname.map((a) => `${sel} → CNAME ${a.data}`),
        ...txt.map((a) => `${sel} → TXT ${a.data.replace(/^"|"$/g, "").slice(0, 60)}…`),
      ];
      if (found.length > 0) dkimRecords = dkimRecords.concat(found);
    }
    setDkim({
      loading: false,
      ok: dkimRecords.length > 0,
      records: dkimRecords,
      detail: dkimRecords.length > 0 ? "DKIM encontrado" : "DKIM não encontrado",
    });

    setLastCheck(new Date());
  }, []);

  useEffect(() => {
    runCheck();
    const id = setInterval(runCheck, 60_000); // re-checa a cada 60s
    return () => clearInterval(id);
  }, [runCheck]);

  const allOk = mx.ok && spf.ok && dkim.ok;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Verificação DNS — {DOMAIN}</h1>
          <p className="text-sm text-muted-foreground">
            Consulta automática (a cada 60s) dos registros MX, SPF e DKIM via DNS público do
            Google.
          </p>
        </header>

        {allOk && (
          <Card className="p-4 border-green-500 bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              Tudo certo! Os 3 registros estão ativos. Pode reativar o envio de e-mails.
            </div>
          </Card>
        )}

        <RecordCard title="MX" subtitle="Roteamento de e-mail" state={mx} />
        <RecordCard title="SPF" subtitle="TXT v=spf1" state={spf} />
        <RecordCard
          title="DKIM"
          subtitle="resend._domainkey / amazonses._domainkey"
          state={dkim}
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {lastCheck ? `Última verificação: ${lastCheck.toLocaleTimeString()}` : "Verificando…"}
          </span>
          <Button size="sm" variant="outline" onClick={runCheck}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Verificar agora
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          Obs.: a propagação DNS pode levar alguns minutos a algumas horas após adicionar os
          registros na Hostinger.
        </p>
      </div>
    </div>
  );
}

function RecordCard({
  title,
  subtitle,
  state,
}: {
  title: string;
  subtitle: string;
  state: CheckState;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            <Badge variant="secondary" className="text-xs">
              {subtitle}
            </Badge>
          </div>
          {state.detail && (
            <p className="text-xs text-muted-foreground mt-1">{state.detail}</p>
          )}
        </div>
        {state.loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : state.ok ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
      </div>
      {state.records.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs font-mono bg-muted/50 rounded p-2 break-all">
          {state.records.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
