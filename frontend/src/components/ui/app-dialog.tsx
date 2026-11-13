import { useEffect, useState } from "react";
import { AlertTriangle, CircleHelp } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "./button";
import { Input } from "./input";

type Request = { kind: "confirm"; title: string; description: string; confirmLabel?: string; danger?: boolean } | { kind: "input"; title: string; description: string; label: string; initialValue?: string };
type Pending = { request: Request; resolve: (value: boolean | string | null) => void };
export const askToConfirm = (request: Omit<Extract<Request, { kind: "confirm" }>, "kind">) => new Promise<boolean>((resolve) => window.dispatchEvent(new CustomEvent("ledgerlite:app-dialog", { detail: { request: { kind: "confirm", ...request }, resolve } })));
export const askForInput = (request: Omit<Extract<Request, { kind: "input" }>, "kind">) => new Promise<string | null>((resolve) => window.dispatchEvent(new CustomEvent("ledgerlite:app-dialog", { detail: { request: { kind: "input", ...request }, resolve } })));

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState("");
  useEffect(() => {
    const open = (event: Event) => { const detail = (event as CustomEvent<Pending>).detail; setValue(detail.request.kind === "input" ? detail.request.initialValue ?? "" : ""); setPending(detail); };
    window.addEventListener("ledgerlite:app-dialog", open);
    return () => window.removeEventListener("ledgerlite:app-dialog", open);
  }, []);
  const finish = (result: boolean | string | null) => { pending?.resolve(result); setPending(null); };
  const request = pending?.request;
  return <>{children}<Dialog.Root open={!!pending} onOpenChange={(open) => { if (!open) finish(request?.kind === "confirm" ? false : null); }}><Dialog.Portal><Dialog.Backdrop className="app-dialog-backdrop" /><Dialog.Popup className="app-dialog-popup" aria-describedby="app-dialog-description"><div className={`app-dialog-icon${request?.kind === "confirm" && request.danger ? " is-danger" : ""}`}>{request?.kind === "confirm" && request.danger ? <AlertTriangle size={19} /> : <CircleHelp size={19} />}</div><Dialog.Title className="app-dialog-title">{request?.title}</Dialog.Title><Dialog.Description id="app-dialog-description" className="app-dialog-description">{request?.description}</Dialog.Description>{request?.kind === "input" && <label className="app-dialog-field">{request.label}<Input autoFocus type="number" min="0.01" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && value && Number(value) > 0) finish(value); }} /></label>}<div className="app-dialog-actions"><Button type="button" variant="outline" onClick={() => finish(request?.kind === "confirm" ? false : null)}>Cancel</Button><Button type="button" className={request?.kind === "confirm" && request.danger ? "app-dialog-destructive" : ""} disabled={request?.kind === "input" && (!value || Number(value) <= 0)} onClick={() => finish(request?.kind === "confirm" ? true : value)}>{request?.kind === "input" ? "Continue" : request?.confirmLabel ?? "Confirm"}</Button></div></Dialog.Popup></Dialog.Portal></Dialog.Root></>;
}
