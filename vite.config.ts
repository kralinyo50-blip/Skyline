import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [".e2b.app", ".e2b.dev", ".preview.app.github.dev", "localhost"],
  },
  build: {
    // Tum gorseller tek dosyalik ciktiya base64 olarak gomulsun
    assetsInlineLimit: 20 * 1024 * 1024,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: [".e2b.app", ".e2b.dev", ".preview.app.github.dev", "localhost"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
