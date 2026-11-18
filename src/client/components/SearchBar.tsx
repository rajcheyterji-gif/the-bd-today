import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export function SearchBar({
  initialValue = "",
  placeholder = "Search news…",
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
      className={`flex items-center gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search news
      </label>
      <input
        id="site-search"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#c1121f] focus:outline-none focus:ring-1 focus:ring-[#c1121f]"
      />
      <button
        type="submit"
        aria-label="Search"
        className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#c1121f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#9e0e19]"
      >
        <Search size={16} />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
