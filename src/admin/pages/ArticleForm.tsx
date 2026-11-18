import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminApi, type Article } from "../lib/adminApi";
import { ArticleEditor } from "../components/ArticleEditor";
import { ErrorState, Spinner } from "../components/ui";
import { useToast } from "../components/Toast";

/** Create + edit wrapper: /admin/articles/new renders a blank editor,
 *  /admin/articles/:id/edit loads the article first (via the list API —
 *  the server has no single-article admin endpoint). */
export function ArticleForm() {
  const { id: articleId } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(Boolean(articleId));
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;
    setLoading(true);
    adminApi
      .getArticle(articleId)
      .then((a) => {
        if (!cancelled) setArticle(a);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the article.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  if (articleId && loading) return <Spinner label="Loading article…" />;
  if (articleId && error) return <ErrorState message={error ?? "Article not found."} onRetry={() => window.location.reload()} />;
  if (articleId && !article) return <ErrorState message="Article not found." />;

  return (
    <ArticleEditor
      article={article}
      loading={false}
      onSaved={(saved) => {
        setArticle(saved);
        toast.success("Article saved.");
      }}
    />
  );
}
