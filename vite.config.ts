import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Valores públicos de conexão (chave publicável) usados quando a hospedagem
// não define variáveis de ambiente — assim o site funciona sem configuração.
const FALLBACK = {
  VITE_SUPABASE_URL: "https://qhxwrjhbeoxamozcykdg.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoeHdyamhiZW94YW1vemN5a2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTc0MTgsImV4cCI6MjA4ODczMzQxOH0.QMj5k-rUEwKEfkgzARmuwni3gZmVJNmTP97yYWb7zbU",
  VITE_SUPABASE_PROJECT_ID: "qhxwrjhbeoxamozcykdg",
};


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const define: Record<string, string> = {};
  for (const [k, v] of Object.entries(FALLBACK)) {
    define[`import.meta.env.${k}`] = JSON.stringify(env[k] || v);
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

