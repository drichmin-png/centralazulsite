import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENDER_DOMAIN = "notify.voeazull.pro";
const FROM_DOMAIN = "voeazull.pro";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mapa de siglas IATA → nome completo
const AIRPORT_NAMES: Record<string, string> = {
  GRU: "São Paulo (Guarulhos)", CGH: "São Paulo (Congonhas)", VCP: "Campinas (Viracopos)",
  GIG: "Rio de Janeiro (Galeão)", SDU: "Rio de Janeiro (Santos Dumont)", BSB: "Brasília",
  CNF: "Belo Horizonte (Confins)", PLU: "Belo Horizonte (Pampulha)", SSA: "Salvador",
  REC: "Recife", FOR: "Fortaleza", MAO: "Manaus", BEL: "Belém", CWB: "Curitiba",
  POA: "Porto Alegre", FLN: "Florianópolis", NAT: "Natal", MCZ: "Maceió", AJU: "Aracaju",
  SLZ: "São Luís", THE: "Teresina", CGB: "Cuiabá", CGR: "Campo Grande", GYN: "Goiânia",
  VIX: "Vitória", JPA: "João Pessoa", PMW: "Palmas", PVH: "Porto Velho", MCP: "Macapá",
  RBR: "Rio Branco", BVB: "Boa Vista", IGU: "Foz do Iguaçu", NVT: "Navegantes",
  JOI: "Joinville", LDB: "Londrina", MGF: "Maringá", UDI: "Uberlândia", RAO: "Ribeirão Preto",
  SJP: "São José do Rio Preto", BAU: "Bauru", IOS: "Ilhéus", BPS: "Porto Seguro",
  CPV: "Campina Grande", PNZ: "Petrolina", JDO: "Juazeiro do Norte", IMP: "Imperatriz",
  STM: "Santarém", CKS: "Carajás", MOC: "Montes Claros", CFB: "Cabo Frio",
  MIA: "Miami", JFK: "Nova York (JFK)", EWR: "Nova York (Newark)", LAX: "Los Angeles",
  ORD: "Chicago", MCO: "Orlando", FLL: "Fort Lauderdale", ATL: "Atlanta",
  LHR: "Londres (Heathrow)", CDG: "Paris (Charles de Gaulle)", FCO: "Roma (Fiumicino)",
  MAD: "Madrid", BCN: "Barcelona", LIS: "Lisboa", OPO: "Porto", AMS: "Amsterdã",
  FRA: "Frankfurt", DXB: "Dubai", DOH: "Doha", IST: "Istambul", MEX: "Cidade do México",
  SCL: "Santiago", EZE: "Buenos Aires (Ezeiza)", BOG: "Bogotá", LIM: "Lima",
  MVD: "Montevidéu", ASU: "Assunção", PTY: "Cidade do Panamá", CUN: "Cancún",
};

const getAirportName = (code: string): string => {
  if (!code) return "—";
  return AIRPORT_NAMES[code.trim().toUpperCase()] || code;
};

const normalizeEmail = (email?: string | null): string => String(email || "").trim().toLowerCase();

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const htmlToPlainText = (html: string): string => html
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/[ \t]+\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const airportDisplay = (code: string): string => {
  const name = getAirportName(code);
  return name === code ? code : `${name} (${code})`;
};

const maskCpf = (cpf: string): string => {
  if (!cpf) return "";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length === 11) return `${clean.slice(0, 3)}.***.***.${clean.slice(9)}`;
  return cpf;
};

const formatCpf = (cpf: string): string => {
  if (!cpf) return "—";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length === 11) return `${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9)}`;
  return cpf;
};

const calcBoardingTime = (partida: string): string => {
  if (!partida || !partida.includes(":")) return partida || "--:--";
  const [h, m] = partida.split(":").map(Number);
  const totalMin = h * 60 + m - 20;
  const bh = Math.floor(((totalMin + 1440) % 1440) / 60);
  const bm = (totalMin + 1440) % 60;
  return `${String(bh).padStart(2, "0")}:${String(bm).padStart(2, "0")}`;
};

// Brand colors (Azul)
const brandColor = "#0033A0";
const brandDark = "#001560";
const brandLight = "#2563eb";
const accentGold = "#C5A55A";
const gray100 = "#f3f4f6";
const gray200 = "#e5e7eb";
const gray400 = "#9ca3af";
const gray600 = "#4b5563";
const gray800 = "#1f2937";
const successGreen = "#16a34a";

// Hosted banner images (Supabase Storage public bucket)
const BANNER_BASE = "https://qhxwrjhbeoxamozcykdg.supabase.co/storage/v1/object/public/email-assets";
const BANNER_CHECKIN = `${BANNER_BASE}/banner-checkin.png`;
const BANNER_HOTEL = `${BANNER_BASE}/banner-hotel.png`;
const BANNER_EMBARQUE = `${BANNER_BASE}/banner-embarque.png`;
const BANNER_DUVIDA = `${BANNER_BASE}/banner-duvida.png`;
const AZUL_LOGO_URL = "https://www.centralazul.site/azul-logo-email.jpg";

// ═══════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════

const emailWrapper = (content: string, companhia: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Arial,sans-serif;background:#f0f2f5;-webkit-text-size-adjust:100%;">
${content}
<div style="text-align:center;padding:24px 16px;max-width:640px;margin:0 auto;">
  <p style="font-size:10px;color:${gray400};line-height:1.6;margin:0;">
    Esse email é enviado por: AZUL LINHAS AÉREAS BRASILEIRAS S.A.<br/>
    Avenida Marcos Penteado de Ulhôa Rodrigues, 939, 9º Andar, Torre Jatobá, Barueri, São Paulo, 06460-040, BR
  </p>
  <p style="font-size:10px;color:#bbb;margin:10px 0 0;">${companhia || "Azul"} © ${new Date().getFullYear()} · Todos os direitos reservados</p>
</div>
</body>
</html>`;

const emailHeader = () => `
<div style="background:#ffffff;padding:24px 20px 0;text-align:center;border-bottom:4px solid ${brandColor};">
  <img src="${AZUL_LOGO_URL}" alt="Azul" style="width:120px;height:auto;margin:0 auto 16px;display:block;" />
</div>`;

const sectionTitle = (text: string) =>
  `<div style="font-size:11px;color:${brandColor};font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid ${gray100};">${text}</div>`;

const infoRow = (label: string, value: string) =>
  value && value !== "—" && value !== "" ? `
  <tr>
    <td style="padding:7px 0;font-size:12px;color:${gray400};font-weight:600;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:7px 0;font-size:13px;color:${gray800};font-weight:600;">${value}</td>
  </tr>` : "";

const cardBlock = (content: string) =>
  `<div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 16px rgba(0,0,0,0.06);margin-bottom:16px;">${content}</div>`;

const ctaButton = (text: string, url: string, bgColor: string = brandColor) =>
  `<a href="${url}" style="display:inline-block;background:${bgColor};color:#fff;text-decoration:none;padding:14px 40px;border-radius:12px;font-weight:700;font-size:14px;box-shadow:0 4px 16px ${bgColor}33;">${text}</a>`;

// Bottom promo banners (Azul-style: check-in, hotel, embarque, dúvida)
const promoBanners = () => `
  <div style="max-width:640px;margin:24px auto 0;padding:0 16px;">
    <div style="margin-bottom:14px;text-align:center;">
      <img src="${BANNER_CHECKIN}" alt="Informação sobre o Check-in" style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto;border-radius:8px;" />
    </div>
    <div style="margin-bottom:14px;text-align:center;">
      <img src="${BANNER_HOTEL}" alt="15% de desconto em hotéis" style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto;border-radius:8px;" />
    </div>
    <div style="margin-bottom:14px;text-align:center;">
      <img src="${BANNER_EMBARQUE}" alt="Embarque sem papel" style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto;border-radius:8px;" />
    </div>
    <div style="margin-bottom:14px;text-align:center;">
      <img src="${BANNER_DUVIDA}" alt="Tem alguma dúvida?" style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto;border-radius:8px;" />
    </div>
  </div>
  <div style="max-width:640px;margin:0 auto;padding:16px;">
    <div style="background:#fff;border-radius:12px;padding:20px;font-size:11px;color:${gray600};line-height:1.6;">
      <div style="font-weight:700;color:${brandColor};margin-bottom:8px;font-size:13px;">Avisos importantes</div>
      <p style="margin:6px 0;">1 — Apresente-se para o embarque 2 (duas) horas antes da partida do voo, com documento de identificação original com fotografia.</p>
      <p style="margin:6px 0;">2 — O bilhete não é endossável, sendo válido por um ano após a data de emissão.</p>
      <p style="margin:6px 0;">3 — Cancelamentos, alterações e reembolsos podem ser realizados dentro do prazo de validade, conforme as regras tarifárias vigentes no momento da compra.</p>
      <p style="margin:6px 0;">4 — Em caso de dúvidas sobre alterações de voo, pedidos de reembolso, não comparecimento ao voo ou demais questões, contate a central de atendimento da companhia.</p>
    </div>
  </div>
`;

// Bloco institucional/segurança (antes das imagens promocionais)
const trustBlock = () => `
  <div style="max-width:640px;margin:20px auto 0;padding:0 16px;">
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 16px rgba(0,0,0,0.06);border-left:4px solid ${brandColor};">
      <div style="font-size:16px;font-weight:800;color:${gray800};margin:0 0 12px;">🔒 Sua Solicitação Foi Recebida Com Segurança</div>
      <p style="font-size:13px;color:${gray600};line-height:1.7;margin:0 0 10px;">Obrigado por escolher nossos serviços.</p>
      <p style="font-size:13px;color:${gray600};line-height:1.7;margin:0 0 10px;">Sua solicitação foi registrada com sucesso e encontra-se em processamento conforme os procedimentos operacionais aplicáveis. Nosso sistema trabalha com processos de validação e conferência para proporcionar maior confiabilidade e segurança durante toda a experiência de compra.</p>
      <p style="font-size:13px;color:${gray600};line-height:1.7;margin:0 0 10px;">Recomendamos acompanhar as comunicações enviadas para este endereço de e-mail, pois informações importantes relacionadas à sua solicitação poderão ser encaminhadas por este canal.</p>
      <p style="font-size:13px;color:${gray600};line-height:1.7;margin:0;">Buscamos oferecer uma experiência transparente, segura e organizada, mantendo você informado sobre todas as etapas necessárias até a conclusão do processo.</p>
    </div>
  </div>
`;

// Bloco de orientações de viagem (após as imagens promocionais)
const travelInfoBlock = () => {
  const item = (icon: string, titulo: string, conteudo: string) => `
    <div style="padding:14px 0;border-bottom:1px solid ${gray100};">
      <div style="font-size:14px;font-weight:700;color:${gray800};margin-bottom:6px;">${icon} ${titulo}</div>
      <div style="font-size:13px;color:${gray600};line-height:1.7;">${conteudo}</div>
    </div>`;
  return `
  <div style="max-width:640px;margin:20px auto 0;padding:0 16px;">
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
      <div style="font-size:16px;font-weight:800;color:${gray800};margin:0 0 8px;">✈️ Informações Importantes Para Sua Viagem</div>
      ${item("🪪", "Conferência dos Dados", "Verifique se o nome do passageiro está exatamente igual ao documento que será utilizado durante a viagem. Divergências podem gerar dificuldades em procedimentos operacionais realizados pela companhia aérea.")}
      ${item("🕒", "Planejamento do Embarque", "Para maior comodidade, recomendamos chegar ao aeroporto com antecedência.<br/>• Voos nacionais: mínimo de 2 horas.<br/>• Voos internacionais: mínimo de 3 horas.")}
      ${item("🧳", "Bagagem", "As regras de bagagem podem variar conforme a companhia aérea e a categoria da tarifa contratada. Consulte previamente as condições aplicáveis à sua reserva para evitar imprevistos.")}
      ${item("📱", "Check-in", "Realize o check-in assim que ele estiver disponível pelos canais oficiais da companhia aérea responsável pelo voo.")}
      ${item("📩", "Atualizações Operacionais", "Horários, portões de embarque e demais informações operacionais podem sofrer alterações. Recomendamos acompanhar regularmente as informações relacionadas à sua viagem.")}
      <div style="padding:14px 0 0;">
        <div style="font-size:14px;font-weight:700;color:${gray800};margin-bottom:6px;">🔐 Segurança das Informações</div>
        <div style="font-size:13px;color:${gray600};line-height:1.7;">Mantenha em segurança os dados recebidos neste e-mail. Evite compartilhar informações da reserva ou códigos de confirmação com terceiros.</div>
      </div>
    </div>
  </div>
`;
};

// Card final de confiança (premium)
const finalTrustCard = () => `
  <div style="max-width:640px;margin:20px auto 24px;padding:0 16px;">
    <div style="background:linear-gradient(135deg, ${brandColor} 0%, #003a8c 100%);border-radius:16px;padding:28px;box-shadow:0 8px 24px rgba(0,86,210,0.25);color:#fff;text-align:center;">
      <div style="font-size:24px;margin-bottom:10px;">🛡️</div>
      <div style="font-size:15px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;opacity:0.95;">Compromisso de Confiança</div>
      <p style="font-size:13px;line-height:1.7;margin:0 0 12px;opacity:0.95;">Nosso compromisso é proporcionar uma experiência segura, transparente e confiável durante todo o processo. Guarde este e-mail para futuras consultas, pois ele contém informações importantes relacionadas à sua solicitação.</p>
      <p style="font-size:13px;line-height:1.7;margin:0 0 12px;opacity:0.95;">Caso necessite de acompanhamento ou suporte, tenha em mãos os dados informados durante a compra para agilizar o atendimento.</p>
      <p style="font-size:13px;line-height:1.7;margin:0;font-weight:700;">Agradecemos pela confiança e desejamos uma excelente experiência. ✨</p>
    </div>
  </div>
`;

// Renders one flight segment block (Azul PDF style)
const flightSegment = (params: {
  titulo: string;
  origemCodigo: string;
  origemNome: string;
  destinoCodigo: string;
  destinoNome: string;
  data: string;
  partida: string;
  chegada: string;
  numeroVoo: string;
  passageiros: any[];
  assentos: string[];
}) => {
  const { titulo, origemCodigo, origemNome, destinoCodigo, destinoNome, data, partida, chegada, numeroVoo, passageiros, assentos } = params;
  const paxRows = passageiros.map((p: any, i: number) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${gray100};font-size:13px;color:${gray800};font-weight:600;">${(p.nomeCompleto || p.nome || "—")}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${gray100};font-size:12px;color:${gray600};text-align:center;">0</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${gray100};font-size:12px;color:${gray600};text-align:center;">${assentos?.[i] || "Selecionar assento"}</td>
    </tr>`).join("");
  return `
  <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
    <div style="font-size:16px;font-weight:800;color:${gray800};margin-bottom:16px;">
      Voo para <span style="color:${brandColor};">${destinoNome || destinoCodigo}</span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="vertical-align:top;width:38%;">
          <div style="font-size:32px;font-weight:900;color:${brandColor};letter-spacing:1px;">${origemCodigo}</div>
          <div style="font-size:12px;color:${gray600};margin-top:2px;">${origemNome || ""}</div>
          <div style="font-size:13px;color:${gray800};font-weight:700;margin-top:6px;">${data}${partida ? ` · ${partida}` : ""}</div>
        </td>
        <td style="vertical-align:middle;text-align:center;width:24%;">
          <div style="font-size:12px;color:${gray400};text-transform:uppercase;font-weight:700;letter-spacing:1px;">Voo</div>
          <div style="font-size:14px;color:${gray800};font-weight:800;margin:4px 0;">${numeroVoo || "—"}</div>
          <div style="color:${brandColor};font-size:18px;">✈ →</div>
        </td>
        <td style="vertical-align:top;text-align:right;width:38%;">
          <div style="font-size:32px;font-weight:900;color:${brandColor};letter-spacing:1px;">${destinoCodigo}</div>
          <div style="font-size:12px;color:${gray600};margin-top:2px;">${destinoNome || ""}</div>
          <div style="font-size:13px;color:${gray800};font-weight:700;margin-top:6px;">${data}${chegada ? ` · ${chegada}` : ""}</div>
        </td>
      </tr>
    </table>
    <div style="font-size:13px;font-weight:700;color:${gray800};margin:14px 0 8px;">Viajantes</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${gray100};border-radius:8px;border-collapse:separate;border-spacing:0;">
      <tr style="background:${gray100};">
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:${gray600};font-weight:700;text-transform:uppercase;">Passageiro</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;color:${gray600};font-weight:700;text-transform:uppercase;">Bagagem despachada</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;color:${gray600};font-weight:700;text-transform:uppercase;">Assento</th>
      </tr>
      ${paxRows}
    </table>
  </div>`;
};

// ═══════════════════════════════════════════════════════
// EMAIL 1: CONFIRMAÇÃO DE RESERVA (auto, estilo PDF Azul)
// ═══════════════════════════════════════════════════════

const buildConfirmationEmail = (body: any) => {
  const { codigoReserva, passageiros, assentos, companhia, origem, destino, numeroVoo,
    idaData, idaPartida, idaChegada, voltaData, voltaPartida, voltaChegada } = body;
  const paxList = passageiros || [];
  const paxName = paxList[0]?.nomeCompleto || paxList[0]?.nome || "Cliente";
  const hasFlightInfo = !!(origem && destino);
  const hasVolta = !!voltaData;

  const subject = `Reserva ${codigoReserva || ""} realizada com sucesso`;

  const flightBlocks = hasFlightInfo ? `
    ${flightSegment({
      titulo: "Ida",
      origemCodigo: origem || "",
      origemNome: getAirportName(origem || ""),
      destinoCodigo: destino || "",
      destinoNome: getAirportName(destino || ""),
      data: idaData || "",
      partida: idaPartida || "",
      chegada: idaChegada || "",
      numeroVoo: numeroVoo || "",
      passageiros: paxList,
      assentos: assentos || [],
    })}
    ${hasVolta ? flightSegment({
      titulo: "Volta",
      origemCodigo: destino || "",
      origemNome: getAirportName(destino || ""),
      destinoCodigo: origem || "",
      destinoNome: getAirportName(origem || ""),
      data: voltaData || "",
      partida: voltaPartida || "",
      chegada: voltaChegada || "",
      numeroVoo: numeroVoo || "",
      passageiros: paxList,
      assentos: assentos || [],
    }) : ""}
  ` : `
    <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <div style="font-size:13px;font-weight:700;color:${gray800};margin-bottom:12px;">Viajantes</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${gray100};border-radius:8px;border-collapse:separate;border-spacing:0;">
        <tr style="background:${gray100};">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:${gray600};font-weight:700;text-transform:uppercase;">Passageiro</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:${gray600};font-weight:700;text-transform:uppercase;">Bagagem</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:${gray600};font-weight:700;text-transform:uppercase;">Assento</th>
        </tr>
        ${paxList.map((p: any, i: number) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid ${gray100};font-size:13px;color:${gray800};font-weight:600;">${p.nomeCompleto || p.nome || "—"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid ${gray100};font-size:12px;color:${gray600};text-align:center;">0</td>
            <td style="padding:10px 12px;border-bottom:1px solid ${gray100};font-size:12px;color:${gray600};text-align:center;">${(assentos || [])[i] || "Selecionar assento"}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `;

  const html = emailWrapper(`
    ${emailHeader()}
    <div style="max-width:640px;margin:0 auto;padding:24px 16px 0;">
      ${cardBlock(`
        <div style="text-align:center;">
          <div style="font-size:48px;line-height:1;margin-bottom:10px;">🎫</div>
          <h1 style="font-size:24px;font-weight:800;color:${gray800};margin:0 0 6px;">Oi, ${paxName}!</h1>
          <div style="font-size:18px;font-weight:700;color:${brandColor};margin-bottom:14px;">Sua compra foi um sucesso</div>
          <p style="font-size:13px;color:${gray600};margin:0 0 18px;line-height:1.6;">
            Obrigada por fazer uma escolha Azul!<br/>Seu código de reserva é:
          </p>
          <div style="display:inline-block;padding:12px 28px;background:${gray100};border-radius:10px;font-family:'Courier New',monospace;font-size:28px;font-weight:900;color:${brandColor};letter-spacing:4px;">
            ${codigoReserva || "—"}
          </div>
          <div style="margin-top:14px;">
            <span style="display:inline-block;background:${successGreen};color:#fff;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:1px;">Confirmada</span>
          </div>
        </div>
      `)}

      <div style="font-size:15px;font-weight:800;color:${gray800};padding:0 4px 12px;">
        Confira os detalhes da sua reserva:
      </div>

      ${flightBlocks}
    </div>

    ${trustBlock()}
    ${promoBanners()}
    ${travelInfoBlock()}
    ${finalTrustCard()}
  `, companhia || "Azul");

  return { subject, html };
};

// ═══════════════════════════════════════════════════════
// EMAIL 2: DETALHES DA VIAGEM (manual - botão "Enviar e-mail")
// ═══════════════════════════════════════════════════════

const buildTripDetailsEmail = (body: any) => {
  const { codigoReserva, passageiros, assentos, companhia, origem, destino, numeroVoo, classe, valor,
    idaData, idaPartida, idaChegada, voltaData, voltaPartida, voltaChegada,
    linkPagamento, whatsappOperador, metodoPagamento, status } = body;

  const paxList = passageiros || [];
  const paxName = paxList[0]?.nomeCompleto || paxList[0]?.nome || "Cliente";
  const hasVolta = !!voltaData;
  const classeLabel = classe === "executiva" ? "Executiva" : classe === "primeira" ? "Primeira Classe" : "Econômica";
  const whatsappLink = whatsappOperador ? `https://wa.me/${whatsappOperador}?text=${encodeURIComponent(`Olá! Referente à reserva ${codigoReserva} - ${paxName}. Preciso de ajuda.`)}` : "";

  const statusLabel = status === "pago" ? "✅ Pago" : status === "confirmado" ? "✅ Confirmado" : status === "taxa_pendente" ? "⚠️ Taxa Pendente" : "⏳ Pendente";

  const paxCards = paxList.map((p: any, i: number) => {
    const name = p.nomeCompleto || p.nome || "—";
    const cpf = p.cpf || p.cpfDocumento || "";
    const nascimento = p.dataNascimento || "";
    const assento = assentos?.[i] || p.assento || "—";
    return `
    <div style="background:${gray100};border-radius:12px;padding:16px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${brandColor};color:#fff;text-align:center;line-height:28px;font-size:12px;font-weight:700;margin-right:10px;">${i + 1}</span>
        <span style="font-size:14px;font-weight:700;color:${gray800};text-transform:uppercase;">${name}</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${cpf ? infoRow("CPF", formatCpf(cpf)) : ""}
        ${nascimento ? infoRow("Data Nasc.", nascimento) : ""}
        ${infoRow("Assento", assento)}
      </table>
    </div>`;
  }).join("");

  const subject = `Detalhes da sua viagem - reserva ${codigoReserva} (${companhia || "Azul"})`;

  const html = emailWrapper(`
    ${emailHeader()}
    <div style="max-width:600px;margin:-20px auto 0;padding:0 16px 20px;">
      ${cardBlock(`
        <h2 style="font-size:18px;font-weight:800;color:${gray800};margin:0 0 8px;">Olá, ${paxName}!</h2>
        <p style="font-size:14px;color:${gray600};line-height:1.6;margin:0;">
          Confira abaixo todas as informações da sua viagem. Guarde este e-mail para consulta rápida.
        </p>
      `)}

      <!-- Resumo do Voo -->
      ${cardBlock(`
        ${sectionTitle("Resumo do Voo")}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            <td style="text-align:center;padding:8px 0;">
              <div style="font-size:14px;font-weight:700;color:${gray600};">${getAirportName(origem)}</div>
              <div style="font-size:28px;font-weight:900;color:${gray800};letter-spacing:3px;">${origem || "—"}</div>
              <div style="font-size:11px;color:${gray400};margin-top:2px;">Origem</div>
            </td>
            <td style="text-align:center;padding:8px 16px;">
              <div style="color:${brandColor};font-size:20px;">✈ →</div>
              <div style="font-size:10px;color:${gray400};margin-top:2px;">${hasVolta ? "Ida e Volta" : "Somente Ida"}</div>
            </td>
            <td style="text-align:center;padding:8px 0;">
              <div style="font-size:14px;font-weight:700;color:${gray600};">${getAirportName(destino)}</div>
              <div style="font-size:28px;font-weight:900;color:${gray800};letter-spacing:3px;">${destino || "—"}</div>
              <div style="font-size:11px;color:${gray400};margin-top:2px;">Destino</div>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Companhia", companhia || "—")}
          ${infoRow("Número do Voo", numeroVoo || "—")}
          ${infoRow("Classe", classeLabel)}
          ${infoRow("Localizador", codigoReserva || "—")}
          ${infoRow("Status", statusLabel)}
          ${infoRow("Passageiros", String(paxList.length))}
        </table>
      `)}

      <!-- Trecho IDA -->
      ${cardBlock(`
        ${sectionTitle("✈ Trecho de Ida")}
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Rota", `${airportDisplay(origem)} → ${airportDisplay(destino)}`)}
          ${infoRow("Data", idaData || "—")}
          ${infoRow("Partida", idaPartida || "—")}
          ${infoRow("Chegada", idaChegada || "—")}
          ${infoRow("Embarque", calcBoardingTime(idaPartida || ""))}
          ${infoRow("Voo", numeroVoo || "—")}
        </table>
      `)}

      <!-- Trecho VOLTA -->
      ${hasVolta ? cardBlock(`
        ${sectionTitle("✈ Trecho de Volta")}
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Rota", `${airportDisplay(destino)} → ${airportDisplay(origem)}`)}
          ${infoRow("Data", voltaData || "—")}
          ${infoRow("Partida", voltaPartida || "—")}
          ${infoRow("Chegada", voltaChegada || "—")}
          ${infoRow("Embarque", calcBoardingTime(voltaPartida || ""))}
          ${infoRow("Voo", numeroVoo || "—")}
        </table>
      `) : ""}

      <!-- Passageiros -->
      ${cardBlock(`
        ${sectionTitle(`Passageiros (${paxList.length})`)}
        ${paxCards}
      `)}

      <!-- Pagamento -->
      ${cardBlock(`
        ${sectionTitle("Pagamento")}
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Valor Total", `R$ ${valor || "—"}`)}
          ${infoRow("Método", (metodoPagamento || "pix").toUpperCase())}
          ${infoRow("Status", statusLabel)}
        </table>
      `)}

      <!-- Bagagem -->
      ${cardBlock(`
        ${sectionTitle("🧳 Bagagem")}
        <table width="100%" cellpadding="0" cellspacing="0">
          ${infoRow("Bagagem de Mão", "1 volume de até 10kg (55x35x25cm)")}
          ${infoRow("Despachada", "Conforme regras da tarifa contratada")}
        </table>
        <p style="font-size:11px;color:${gray400};margin:10px 0 0;line-height:1.5;">
          Verifique as regras de bagagem da ${companhia || "companhia aérea"} para sua tarifa.
        </p>
      `)}

      <!-- Instruções -->
      ${cardBlock(`
        ${sectionTitle("📋 Instruções Importantes")}
        <table width="100%" cellpadding="0" cellspacing="0">
          ${[
            "Apresente-se com antecedência no aeroporto (mínimo 2h voos nacionais, 3h internacionais).",
            "Confira atentamente todos os dados antes do embarque.",
            "Mantenha documentos de identificação com foto em mãos.",
            "Portão e terminal podem ser alterados pela companhia aérea — acompanhe os painéis do aeroporto.",
            "O check-in online pode ser realizado até 48h antes do voo no site da companhia.",
            "Chegue ao portão de embarque com no mínimo 30 minutos de antecedência.",
          ].map((txt) => `
            <tr><td style="padding:5px 0;font-size:12px;color:${gray600};line-height:1.6;">
              <span style="color:${brandColor};font-weight:700;margin-right:6px;">•</span>${txt}
            </td></tr>
          `).join("")}
        </table>
      `)}

      <!-- Regras -->
      ${cardBlock(`
        ${sectionTitle("📌 Regras de Cancelamento e Alteração")}
        <table width="100%" cellpadding="0" cellspacing="0">
          ${[
            "Cancelamentos estão sujeitos às regras da tarifa contratada.",
            "Alterações de data/horário podem gerar diferença tarifária.",
            "Reembolsos seguem a política da companhia aérea.",
            "Recomendamos a contratação de seguro viagem para maior tranquilidade.",
          ].map((txt) => `
            <tr><td style="padding:5px 0;font-size:12px;color:${gray600};line-height:1.6;">
              <span style="color:${gray400};font-weight:700;margin-right:6px;">•</span>${txt}
            </td></tr>
          `).join("")}
        </table>
      `)}

      <!-- CTAs -->
      <div style="text-align:center;margin:20px 0;">
        ${linkPagamento ? `<div style="margin-bottom:12px;">${ctaButton("📄 Ver Detalhes Completos", linkPagamento)}</div>` : ""}
        ${whatsappLink ? `<div>${ctaButton("💬 Falar no WhatsApp", whatsappLink, "#25D366")}</div>` : ""}
      </div>
    </div>
  `, companhia);

  return { subject, html };
};

// ═══════════════════════════════════════════════════════
// EMAIL 3: CARTÃO DE EMBARQUE (manual - botão "Cartão embarque")
// ═══════════════════════════════════════════════════════

const generateBoardingCard = (p: {
  trecho: string; companhia: string; origem: string; destino: string;
  data: string; partida: string; chegada: string; paxNome: string;
  cpf: string; assento: string; codigoReserva: string; numeroVoo: string; classe: string;
}) => {
  const embarque = calcBoardingTime(p.partida);
  return `
  <div style="max-width:580px;margin:16px auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);background:#fff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${brandColor};">
      <tr>
        <td style="padding:14px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="color:#fff;font-size:16px;font-weight:700;">✈ Cartão de Embarque</td>
            <td style="text-align:right;color:${accentGold};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">${p.trecho}</td>
          </tr></table>
        </td>
      </tr>
    </table>
    <div style="padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
        <tr>
          <td>
            <div style="font-size:13px;font-weight:700;color:${gray600};">${getAirportName(p.origem)}</div>
            <div style="font-size:24px;font-weight:900;color:${gray800};letter-spacing:2px;">${p.origem || "—"}</div>
          </td>
          <td style="text-align:center;color:${brandColor};font-size:18px;padding:0 12px;">→ ✈ →</td>
          <td style="text-align:right;">
            <div style="font-size:13px;font-weight:700;color:${gray600};text-align:right;">${getAirportName(p.destino)}</div>
            <div style="font-size:24px;font-weight:900;color:${gray800};letter-spacing:2px;text-align:right;">${p.destino || "—"}</div>
          </td>
        </tr>
      </table>
      <div style="border-top:1px dashed #e0e0e0;padding-top:12px;margin-bottom:12px;">
        <div style="font-size:10px;color:${gray400};text-transform:uppercase;font-weight:700;letter-spacing:1px;">Passageiro</div>
        <div style="font-size:15px;font-weight:800;color:${gray800};text-transform:uppercase;margin-top:2px;">${p.paxNome}</div>
        ${p.cpf ? `<div style="font-size:11px;color:${gray400};margin-top:1px;">CPF: ${maskCpf(p.cpf)}</div>` : ""}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px dashed #e0e0e0;padding-top:10px;">
        <tr>
          <td style="width:33%;padding:6px 0;">
            <div style="font-size:9px;color:${gray400};text-transform:uppercase;font-weight:700;">Partida</div>
            <div style="font-size:22px;font-weight:900;color:${gray800};">${p.partida || "--:--"}</div>
          </td>
          <td style="width:33%;padding:6px 0;">
            <div style="font-size:9px;color:${gray400};text-transform:uppercase;font-weight:700;">Chegada</div>
            <div style="font-size:22px;font-weight:900;color:${gray800};">${p.chegada || "--:--"}</div>
          </td>
          <td style="width:33%;padding:6px 0;">
            <div style="font-size:9px;color:${gray400};text-transform:uppercase;font-weight:700;">Embarque</div>
            <div style="font-size:22px;font-weight:900;color:${brandColor};">${embarque}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <div style="font-size:9px;color:${gray400};text-transform:uppercase;font-weight:700;">Data</div>
            <div style="font-size:14px;font-weight:700;color:${gray800};">${p.data || "—"}</div>
          </td>
          <td style="padding:6px 0;">
            <div style="font-size:9px;color:${gray400};text-transform:uppercase;font-weight:700;">Voo</div>
            <div style="font-size:14px;font-weight:700;color:${gray800};">${p.numeroVoo || "—"}</div>
          </td>
          <td style="padding:6px 0;">
            <div style="font-size:9px;color:${gray400};text-transform:uppercase;font-weight:700;">Assento</div>
            <div style="font-size:14px;font-weight:700;color:${gray800};">${p.assento || "—"}</div>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px dashed #e0e0e0;margin-top:12px;padding-top:10px;">
        <tr>
          <td style="vertical-align:top;">
            <div style="font-size:9px;color:${gray400};text-transform:uppercase;font-weight:700;">Reserva</div>
            <div style="font-size:18px;font-weight:900;color:${brandColor};font-family:monospace;letter-spacing:3px;">${p.codigoReserva || "—"}</div>
            <div style="font-size:9px;color:${gray400};text-transform:uppercase;font-weight:700;margin-top:6px;">Classe</div>
            <div style="font-size:12px;font-weight:700;color:${gray800};">${p.classe || "Econômica"}</div>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(p.codigoReserva || "BOARDING")}" width="100" height="100" alt="QR" style="border-radius:8px;" />
          </td>
        </tr>
      </table>
    </div>
    <div style="background:${gray100};padding:8px 24px;text-align:center;">
      <span style="font-size:10px;color:${gray400};font-weight:600;">${p.companhia || "Azul"} · Emissão digital</span>
    </div>
  </div>`;
};

const buildBoardingPassEmail = (body: any) => {
  const { codigoReserva, passageiros, assentos, companhia, origem, destino, numeroVoo, classe,
    idaData, idaPartida, idaChegada, voltaData, voltaPartida, voltaChegada,
    linkPagamento, whatsappOperador } = body;

  const paxList = passageiros || [];
  const paxName = paxList[0]?.nomeCompleto || paxList[0]?.nome || "Cliente";
  const hasVolta = !!voltaData;
  const classeLabel = classe === "executiva" ? "Executiva" : classe === "primeira" ? "Primeira Classe" : "Econômica";
  const whatsappLink = whatsappOperador ? `https://wa.me/${whatsappOperador}?text=${encodeURIComponent(`Olá! Referente à reserva ${codigoReserva} - ${paxName}. Preciso de ajuda.`)}` : "";

  let allCards = "";
  for (let pi = 0; pi < paxList.length; pi++) {
    const pax = paxList[pi];
    const pName = pax?.nomeCompleto || pax?.nome || "—";
    const pCpf = pax?.cpfDocumento || pax?.cpf || "";
    const pAssento = assentos?.[pi] || pax?.assento || "—";

    allCards += generateBoardingCard({
      trecho: "IDA", companhia: companhia || "", origem: origem || "", destino: destino || "",
      data: idaData || "", partida: idaPartida || "", chegada: idaChegada || "",
      paxNome: pName, cpf: pCpf, assento: pAssento,
      codigoReserva: codigoReserva || "", numeroVoo: numeroVoo || "", classe: classeLabel,
    });

    if (hasVolta) {
      allCards += generateBoardingCard({
        trecho: "VOLTA", companhia: companhia || "", origem: destino || "", destino: origem || "",
        data: voltaData || "", partida: voltaPartida || "", chegada: voltaChegada || "",
        paxNome: pName, cpf: pCpf, assento: pAssento,
        codigoReserva: codigoReserva || "", numeroVoo: numeroVoo || "", classe: classeLabel,
      });
    }
  }

  const subject = `Cartão de embarque - reserva ${codigoReserva} (${companhia || "Azul"})`;

  const html = emailWrapper(`
    ${emailHeader()}
    <div style="max-width:620px;margin:-20px auto 0;padding:0 16px 20px;">
      ${cardBlock(`
        <h2 style="font-size:18px;font-weight:800;color:${gray800};margin:0 0 8px;">Olá, ${paxName}!</h2>
        <p style="font-size:14px;color:${gray600};line-height:1.6;margin:0;">
          Seu cartão de embarque digital está pronto. Apresente este documento no momento do embarque.
        </p>
      `)}

      ${allCards}

      ${cardBlock(`
        ${sectionTitle("📋 Instruções de Embarque")}
        <table width="100%" cellpadding="0" cellspacing="0">
          ${[
            "Apresente-se com antecedência no aeroporto (mínimo 2h voos nacionais, 3h internacionais).",
            "Mantenha seus documentos de identificação com foto em mãos.",
            "Confira o portão e terminal nos painéis do aeroporto — podem sofrer alterações.",
            "Chegue ao portão de embarque com no mínimo 30 minutos de antecedência.",
            "Bagagem de mão: 1 volume de até 10kg (55x35x25cm).",
            "Em caso de dúvidas, procure o balcão da companhia aérea no aeroporto."
          ].map((txt) => `
            <tr><td style="padding:5px 0;font-size:12px;color:${gray600};line-height:1.6;">
              <span style="color:${brandColor};font-weight:700;margin-right:6px;">•</span>${txt}
            </td></tr>
          `).join("")}
        </table>
      `)}

      <div style="text-align:center;margin:20px 0;">
        ${linkPagamento ? `<div style="margin-bottom:12px;">${ctaButton("📄 Ver Detalhes Completos", linkPagamento)}</div>` : ""}
        ${whatsappLink ? `<div>${ctaButton("💬 Falar no WhatsApp", whatsappLink, "#25D366")}</div>` : ""}
      </div>
    </div>
  `, companhia);

  return { subject, html };
};

// ═══════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, passageiros } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const mainPassenger = passageiros?.[0];
    const recipientEmail = normalizeEmail(mainPassenger?.email);

    if (!recipientEmail) {
      return new Response(JSON.stringify({ success: false, error: "No recipient email found in passenger data" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!isValidEmail(recipientEmail)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid recipient email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let emailContent: { subject: string; html: string };

    if (type === "confirmation") {
      emailContent = buildConfirmationEmail(body);
    } else if (type === "trip_details") {
      // Botão "Enviar e-mail" do painel — usa o mesmo layout Azul PDF da confirmação
      emailContent = buildConfirmationEmail(body);
    } else if (type === "boarding_pass") {
      emailContent = buildBoardingPassEmail(body);
    } else {
      return new Response(JSON.stringify({ success: false, error: `Unknown email type: ${type}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const companhia = body.companhia || "Azul";
    const messageId = crypto.randomUUID();
    const idempotencyKey = body.idempotencyKey || `${type}-${messageId}`;
    const plainText = htmlToPlainText(emailContent.html);

    // Get or create unsubscribe token (one per recipient email)
    let unsubscribeToken: string | null = null;
    {
      const { data: existing } = await supabase
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", recipientEmail)
        .maybeSingle();
      if (existing?.token) {
        unsubscribeToken = existing.token;
      } else {
        const newToken = crypto.randomUUID();
        const { data: inserted } = await supabase
          .from("email_unsubscribe_tokens")
          .insert({ email: recipientEmail, token: newToken })
          .select("token")
          .maybeSingle();
        unsubscribeToken = inserted?.token || newToken;
      }
    }

    console.log(`Enqueuing email [${type}] to ${recipientEmail} via ${SENDER_DOMAIN}`);

    const payload = {
      to: recipientEmail,
      from: `Azul Linhas Aéreas <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: emailContent.subject,
      html: emailContent.html,
      text: plainText,
      purpose: "transactional",
      label: `reservation-${type}`,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      message_id: messageId,
      queued_at: new Date().toISOString(),
    };

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload,
    });

    if (enqueueError) {
      console.error("Enqueue failed:", enqueueError);
      return new Response(
        JSON.stringify({ success: false, error: enqueueError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: `reservation-${type}`,
      recipient_email: recipientEmail,
      status: "pending",
    });

    console.log("Email enqueued successfully:", messageId);

    return new Response(
      JSON.stringify({ success: true, emailSent: true, messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
