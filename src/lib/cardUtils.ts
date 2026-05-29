// Detecta bandeira pelo prefixo (sem chamadas externas)
export function detectBrand(numero: string): string {
  const n = numero.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(6011|65|64[4-9])/.test(n)) return "Discover";
  if (/^(636368|438935|504175|451416|509048|509067|509049|509069|509050|509074|509068|509040|509045|509051|509046|509066|509047|509042|509052|509043|509064|509040|36297|5067|4576|4011|506699)/.test(n)) return "Elo";
  if (/^(606282|3841)/.test(n)) return "Hipercard";
  if (/^35/.test(n)) return "JCB";
  if (/^(30|36|38|39)/.test(n)) return "Diners";
  return "Desconhecida";
}

export function maskCard(numero: string): string {
  const n = numero.replace(/\D/g, "");
  if (n.length < 8) return n;
  return `${n.slice(0, 4)} ${n.slice(4, 6)}** **** ${n.slice(-4)}`;
}

export function formatCardInput(v: string): string {
  return v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatValidade(v: string): string {
  const n = v.replace(/\D/g, "").slice(0, 4);
  if (n.length <= 2) return n;
  return `${n.slice(0, 2)}/${n.slice(2)}`;
}

export function formatCpf(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// Lookup via binlist.net (público, gratuito, sem chave)
export async function lookupBin(bin: string): Promise<any | null> {
  try {
    const clean = bin.replace(/\D/g, "").slice(0, 8);
    if (clean.length < 6) return null;
    const r = await fetch(`https://lookup.binlist.net/${clean}`, {
      headers: { "Accept-Version": "3" },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
