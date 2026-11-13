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
      includeAssets: ["moneybook.svg", "moneybook-logo.svg"],
      manifest: {
        name: "MoneyBook",
        short_name: "MoneyBook",
        description: "Simplified personal finance manager",
        theme_color: "#4f46e5",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
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
