import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root")!;

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#f5f7fa">
      <div style="max-width:520px;background:#fff;border:1px solid #e3e8ef;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
        <h1 style="margin:0 0 12px;font-size:18px;color:#00194a">Configuração ausente</h1>
        <p style="margin:0 0 12px;font-size:14px;color:#475467;line-height:1.6">
          Este site foi publicado sem as chaves de conexão. Na Vercel, abra o projeto em
          <b>Settings → Environment Variables</b> e adicione:
        </p>
        <pre style="background:#0f172a;color:#e2e8f0;padding:12px;font-size:12px;overflow:auto">VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID</pre>
        <p style="margin:12px 0 0;font-size:14px;color:#475467;line-height:1.6">
          Depois clique em <b>Redeploy</b> para publicar novamente.
        </p>
      </div>
    </div>`;
} else {
  createRoot(rootEl).render(<App />);
}
