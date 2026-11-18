import { Link, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { ToastProvider } from "./components/Toast";
import { AuthProvider, RequireAuth } from "./hooks/useAuth";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Analytics } from "./pages/Analytics";
import { Articles } from "./pages/Articles";
import { ArticleForm } from "./pages/ArticleForm";
import { Drafts } from "./pages/Drafts";
import { Scheduled } from "./pages/Scheduled";
import { Published } from "./pages/Published";
import { Categories } from "./pages/Categories";
import { Tags } from "./pages/Tags";
import { MediaLibrary } from "./pages/MediaLibrary";
import { Authors } from "./pages/Authors";
import { Users } from "./pages/Users";
import { Profile } from "./pages/Profile";
import { Comments } from "./pages/Comments";
import { SeoManager } from "./pages/SeoManager";
import { Settings } from "./pages/Settings";
import { Navigation } from "./pages/Navigation";
import { AuditLogs } from "./pages/AuditLogs";
import { Button } from "./components/ui";

/** Admin app, mounted under /admin by App.tsx (e.g. <Route path="/admin/*"
 *  element={<AdminApp />}). Nested react-router routes — no hash router. */
export function AdminApp() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="articles" element={<Articles />} />
            <Route path="articles/new" element={<ArticleForm />} />
            <Route path="articles/:id/edit" element={<ArticleForm />} />
            <Route path="drafts" element={<Drafts />} />
            <Route path="scheduled" element={<Scheduled />} />
            <Route path="published" element={<Published />} />
            <Route path="categories" element={<Categories />} />
            <Route path="tags" element={<Tags />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="authors" element={<Authors />} />
            <Route path="users" element={<Users />} />
            <Route path="profile" element={<Profile />} />
            <Route path="comments" element={<Comments />} />
            <Route path="seo" element={<SeoManager />} />
            <Route path="settings" element={<Settings />} />
            <Route path="navigation" element={<Navigation />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route
              path="*"
              element={
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h1 className="text-lg font-bold text-slate-900">Page not found</h1>
                  <p className="mt-1 text-sm text-slate-500">That admin page doesn’t exist.</p>
                  <Link to="/admin">
                    <Button className="mt-4">Back to dashboard</Button>
                  </Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
