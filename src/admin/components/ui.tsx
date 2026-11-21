import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertTriangle, Eye, EyeOff, X } from "lucide-react";
import { statusLabel } from "../lib/utils";

// Shared admin UI primitives — pink-red gradient theme (matches the
// sign-in page, user's reference 2026-11-21): white rounded cards,
// red-gradient primary buttons, rose-tinted icon tiles.

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" | "ghost" | "outline" | "dark" }) {
  const base =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1";
  const styles = {
    primary:
      "bg-gradient-to-r from-[#ff4157] to-[#e0112b] text-white shadow-[0_8px_20px_rgba(225,17,43,0.30)] hover:brightness-110",
    danger:
      "bg-gradient-to-r from-red-500 to-red-700 text-white shadow-[0_8px_20px_rgba(220,38,38,0.30)] hover:brightness-110",
    dark: "bg-gradient-to-r from-slate-800 to-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.30)] hover:brightness-125",
    outline: "border border-rose-200 bg-white text-slate-800 hover:bg-rose-50 hover:text-[#e0112b]",
    ghost: "text-slate-700 hover:bg-rose-50 hover:text-[#e0112b]",
  }[variant];
  return <button type="button" className={`${base} ${styles} ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-rose-100 bg-white shadow-[0_10px_30px_rgba(225,17,43,0.06)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-rose-50 px-4 py-3.5 sm:px-5">
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: ReactNode }) {
  return (
    <Card className="flex h-full flex-col justify-between gap-1.5 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-snug text-slate-500 sm:text-sm">{label}</p>
        {icon ? (
          <div className="shrink-0 rounded-xl bg-gradient-to-br from-[#ff4157] to-[#e0112b] p-2.5 text-white shadow-[0_6px_16px_rgba(225,17,43,0.35)]">
            {icon}
          </div>
        ) : null}
      </div>
      <p className="text-[28px] font-extrabold tabular-nums leading-none text-slate-900 sm:text-[34px]">{value}</p>
      {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
    </Card>
  );
}

const badgeColors: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  draft: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  scheduled: "bg-blue-100 text-blue-800",
  archived: "bg-slate-200 text-slate-700",
  rejected: "bg-red-100 text-red-800",
  spam: "bg-red-100 text-red-800",
  super_admin: "bg-slate-900 text-white",
  admin: "bg-slate-900 text-white",
  editor: "bg-blue-100 text-blue-800",
  author: "bg-slate-100 text-slate-700",
};

export function Badge({ value, className = "" }: { value: string; className?: string }) {
  const color = badgeColors[value] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${color} ${className}`}>
      {statusLabel(value)}
    </span>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-rose-100 border-t-[#e0112b]" aria-label="Loading" />
      {label}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-[#c1121f]" size={20} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Something went wrong</p>
          <p className="mt-1 break-words text-sm text-slate-600">{message}</p>
          {onRetry ? (
            <Button variant="outline" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/** Amber notice for honest API gaps: a feature the server does not expose. */
export function ApiGapNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 shrink-0" size={16} />
      <p>{message}</p>
    </div>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">
        {label} {required ? <span className="text-[#c1121f]">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-rose-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 shadow-[0_2px_10px_rgba(225,17,43,0.04)] focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

/** Password field with a show/hide toggle inside the input (44px tap
 *  target, accessible label). Used by the sign-in form and My Profile. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${inputCls} pr-11 ${props.className ?? ""}`} />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        onClick={() => setShow((s) => !s)}
        className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-[#e0112b]"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-[0_24px_60px_rgba(225,17,43,0.18)] ring-1 ring-rose-100 sm:rounded-3xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-rose-50 bg-white px-4 py-3.5 sm:px-5">
          <h3 className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">{title}</h3>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="shrink-0 rounded-full p-2.5 text-slate-500 hover:bg-rose-50 hover:text-[#e0112b]">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-slate-700">{message}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" className="w-full sm:w-auto" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/** Simple horizontal bar list (no chart library). */
export function BarList({ rows, maxLabel }: { rows: { label: string; value: number }[]; maxLabel?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-4 text-center text-sm text-slate-500">No data yet.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 truncate text-right text-slate-600 sm:w-24">{r.label}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-full bg-rose-50">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ff4157] to-[#e0112b]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right font-medium tabular-nums text-slate-900 sm:w-12">{r.value.toLocaleString()}</span>
        </li>
      ))}
      {maxLabel ? <li className="pt-1 text-right text-xs text-slate-400">{maxLabel}</li> : null}
    </ul>
  );
}
