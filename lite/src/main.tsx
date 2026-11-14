import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
});

function Root() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return <main className="setup-message">Add <code>VITE_CLERK_PUBLISHABLE_KEY</code> to Lite’s environment to continue.</main>;
  return <ClerkProvider publishableKey={publishableKey}><QueryClientProvider client={queryClient}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></ClerkProvider>;
}

createRoot(document.getElementById("root")!).render(<Root />);
