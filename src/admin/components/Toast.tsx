import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function useToast() {
  const push = useContext(ToastCtx);
  return {
    success: (m: string) => push("success", m),
    error: (m: string) => push("error", m),
    info: (m: string) => push("info", m),
  };
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, kind, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg ${
              t.kind === "success"
                ? "border-green-200 bg-green-50 text-green-900"
                : t.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-slate-200 bg-white text-slate-900"
            }`}
            role="status"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-green-600" size={16} />
            ) : t.kind === "error" ? (
              <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={16} />
            ) : null}
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 hover:bg-black/5"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
