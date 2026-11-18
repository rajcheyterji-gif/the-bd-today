import { Newspaper } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Honest empty state used whenever the API returns no content. */
export function EmptyState({
  title = "No stories yet",
  message = "Our editors have not published anything here yet. Please check back soon.",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <span className="text-slate-400">
        <Newspaper size={36} />
      </span>
      <h3 className="mt-3 font-serif text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded bg-[#c1121f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9e0e19]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
