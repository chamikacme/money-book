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
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "android-chrome-192x192.png", "android-chrome-512x512.png", "logo-light-horizontal.png"],
      manifest: {
        name: "MoneyBook Lite",
        short_name: "MoneyBook Lite",
        description: "A quick view of your money and daily transactions",
        theme_color: "#f6f7f3",
        background_color: "#f6f7f3",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
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
