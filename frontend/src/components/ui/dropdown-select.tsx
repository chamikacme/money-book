import { Children, isValidElement, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const options = Children.toArray(children)
    .filter((child): child is ReactElement<OptionElementProps> => isValidElement<OptionElementProps>(child))
    .map((child) => ({
      value: String(child.props.value ?? ""),
      label: typeof child.props.children === "string" ? child.props.children : String(child.props.children ?? ""),
      disabled: Boolean(child.props.disabled),
    })) as DropdownOption[];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];

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
    if (open && event.key === "Enter" && options[activeIndex]) {
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
    if (!open) return;
    const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (step) {
      event.preventDefault();
      let next = activeIndex;
      do next = (next + step + options.length) % options.length;
      while (options[next]?.disabled && next !== activeIndex);
      setActiveIndex(next);
    }
  };

  return <div ref={rootRef} className={`dropdown-select${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}>
    <button
      type="button"
      className="dropdown-select-trigger"
      aria-controls={id}
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-label={ariaLabel}
      aria-required={required}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={onKeyDown}
    >
      <span className={selected?.value ? "" : "is-placeholder"}>{selected?.label ?? "Select an option"}</span>
      <ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div id={id} className="dropdown-select-menu" role="listbox" aria-label={ariaLabel}>
      {options.map((option, index) => <button
        type="button"
        role="option"
        aria-selected={option.value === value}
        className={`dropdown-select-option${option.value === value ? " is-selected" : ""}${index === activeIndex ? " is-active" : ""}`}
        disabled={option.disabled}
        key={`${option.value}-${index}`}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => choose(option)}
      >
        <span>{option.label}</span>
        {option.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}
