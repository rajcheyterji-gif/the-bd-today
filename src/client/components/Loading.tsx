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

/**
 * Skeleton placeholders — shown while article data is fetching so pages
 * never look blank. Flat slate blocks + Tailwind's animate-pulse only:
 * no gradients, no spinners, same newspaper layout as the real content.
 * All are aria-hidden shapes wrapped in a role="status" region.
 */

/** Card-grid skeleton mirroring the 3-col article card grid. */
export function ListPageSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading stories"
    >
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

/** Homepage skeleton: hero lead + text rows + one section heading + cards. */
export function HomeSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1280px] px-4 py-6"
      role="status"
      aria-label="Loading today's news"
    >
      <div className="animate-pulse">
        <div className="aspect-[16/8] w-full rounded bg-slate-200" />
        <div className="mt-4 h-7 w-11/12 rounded bg-slate-200" />
        <div className="mt-2 h-7 w-2/3 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-1/2 rounded bg-slate-200" />
      </div>
      <div className="mt-8 space-y-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex animate-pulse gap-4">
            <div className="flex-1">
              <div className="h-5 w-11/12 rounded bg-slate-200" />
              <div className="mt-2 h-5 w-3/4 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-1/3 rounded bg-slate-200" />
            </div>
            <div className="h-24 w-32 shrink-0 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-10">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <ListPageSkeleton count={3} />
      </div>
    </div>
  );
}

/** Article page skeleton: headline, meta line, hero image, body lines. */
export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6" role="status" aria-label="Loading article">
      <div className="animate-pulse">
        <div className="h-8 w-11/12 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-2/3 rounded bg-slate-200" />
        <div className="mt-4 h-4 w-1/2 rounded bg-slate-200" />
        <div className="mt-6 aspect-[16/9] w-full rounded bg-slate-200" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-4 rounded bg-slate-200 ${i % 3 === 2 ? "w-2/3" : "w-full"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Author page skeleton: avatar + name block, then a card grid. */
export function AuthorSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6" role="status" aria-label="Loading author">
      <div className="flex animate-pulse flex-col gap-4 rounded border border-slate-200 bg-slate-50 p-6 sm:flex-row">
        <div className="h-20 w-20 shrink-0 rounded-full bg-slate-200" />
        <div className="flex-1">
          <div className="h-7 w-56 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-full max-w-2xl rounded bg-slate-200" />
        </div>
      </div>
      <div className="mt-8">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <ListPageSkeleton count={6} />
      </div>
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
