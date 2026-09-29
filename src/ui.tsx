import { useEffect, useRef } from "react";
import { X, Search, ChevronLeft } from "lucide-react";
export function Button({
  children,
  kind = "primary",
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button className={`button ${kind}`} {...p}>
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...p}>
      {children}
    </button>
  );
}
export function Card({
  children,
  className = "",
  ...p
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...p}>
      {children}
    </div>
  );
}
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      {back && (
        <IconButton label="Go back" onClick={back}>
          <ChevronLeft />
        </IconButton>
      )}
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="header-action">{action}</div>}
    </header>
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function TextInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...p} />;
}
export function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" {...p} />;
}
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}
export function SearchBar(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="search">
      <Search size={18} />
      <input aria-label="Search" {...p} />
    </label>
  );
}
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <b>{icon}</b>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="scrim"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="grab" />
        <header>
          <h2>{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Confirm({
  open,
  title,
  body,
  confirm = "Confirm",
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirm?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <p className="muted">{body}</p>
      <div className="actions">
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirm}
        </Button>
      </div>
    </Sheet>
  );
}
export function Toast({ message }: { message: string }) {
  return message ? (
    <div className="toast" role="status">
      {message}
    </div>
  ) : null;
}
export function ErrorNote({ children }: { children?: React.ReactNode }) {
  return children ? (
    <div className="error-note" role="alert">
      {children}
    </div>
  ) : null;
}
