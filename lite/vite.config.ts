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
      includeAssets: ["moneybook-lite.svg"],
      manifest: {
        name: "MoneyBook Lite",
        short_name: "MoneyBook",
        description: "A quick view of your money and daily transactions",
        theme_color: "#153f35",
        background_color: "#f6f7f3",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/moneybook-lite.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5174,
    proxy: { "/api": "http://localhost:8787" },
  },
});
