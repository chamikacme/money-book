import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["moneybook.svg"],
      manifest: {
        name: "MoneyBook",
        short_name: "MoneyBook",
        description: "Personal finance, clearly accounted for.",
        theme_color: "#24467d",
        background_color: "#f7f8fa",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/moneybook.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }]
      }
    })
  ],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname.replace(/^\/([A-Za-z]:\/)/, "$1") },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
