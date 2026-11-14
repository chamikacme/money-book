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
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo-light-horizontal.png", "logo-dark-horizontal.png"],
      manifest: {
        name: "MoneyBook",
        short_name: "MoneyBook",
        description: "Personal finance, clearly accounted for.",
        theme_color: "#24467d",
        background_color: "#f7f8fa",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" }]
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
