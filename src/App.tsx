import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PainelPagamentos from "./pages/PainelPagamentos";
import ColetaDados from "./pages/ColetaDados";
import BoardingPass from "./pages/BoardingPass";
import LoginOperador from "./pages/LoginOperador";
import VerificarDNS from "./pages/VerificarDNS";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginOperador />} />
          <Route path="/o/:slug" element={<LoginOperador />} />
          <Route path="/painel/:slug" element={<LoginOperador />} />
          <Route path="/painel" element={<PainelPagamentos />} />
          <Route path="/c/:codigo" element={<ColetaDados />} />
          <Route path="/cadastro" element={<ColetaDados />} />
          <Route path="/pagamento" element={<BoardingPass />} />
          <Route path="/p/:token" element={<BoardingPass />} />
          <Route path="/verificar-dns" element={<VerificarDNS />} />
          {/* Legacy redirects */}
          <Route path="/coleta-dados" element={<ColetaDados />} />
          <Route path="/boarding-pass" element={<BoardingPass />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
