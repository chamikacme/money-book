import { ClerkProvider } from "@clerk/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { queryClient } from "./lib/query-client";
import { AppRoutes } from "./routes";
import { AppDialogProvider } from "./components/ui/app-dialog";
import "./styles.css";

function ConfigurationRequired() {
  return <main className="magic-landing"><div className="magic-card max-w-lg p-8 text-center"><p className="magic-kicker">Configuration required</p><h1 className="magic-title mt-4 text-3xl">Connect Clerk to MoneyBook</h1><p className="magic-description mt-4">Set <code className="magic-mono rounded bg-black/5 px-1.5 py-0.5 text-[#328d68]">VITE_CLERK_PUBLISHABLE_KEY</code> in the frontend environment.</p></div></main>;
}

function App() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return <ConfigurationRequired />;
  return <ClerkProvider publishableKey={publishableKey}><QueryClientProvider client={queryClient}><BrowserRouter><AppDialogProvider><AppRoutes /></AppDialogProvider></BrowserRouter></QueryClientProvider></ClerkProvider>;
}

createRoot(document.getElementById("root")!).render(<App />);
