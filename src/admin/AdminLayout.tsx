import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleUserRound,
  Clock,
  ExternalLink,
  FilePlus2,
  FileText,
  Folder,
  Globe,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Navigation as NavigationIcon,
  ScrollText,
  Settings,
  Tag,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useToast } from "./components/Toast";

interface NavEntry {
  path: string;
  label: string;
  icon: LucideIcon;
  section: string;
}

const NAV: NavEntry[] = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3, section: "Overview" },
  { path: "/admin/articles", label: "Articles", icon: FileText, section: "Content" },
  { path: "/admin/articles/new", label: "New Article", icon: FilePlus2, section: "Content" },
  { path: "/admin/drafts", label: "Drafts", icon: Clock, section: "Content" },
  { path: "/admin/scheduled", label: "Scheduled", icon: CalendarClock, section: "Content" },
  { path: "/admin/published", label: "Published", icon: CheckCircle2, section: "Content" },
  { path: "/admin/categories", label: "Categories", icon: Folder, section: "Content" },
  { path: "/admin/tags", label: "Tags", icon: Tag, section: "Content" },
  { path: "/admin/media", label: "Media Library", icon: Image, section: "Content" },
  { path: "/admin/authors", label: "Authors", icon: User, section: "People" },
  { path: "/admin/users", label: "Users", icon: Users, section: "People" },
  { path: "/admin/profile", label: "My Profile", icon: CircleUserRound, section: "People" },
  { path: "/admin/comments", label: "Comments", icon: MessageSquare, section: "People" },
  { path: "/admin/seo", label: "SEO Manager", icon: Globe, section: "Site" },
  { path: "/admin/settings", label: "Settings", icon: Settings, section: "Site" },
  { path: "/admin/navigation", label: "Navigation", icon: NavigationIcon, section: "Site" },
  { path: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, section: "Site" },
];

const SECTIONS = ["Overview", "Content", "People", "Site"];

function isActive(current: string, entry: NavEntry): boolean {
  if (entry.path === "/admin") return current === "/admin" || current === "/admin/";
  if (entry.path === "/admin/articles") return current === "/admin/articles";
  return current === entry.path || current.startsWith(`${entry.path}/`);
}

/** Admin shell: collapsible sidebar (drawer on mobile), topbar with the
 *  signed-in user + role from the session, and logout. */
export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const currentPath = location.pathname;

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPath]);

  const handleLogout = async () => {
    await logout();
    toast.info("Signed out.");
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#160a1a] via-[#241026] to-[#330f22] text-rose-50">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <Link to="/admin" className="text-left">
          {/* Bengali wordmark on a white pill so it reads on the dark sidebar */}
          <span className="inline-block rounded-xl bg-white px-2.5 py-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
            <img src="/logo.png" alt="দ্য বিডি টুডে" className="h-7 w-auto" />
          </span>
        </Link>
        <button
          type="button"
          aria-label="Close menu"
          className="shrink-0 rounded-full p-2.5 text-rose-200 hover:bg-white/10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4" aria-label="Admin navigation">
        {SECTIONS.map((section) => (
          <div key={section} className="mt-4 first:mt-1">
            <p className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-300/50">{section}</p>
            <ul className="space-y-1">
              {NAV.filter((n) => n.section === section).map((n) => {
                const active = isActive(currentPath, n);
                const Icon = n.icon;
                return (
                  <li key={n.path}>
                    <Link
                      to={n.path}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition ${
                        active
                          ? "bg-gradient-to-r from-[#ff4157] to-[#e0112b] font-semibold text-white shadow-[0_10px_24px_rgba(225,17,43,0.45)]"
                          : "text-rose-100/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          active ? "bg-white/20 text-white" : "bg-white/10 text-rose-200"
                        }`}
                        aria-hidden="true"
                      >
                        <Icon size={19} strokeWidth={2.25} />
                      </span>
                      {n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link
          to="/"
          className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-rose-100/80 transition hover:bg-white/10 hover:text-white"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-rose-200" aria-hidden="true">
            <ExternalLink size={18} strokeWidth={2.25} />
          </span>
          View public site
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff2f4] via-[#fff8f9] to-white text-slate-900 [color-scheme:light]">
      {/* Mobile drawer */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* overflow-x-clip (not hidden) so a stray wide element can never make
          the admin scroll sideways on a phone — clip, unlike hidden, does
          not create a scroll container, so the sticky header keeps working. */}
      <div className="overflow-x-clip lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-rose-100 bg-white/85 px-3 py-2.5 shadow-[0_4px_20px_rgba(225,17,43,0.05)] backdrop-blur sm:gap-3 sm:px-5">
          <button
            type="button"
            aria-label="Open menu"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-rose-50 hover:text-[#e0112b] lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} strokeWidth={2.25} />
          </button>
          <Link to="/admin" className="flex min-w-0 shrink-0 items-center lg:hidden" aria-label="THE BD TODAY Admin">
            <img src="/logo.png" alt="দ্য বিডি টুডে" className="h-8 w-auto" />
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Name + role are hidden on phones: the avatar alone identifies
                the signed-in user and keeps the header from crowding.
                Tapping it opens My Profile. */}
            <Link to="/admin/profile" className="flex min-w-0 items-center gap-2 rounded-xl sm:gap-3" aria-label="My profile">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="max-w-40 truncate text-sm font-semibold text-slate-900 lg:max-w-none">{user?.name ?? "…"}</p>
                <p className="text-xs capitalize text-slate-500">{user?.role?.replace("_", " ") ?? "…"}</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4157] to-[#e0112b] text-sm font-bold text-white shadow-[0_6px_16px_rgba(225,17,43,0.35)]" aria-hidden="true">
                {(user?.name ?? "?").charAt(0).toUpperCase()}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Log out"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-rose-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-[#e0112b]"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
