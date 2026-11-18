import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
  }
  const unique = [...new Set(pages)];
  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
        className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#c1121f] hover:text-[#c1121f] disabled:opacity-40"
      >
        <ChevronLeft size={16} /> Prev
      </button>
      {unique.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && unique[i - 1] !== undefined && p - (unique[i - 1] as number) > 1 && (
            <span className="px-1 text-slate-400">…</span>
          )}
          <button
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? "page" : undefined}
            className={`rounded px-3 py-2 text-sm font-semibold ${
              p === page
                ? "bg-[#c1121f] text-white"
                : "border border-slate-300 text-slate-700 hover:border-[#c1121f] hover:text-[#c1121f]"
            }`}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
        className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#c1121f] hover:text-[#c1121f] disabled:opacity-40"
      >
        Next <ChevronRight size={16} />
      </button>
    </nav>
  );
}
