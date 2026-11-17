import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

type DropdownChangeEvent = { target: { value: string } };
type DropdownOption = { value: string; label: string; disabled?: boolean };

type DropdownSelectProps = {
  value: string;
  onChange: (event: DropdownChangeEvent) => void;
  children: ReactNode;
  disabled?: boolean;
  required?: boolean;
  "aria-label"?: string;
  className?: string;
};
type OptionElementProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

export function DropdownSelect({ value, onChange, children, disabled = false, required = false, className = "", "aria-label": ariaLabel }: DropdownSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ above: boolean; maxHeight: number | null }>({ above: false, maxHeight: null });
  const [activeIndex, setActiveIndex] = useState(0);
  const [fieldLabel, setFieldLabel] = useState<string>();
  const options = Children.toArray(children)
    .filter((child): child is ReactElement<OptionElementProps> => isValidElement<OptionElementProps>(child))
    .map((child) => ({
      value: String(child.props.value ?? ""),
      label: typeof child.props.children === "string" ? child.props.children : String(child.props.children ?? ""),
      disabled: Boolean(child.props.disabled),
    })) as DropdownOption[];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];
  const hasSelection = options.some((option) => option.value === value && !option.disabled);

  useEffect(() => {
    if (ariaLabel) return;
    const label = rootRef.current?.closest("label");
    setFieldLabel(label?.querySelector(":scope > span")?.textContent?.trim() || label?.firstChild?.textContent?.trim() || undefined);
  }, [ariaLabel]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      let top = 8;
      let bottom = window.innerHeight - 8;
      for (let ancestor = rootRef.current?.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(ancestor).overflowY)) continue;
        const bounds = ancestor.getBoundingClientRect();
        top = Math.max(top, bounds.top + 8);
        bottom = Math.min(bottom, bounds.bottom - 8);
      }

      const bounds = trigger.getBoundingClientRect();
      const desiredHeight = Math.min(menu.scrollHeight, 250);
      const roomBelow = Math.max(0, bottom - bounds.bottom - 7);
      const roomAbove = Math.max(0, bounds.top - top - 7);
      const above = roomBelow < desiredHeight && roomAbove > roomBelow;
      const available = above ? roomAbove : roomBelow;
      setPlacement({ above, maxHeight: available < desiredHeight ? available : null });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, options.length]);

  const choose = (option: DropdownOption) => {
    if (option.disabled) return;
    onChange({ target: { value: option.value } });
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (open && (event.key === "Enter" || event.key === " ") && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex]);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((current) => !current);
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open || !options.some((option) => !option.disabled)) return;
    const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (step) {
      event.preventDefault();
      let next = activeIndex;
      do next = (next + step + options.length) % options.length;
      while (options[next]?.disabled && next !== activeIndex);
      setActiveIndex(next);
    }
  };

  return <div ref={rootRef} className={`dropdown-select relative w-full min-w-0${open ? " is-open z-[5]" : ""}${disabled ? " opacity-[.55]" : ""}${className ? ` ${className}` : ""}`}>
    {/* Keep native form validation when a styled dropdown replaces a required select. */}
    {required && !disabled && <input
      className="dropdown-select-validation"
      type="text"
      value={hasSelection && value !== "" ? value : ""}
      required
      tabIndex={-1}
      aria-hidden="true"
      onChange={() => {}}
      onInvalid={(event) => {
        event.preventDefault();
        triggerRef.current?.focus();
        setOpen(true);
      }}
    />}
    <button
      ref={triggerRef}
      type="button"
      className={`dropdown-select-trigger flex w-full min-h-[38px] cursor-pointer items-center justify-between gap-3 rounded-[8px] border px-[11px] text-left text-[11px] font-semibold text-[var(--dropdown-text)] transition-[border-color,background-color] duration-150 hover:border-[var(--dropdown-border-hover)] hover:bg-[var(--dropdown-hover)] disabled:cursor-not-allowed in-[.transaction-filters]:min-h-[35px] in-[.transaction-filters]:rounded-[6px] in-[.transaction-filters]:text-[10px] in-[.sheet-body]:min-h-[43px] in-[.sheet-body]:rounded-[9px] in-[.sheet-body]:text-[13px] in-[.settings-currency]:min-h-[39px] in-[.settings-currency]:text-[10px] ${open ? "border-[var(--dropdown-border-hover)] bg-[var(--dropdown-hover)]" : "border-[var(--dropdown-border)] bg-[var(--dropdown-trigger)]"}`}
      aria-controls={id}
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label={ariaLabel ?? fieldLabel}
      aria-required={required || undefined}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={onKeyDown}
    >
      <span className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap${selected?.value ? "" : " font-medium text-[var(--dropdown-muted)]"}`}>{selected?.label ?? "Select an option"}</span>
      <ChevronDown size={15} aria-hidden="true" className={`shrink-0 text-[var(--dropdown-muted)] transition-transform duration-150 motion-reduce:transition-none${open ? " rotate-180 text-[var(--dropdown-accent)]" : ""}`} />
    </button>
    {open && <div ref={menuRef} id={id} className={`dropdown-select-menu absolute inset-x-0 z-[1] grid max-h-[250px] overflow-y-auto rounded-[10px] border border-[var(--dropdown-border)] bg-[var(--dropdown-surface)] p-[5px] text-[var(--dropdown-text)] shadow-[var(--dropdown-shadow)] animate-[dropdown-select-enter_140ms_ease-out] motion-reduce:animate-none${placement.above ? " bottom-[calc(100%+7px)]" : " top-[calc(100%+7px)]"}`} role="listbox" aria-label={ariaLabel ?? fieldLabel} style={{ maxHeight: placement.maxHeight ?? undefined }}>
      {options.map((option, index) => <button
        type="button"
        role="option"
        aria-selected={option.value === value}
        className={`dropdown-select-option flex min-h-[34px] cursor-pointer items-center justify-between gap-3 rounded-[6px] border px-[9px] text-left text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-[.45] in-[.sheet-body]:min-h-[38px] in-[.sheet-body]:text-[12px] ${option.value === value && index === activeIndex ? "border-[var(--dropdown-border-hover)] bg-[var(--dropdown-accent-soft)] text-[var(--dropdown-accent)] hover:bg-[var(--dropdown-accent-soft)]" : `${index === activeIndex ? "bg-[var(--dropdown-hover)] text-[var(--dropdown-text)]" : `bg-transparent ${option.value === value ? "text-[var(--dropdown-accent)]" : "text-[var(--dropdown-muted)]"}`} border-transparent hover:bg-[var(--dropdown-hover)] hover:text-[var(--dropdown-text)]`}`}
        disabled={option.disabled}
        key={`${option.value}-${index}`}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => choose(option)}
      >
        <span>{option.label}</span>
        {option.value === value && <Check size={15} aria-hidden="true" className="shrink-0 text-[var(--dropdown-accent)]" />}
      </button>)}
    </div>}
  </div>;
}
