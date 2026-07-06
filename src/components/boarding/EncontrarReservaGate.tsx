import { useState } from "react";
import { X, Plane, Hotel, Ticket, HelpCircle } from "lucide-react";
const logoAzul = { url: "/logo-azul.png" };
import { getCityName } from "@/lib/airportCodes";

interface Props {
  codigoReservaEsperado: string;
  origemEsperada: string;
  solicitarOrigem: boolean;
  exigirOrigem: boolean;
  onUnlock: () => void;
}

const BG_URL =
  "https://images.unsplash.com/photo-1583077874340-79db6564672e?auto=format&fit=crop&w=1200&q=70";

const EncontrarReservaGate = ({
  codigoReservaEsperado,
  origemEsperada,
  solicitarOrigem,
  exigirOrigem,
  onUnlock,
}: Props) => {
  const [codigo, setCodigo] = useState("");
  const [origem, setOrigem] = useState("");
  const [declaracao, setDeclaracao] = useState(false);
  const [erro, setErro] = useState("");

  const cidadeEsperada = getCityName(origemEsperada);

  const handleBuscar = () => {
    setErro("");
    if (codigo.trim().toUpperCase() !== (codigoReservaEsperado || "").trim().toUpperCase()) {
      setErro("Código da reserva incorreto. Verifique e tente novamente.");
      return;
    }
    if (exigirOrigem) {
      const txt = origem.trim().toUpperCase();
      const ok =
        txt === (origemEsperada || "").toUpperCase() ||
        txt.includes(cidadeEsperada.toUpperCase()) ||
        txt.includes((origemEsperada || "").toUpperCase());
      if (!ok) {
        setErro("Origem não confere com a reserva.");
        return;
      }
    }
    onUnlock();
  };

  return (
    <div
      className="min-h-screen w-full relative flex flex-col"
      style={{
        backgroundImage: `linear-gradient(rgba(0,30,70,0.55), rgba(0,30,70,0.7)), url(${BG_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-5 pb-2 text-white">
        <button className="p-1"><X className="h-6 w-6" /></button>
        <h1 className="text-[18px] font-semibold">Encontrar reserva</h1>
        <div className="w-7" />
      </header>

      {/* Logo Azul */}
      <div className="flex justify-center pt-2 pb-3">
        <img src={logoAzul.url} alt="Azul" className="h-8 w-auto" />
      </div>

      {/* Tabs decorativas */}
      <div className="grid grid-cols-3 px-6 mt-3 text-white text-center">
        <div className="flex flex-col items-center gap-1 border-b-2 border-[#3ca3ff] pb-2">
          <Plane className="h-6 w-6 text-[#3ca3ff]" />
          <span className="text-[12px] font-bold">Passagens aéreas</span>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-80">
          <Hotel className="h-6 w-6" />
          <span className="text-[12px] font-semibold">Hotel</span>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-80">
          <Ticket className="h-6 w-6" />
          <span className="text-[12px] font-semibold">Ingressos</span>
        </div>
      </div>

      <div className="text-center text-white text-[15px] mt-6 mb-3">
        Encontre sua reserva
      </div>

      {/* Card */}
      <div className="mx-4 rounded-md bg-white shadow-lg p-4 space-y-3">
        <label className="flex items-start gap-3 rounded bg-gray-100 p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={declaracao}
            onChange={(e) => setDeclaracao(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#0066cc]"
          />
          <div>
            <div className="text-[14px] font-bold text-[#0066cc] leading-tight">
              Preciso de uma declaração de embarque.
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5">
              Pesquisar em reservas já realizadas
            </div>
          </div>
        </label>

        <div className="rounded border border-gray-300 px-3 py-2">
          <div className="text-[12px] text-[#0066cc] font-medium flex items-center gap-1">
            Código da reserva <HelpCircle className="h-3 w-3" />
          </div>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="HG68WL"
            maxLength={10}
            className="w-full text-[18px] tracking-wider text-gray-900 outline-none bg-transparent uppercase font-medium"
          />
        </div>

        {solicitarOrigem && (
          <div className="rounded border border-gray-300 px-3 py-2">
            <div className="text-[12px] text-[#0066cc] font-medium">Origem</div>
            <input
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              placeholder="Cidade ou sigla (ex: BSB)"
              className="w-full text-[16px] text-gray-900 outline-none bg-transparent"
            />
          </div>
        )}

        {erro && <p className="text-[12px] text-red-600">{erro}</p>}
      </div>

      <div className="flex-1" />

      {/* Botão */}
      <div className="p-4">
        <button
          onClick={handleBuscar}
          className="w-full h-12 rounded bg-[#1aa66b] hover:bg-[#159658] text-white text-[16px] font-semibold shadow-lg"
        >
          Buscar reserva
        </button>
      </div>
    </div>
  );
};

export default EncontrarReservaGate;
