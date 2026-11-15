import { type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import { ArrowDownLeft, ArrowUpRight, CircleHelp, Plus, type LucideIcon } from "lucide-react";
import { PageActionsContext, PageFrame } from "./page-frame";
import { Sheet, SheetTrigger } from "./ui/sheet-form";
import { DropdownSelect } from "./ui/dropdown-select";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

export function WorkspacePage({ title, description, page, children }: { title: string; description: string; page: string; children: ReactNode }) {
  return <div className={`workspace-page workspace-page--${page}`}><PageFrame title={title} description={description}><div className="workspace-content">{children}</div></PageFrame></div>;
}

export function PageAction({ label, onClick, icon: Icon = Plus }: { label: string; onClick: () => void; icon?: LucideIcon }) {
  const target = useContext(PageActionsContext);
  return target ? createPortal(<SheetTrigger onClick={onClick}><Icon size={15} />{label}</SheetTrigger>, target) : null;
}

export function PageActionButton({ label, onClick, icon: Icon, variant = "outline", className }: { label: string; onClick: () => void; icon?: LucideIcon; variant?: "default" | "outline" | "ghost"; className?: string }) {
  const target = useContext(PageActionsContext);
  return target ? createPortal(<Button variant={variant} className={className} onClick={onClick}>{Icon && <Icon size={15} />}{label}</Button>, target) : null;
}

export function EditSheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (value: boolean) => void; title: string; description: string; children: ReactNode }) {
  return <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description}>{children}</Sheet>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Card className={`workspace-panel ${className}`}>{children}</Card>;
}

export function PanelHeading({ eyebrow, title, aside }: { eyebrow?: string; title: string; aside?: ReactNode }) {
  return <div className="workspace-panel-heading"><div>{eyebrow && <span className="workspace-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{aside}</div>;
}

export function StatTile({ label, value, detail, icon: Icon, tone = "navy" }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: "navy" | "green" | "red" | "neutral" | "blue" }) {
  return <article className={`workspace-stat workspace-stat--${tone}`}><span className="workspace-stat-icon"><Icon size={17} /></span><span className="workspace-stat-label">{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

export function SectionBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "red" | "blue" }) {
  return <span className={`workspace-badge workspace-badge--${tone}`}>{children}</span>;
}

export function EmptyState({ title, detail, icon: Icon = CircleHelp, action }: { title: string; detail: string; icon?: LucideIcon; action?: ReactNode }) {
  return <div className="workspace-empty"><span className="workspace-empty-icon"><Icon size={20} /></span><strong>{title}</strong><p>{detail}</p>{action}</div>;
}

export function Money({ minor, currency = DEFAULT_CURRENCY, signed = false, tone = "neutral" }: { minor: number; currency?: string; signed?: boolean; tone?: "neutral" | "positive" | "negative" }) {
  const value = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100);
  return <span className={`workspace-money workspace-money--${tone}${minor < 0 ? " is-negative" : ""}`}>{signed && minor !== 0 ? minor < 0 ? <ArrowUpRight size={13} aria-label="Outflow" /> : <ArrowDownLeft size={13} aria-label="Inflow" /> : null}{minor < 0 ? "−" : signed && minor > 0 ? "+" : ""}{value}</span>;
}

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="workspace-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export const DEFAULT_CURRENCY = "LKR";
export const SUPPORTED_CURRENCIES = [
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "EUR", name: "Euro" },
  { code: "AUD", name: "Australian Dollar" },
] as const;

export function CurrencySelect({ value, onChange, ariaLabel }: { value: string; onChange: (value: string) => void; ariaLabel?: string }) {
  const isSupported = SUPPORTED_CURRENCIES.some((currency) => currency.code === value);
  return <DropdownSelect aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>
    {!isSupported && value && <option value={value}>{value} · saved currency</option>}
    {SUPPORTED_CURRENCIES.map(({ code, name }) => <option key={code} value={code}>{code} · {name}</option>)}
  </DropdownSelect>;
}

export function ErrorNotice({ message }: { message?: string | null }) {
  return message ? <p className="workspace-error" role="alert">{message}</p> : null;
}

export function MutedText({ children }: { children: ReactNode }) { return <p className="workspace-muted">{children}</p>; }
