import { Children, isValidElement, useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";

export function FormField({ label, hint, error, required, children }: { label: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return <label className={`form-field ${error ? "has-error" : ""}`}><span className="form-field__label">{label}{required && <em aria-hidden="true"> *</em>}</span>{children}{error ? <small className="form-field__error" role="alert">{error}</small> : hint && <small>{hint}</small>}</label>;
}

export function TextInput({ className="", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`text-input ${className}`.trim()} {...props} />;
}

type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

export function SelectInput({ className="", children, disabled, onChange, value, defaultValue, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ""));
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const selectedValue = String(value ?? internalValue);
  const options = useMemo(() => Children.toArray(children).flatMap((child): SelectOption[] => {
    if (!isValidElement(child) || child.type !== "option") return [];
    const option = child as ReactElement<{ children?: ReactNode; disabled?: boolean; value?: string }>;
    const label = Children.toArray(option.props.children).join("");
    return [{ disabled: option.props.disabled, label, value: String(option.props.value ?? label) }];
  }), [children]);
  const selected = options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeight = Math.min(260, options.length * 32 + 8);
      const below = window.innerHeight - rect.bottom;
      const top = below >= menuHeight + 12 ? rect.bottom + 3 : Math.max(8, rect.top - menuHeight - 3);
      setMenuStyle({ left: rect.left, top, width: rect.width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  const choose = (nextValue: string) => {
    setInternalValue(nextValue);
    setOpen(false);
    onChange?.({ target: { name: props.name, value: nextValue }, currentTarget: { name: props.name, value: nextValue } } as unknown as ChangeEvent<HTMLSelectElement>);
  };

  return <div ref={rootRef} className={`select-input ${open ? "is-open" : ""} ${className}`.trim()} data-disabled={disabled || undefined}>
    <button type="button" className="select-input__button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{selected?.label ?? ""}</button>
    {open && createPortal(<div ref={menuRef} className="select-input__menu" style={menuStyle} role="listbox">
      {options.map((option) => <button key={option.value} type="button" className={`select-input__option ${option.value === selectedValue ? "is-selected" : ""}`.trim()} disabled={option.disabled} role="option" aria-selected={option.value === selectedValue} onClick={() => choose(option.value)}>{option.label}</button>)}
    </div>, document.body)}
    <select className="select-input__native" tabIndex={-1} aria-hidden="true" disabled={disabled} value={selectedValue} onChange={(event) => choose(event.target.value)} {...props}>{children}</select>
  </div>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label?: string }) {
  return <button type="button" className={`toggle ${checked ? "is-on" : ""}`} aria-pressed={checked} onClick={() => onChange(!checked)}><span />{label && <em>{label}</em>}</button>;
}
