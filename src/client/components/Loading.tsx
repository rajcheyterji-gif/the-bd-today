export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#c1121f]" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[16/9] rounded bg-slate-200" />
      <div className="mt-3 h-4 w-3/4 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-1/2 rounded bg-slate-200" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 px-4 py-8 text-center">
      <p className="font-medium text-red-800">Something went wrong</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded bg-[#c1121f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e0e19]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
