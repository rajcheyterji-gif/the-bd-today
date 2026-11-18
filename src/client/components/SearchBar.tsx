import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";

/** Search input in the same pill style as the header search bar:
 *  rounded-full, magnifier inside on the left, a clear (×) button and a
 *  round red submit button on the right. */
export function SearchBar({
  initialValue = "",
  placeholder = "খবর খুঁজুন…",
  autoFocus = false,
  className = "",
}: {
  initialValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();
  return (
    <form
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        খবর খুঁজুন
      </label>
      <Search
        size={20}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        id="site-search"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-11 pr-24 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-[#c1121f] focus:outline-none focus:ring-1 focus:ring-[#c1121f] [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label="মুছুন"
          onClick={() => setValue("")}
          className="absolute right-14 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-700"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      )}
      <button
        type="submit"
        aria-label="খুঁজুন"
        className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#c1121f] text-white hover:bg-[#9e0e19]"
      >
        <Search size={18} />
      </button>
    </form>
  );
}
