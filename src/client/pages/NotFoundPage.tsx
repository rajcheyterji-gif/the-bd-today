import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center">
      <Seo title="Page not found" description="The page you are looking for does not exist — THE BD TODAY." />
      <p className="font-serif text-7xl font-black text-[#c1121f]">404</p>
      <h1 className="mt-2 font-serif text-3xl font-black text-slate-900">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md text-slate-600">
        The page you are looking for may have been moved, renamed or removed — or the link may simply be wrong.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="rounded bg-[#c1121f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9e0e19]">
          Back to home
        </Link>
        <Link to="/latest" className="rounded border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#c1121f] hover:text-[#c1121f]">
          Latest news
        </Link>
        <Link to="/search" className="rounded border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#c1121f] hover:text-[#c1121f]">
          Search
        </Link>
      </div>
    </div>
  );
}
