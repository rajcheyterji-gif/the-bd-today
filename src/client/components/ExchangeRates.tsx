// Foreign-exchange rates strip — its own section ABOVE the footer, with
// clear breathing room on both sides (my-10), not flush against the footer.
//
// Fetches GET /api/v1/exchange-rates once on mount. While loading, on any
// error, or when the endpoint has nothing to show, the strip renders
// nothing at all — no empty band, no error message.
import { useEffect, useState } from "react";
import { formatDateBn, toBengaliDigits } from "../lib/format";

type ExchangeRate = {
  code: string;
  name: string;
  name_en: string;
  /** BDT per 1 unit of the currency. */
  rate: number;
};

type ExchangeRatesData = {
  base: string;
  updated_at: string;
  source: string;
  rates: ExchangeRate[];
};

export function ExchangeRates() {
  const [data, setData] = useState<ExchangeRatesData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/exchange-rates");
        if (!res.ok) return;
        const body = (await res.json()) as {
          success?: boolean;
          data?: ExchangeRatesData;
        };
        if (
          body?.success &&
          Array.isArray(body.data?.rates) &&
          body.data.rates.length > 0 &&
          !cancelled
        ) {
          setData(body.data);
        }
      } catch {
        // Rates unavailable — hide the strip rather than showing an error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  return (
    <section
      aria-label="বৈদেশিক মুদ্রার হার"
      className="my-10 border-y border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-[1280px] px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-serif text-[16px] font-bold text-slate-900">
            <span
              aria-hidden="true"
              className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#c1121f]"
            />
            বৈদেশিক মুদ্রার হার
          </h2>
          <p className="text-xs text-slate-500">আপডেট: {formatDateBn(data.updated_at)}</p>
        </div>
        <ul className="mt-2 flex gap-x-5 gap-y-1 overflow-x-auto whitespace-nowrap pb-1 font-serif text-[15px] text-slate-800">
          {data.rates.map((r) => (
            <li key={r.code}>
              <span className="font-bold text-slate-900">১ {r.code}</span>{" "}
              <span className="text-slate-500">({r.name})</span>{" "}
              <span className="text-slate-400" aria-hidden="true">
                =
              </span>{" "}
              <span className="font-bold text-[#c1121f]">
                ৳{toBengaliDigits(r.rate.toFixed(2))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-slate-400">
          উৎস: {data.source} · হার প্রতি ১ একক মুদ্রার বিপরীতে টাকায়
        </p>
      </div>
    </section>
  );
}
