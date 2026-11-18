import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
      <Link to="/" className="inline-flex items-center gap-1 hover:text-[#c1121f]">
        <Home size={14} />
        <span>Home</span>
      </Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1">
          <ChevronRight size={14} className="text-slate-400" />
          {item.to ? (
            <Link to={item.to} className="hover:text-[#c1121f]">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-slate-800">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
