import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet as ShadSheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Sheet forms come from several pages, so keep their action styling scoped to this portal.
const sheetActions = [
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:sticky",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:z-4",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:bottom-0",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:col-span-full",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:w-full",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:mt-3",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:min-h-[46px]",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:rounded-[9px]",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:border-0",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:bg-[var(--primary)]",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:px-4",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:py-3",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:text-[var(--primary-foreground)]",
  "[&_form>:is(.primary,button[type=submit],div:has(>.primary),div:has(>button[type=submit]))]:shadow-[0_5px_12px_rgba(55,109,80,.15)]",
  "max-[760px]:[&_form>:is(.primary,div:has(>.primary))]:mt-2!",
  "max-[760px]:[&_form>:is(.primary,div:has(>.primary))]:px-0!",
  "[&_form>div:has(>.primary)]:flex [&_form>div:has(>.primary)]:items-center [&_form>div:has(>.primary)]:gap-[10px]",
  "[&_form>div:has(>.primary)>.primary]:flex-1",
  "[&_form_:is(.primary,button[type=submit])]:inline-flex",
  "[&_form_:is(.primary,button[type=submit])]:h-[38px]!",
  "[&_form_:is(.primary,button[type=submit])]:min-h-[38px]!",
  "[&_form_:is(.primary,button[type=submit])]:items-center",
  "[&_form_:is(.primary,button[type=submit])]:justify-center",
  "[&_form_:is(.primary,button[type=submit])]:rounded-[8px]!",
  "[&_form_:is(.primary,button[type=submit])]:border-0",
  "[&_form_:is(.primary,button[type=submit])]:bg-[var(--primary)]!",
  "[&_form_:is(.primary,button[type=submit])]:px-[14px]!",
  "[&_form_:is(.primary,button[type=submit])]:py-0!",
  "[&_form_:is(.primary,button[type=submit])]:font-[Manrope,ui-sans-serif,sans-serif]",
  "[&_form_:is(.primary,button[type=submit])]:text-[11px]",
  "[&_form_:is(.primary,button[type=submit])]:font-bold",
  "[&_form_:is(.primary,button[type=submit])]:text-[var(--primary-foreground)]!",
  "[&_form_:is(.primary,button[type=submit])]:shadow-[0_2px_5px_#1d31571f]!",
  "[&_form_:is(.primary,button[type=submit])]:hover:bg-[var(--primary-hover)]!",
  "[&_form>div:has(>.primary)>button:not(.primary)]:min-h-[42px]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:rounded-[8px]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:border",
  "[&_form>div:has(>.primary)>button:not(.primary)]:border-[var(--sheet-secondary-border)]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:bg-[var(--sheet-secondary-bg)]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:px-[14px]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:py-[10px]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:text-[12px]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:font-bold",
  "[&_form>div:has(>.primary)>button:not(.primary)]:text-[var(--sheet-secondary-text)]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:hover:border-[var(--sheet-secondary-border-hover)]",
  "[&_form>div:has(>.primary)>button:not(.primary)]:hover:bg-[var(--sheet-secondary-bg-hover)]",
].join(" ");

const sheetFieldColors = [
  "[&_form>label]:text-[var(--dropdown-muted)]!",
  "[&_input[data-slot=input]:not([type=checkbox]):not([type=file])]:border!",
  "[&_input[data-slot=input]:not([type=checkbox]):not([type=file])]:border-[var(--dropdown-border)]!",
  "[&_input[data-slot=input]:not([type=checkbox]):not([type=file])]:bg-[var(--dropdown-trigger)]!",
  "[&_input[data-slot=input]:not([type=checkbox]):not([type=file])]:text-[var(--dropdown-text)]!",
  "[&_input[data-slot=input]:not([type=checkbox]):not([type=file])]:placeholder:text-[var(--form-placeholder)]!",
  "[&_select]:border-[var(--dropdown-border)]!",
  "[&_select]:bg-[var(--dropdown-trigger)]!",
  "[&_select]:text-[var(--dropdown-text)]!",
  "[&_:is(input[data-slot=input]:not([type=checkbox]):not([type=file]),select)]:focus-visible:border-[var(--dropdown-accent)]!",
  "[&_:is(input[data-slot=input]:not([type=checkbox]):not([type=file]),select)]:focus-visible:outline-solid!",
  "[&_:is(input[data-slot=input]:not([type=checkbox]):not([type=file]),select)]:focus-visible:outline-[3px]!",
  "[&_:is(input[data-slot=input]:not([type=checkbox]):not([type=file]),select)]:focus-visible:outline-[var(--form-focus-ring)]!",
  "[&_:is(input[data-slot=input]:not([type=checkbox]):not([type=file]),select)]:focus-visible:outline-offset-2!",
  "[&_:is(input[data-slot=input]:not([type=checkbox]):not([type=file]),select)]:focus-visible:shadow-none!",
].join(" ");

export function Sheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const close = () => onOpenChange(false);
    window.addEventListener("ledgerlite:close-sheet", close);
    return () => window.removeEventListener("ledgerlite:close-sheet", close);
  }, [open, onOpenChange]);
  const editing = title.toLowerCase().startsWith("edit");

  return <ShadSheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="finance-sheet-content h-dvh max-h-dvh w-[min(560px,92vw)]! max-w-none! overflow-x-hidden overflow-y-auto rounded-none border-0 border-l border-l-[var(--sheet-border)] bg-[var(--sheet-surface)] px-[30px] pt-0 pb-[max(22px,env(safe-area-inset-bottom))] shadow-[var(--sheet-shadow)] overscroll-contain max-[760px]:w-full! max-[760px]:px-[18px] max-[760px]:pb-[max(16px,env(safe-area-inset-bottom))] [&_[data-slot=sheet-close]]:z-[6] [&_[data-slot=sheet-close]]:top-[23px] [&_[data-slot=sheet-close]]:right-[24px] max-[760px]:[&_[data-slot=sheet-close]]:top-[17px] max-[760px]:[&_[data-slot=sheet-close]]:right-[15px] [&_[data-slot=sheet-close]_svg]:size-[17px]!">
      <SheetHeader className="finance-sheet-header sticky z-3 top-0 grid! gap-[5px] -mx-[30px] px-[30px] pt-[27px] pb-[18px] border-b border-b-[var(--sheet-header-border)] bg-[var(--sheet-header-bg)] backdrop-blur-[14px] max-[760px]:-mx-[18px] max-[760px]:px-[18px] max-[760px]:pt-[20px] max-[760px]:pb-[15px]">
        <span className="mb-[7px] font-['DM_Mono',monospace] text-[9px] tracking-[.16em] text-[var(--green)]">{editing ? "UPDATE RECORD" : "NEW RECORD"}</span>
        <SheetTitle className="text-[24px] leading-[1.12] font-extrabold tracking-[-.055em] text-[var(--ink)]">{title}</SheetTitle>
        {description && <SheetDescription className="max-w-[440px] text-[12px] leading-[1.55] text-[var(--app-muted)]">{description}</SheetDescription>}
      </SheetHeader>
      <div className={`sheet-body pt-[22px] pb-1 max-[760px]:pt-[17px] [&_form]:m-0 [&_form]:grid [&_form]:min-w-0 [&_form]:grid-cols-2 [&_form]:items-start [&_form]:gap-x-[18px]! [&_form]:gap-y-4! max-[760px]:[&_form]:grid-cols-1 max-[760px]:[&_form]:gap-[13px]! [&_form>*]:min-w-0 [&_form>label]:block [&_form>label]:text-[11px] [&_form>label]:font-bold [&_form>label]:tracking-[.01em] [&_form>label>span]:mt-[7px] [&_form>p]:col-span-full [&_form>label:has(.dropdown-select.is-open)]:relative [&_form>label:has(.dropdown-select.is-open)]:z-5 [&_form>div:has(.dropdown-select.is-open)]:relative [&_form>div:has(.dropdown-select.is-open)]:z-5 [&_:is(input:not([type=checkbox]):not([type=file]):not(.dropdown-select-validation),select)]:min-h-[43px]! [&_:is(input:not([type=checkbox]):not([type=file]):not(.dropdown-select-validation),select)]:rounded-[9px]! [&_:is(input:not([type=checkbox]):not([type=file]):not(.dropdown-select-validation),select)]:text-[13px]! ${sheetActions} ${sheetFieldColors}`}>{children}</div>
      <div className="sheet-security pt-[10px] text-[10px] leading-[1.5] text-[#8a8b8d] max-[760px]:text-[9px]">Your changes won’t be applied until you save.</div>
    </SheetContent>
  </ShadSheet>;
}

export function SheetTrigger({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <Button type="button" className="sheet-trigger ml-auto inline-flex min-h-[36px] w-max flex-none items-center justify-center whitespace-nowrap rounded-[8px] border border-[#cbdccb] bg-[var(--green)] px-[13px] py-2 text-[11px] leading-[1.428571] font-[750] text-white hover:-translate-y-px hover:border-[#35694f] hover:bg-[#35694f] hover:text-white hover:shadow-[0_3px_10px_rgba(55,105,79,.16)]" onClick={onClick}>{children}</Button>;
}
