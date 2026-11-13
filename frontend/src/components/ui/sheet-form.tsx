import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet as ShadSheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function Sheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const close = () => onOpenChange(false);
    window.addEventListener("ledgerlite:close-sheet", close);
    return () => window.removeEventListener("ledgerlite:close-sheet", close);
  }, [open, onOpenChange]);
  const editing = title.toLowerCase().startsWith("edit");

  return <ShadSheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="finance-sheet-content">
      <SheetHeader className="finance-sheet-header">
        <span className="sheet-eyebrow">{editing ? "UPDATE RECORD" : "NEW RECORD"}</span>
        <SheetTitle className="finance-sheet-title">{title}</SheetTitle>
        {description && <SheetDescription className="finance-sheet-description">{description}</SheetDescription>}
      </SheetHeader>
      <div className="sheet-body">{children}</div>
      <div className="sheet-security">Your changes won’t be applied until you save.</div>
    </SheetContent>
  </ShadSheet>;
}

export function SheetTrigger({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <Button type="button" className="sheet-trigger" onClick={onClick}>{children}</Button>;
}
