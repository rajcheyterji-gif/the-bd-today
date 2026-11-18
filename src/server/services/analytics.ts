// Dashboard + analytics service. Daily views come from the `article_views`
// table (one row per public article view, written by incrementArticleViews).
import type { AnalyticsResponse, DashboardStats } from "../../shared/types";
import { daysAgoIso, isoDatePart } from "../lib/db";
import { getArticleById } from "./articles";

export async function getDashboardStats(db: D1Database): Promise<DashboardStats> {
  const byStatus = await db
    .prepare(`SELECT status, COUNT(*) AS count FROM articles GROUP BY status`)
    .all<{ status: string; count: number }>();
  const articlesByStatus: Record<string, number> = {};
  for (const row of byStatus.results ?? []) articlesByStatus[row.status] = row.count;

  const totals = {
    articles: sumStatus(articlesByStatus),
    published_articles: articlesByStatus.published ?? 0,
    draft_articles: articlesByStatus.draft ?? 0,
    scheduled_articles: articlesByStatus.scheduled ?? 0,
    users: (await db.prepare(`SELECT COUNT(*) AS total FROM users`).first<{ total: number }>())
      ?.total ?? 0,
    pending_comments:
      (await db
        .prepare(`SELECT COUNT(*) AS total FROM comments WHERE status = 'pending'`)
        .first<{ total: number }>())?.total ?? 0,
    total_views:
      (await db
        .prepare(`SELECT COALESCE(SUM(views), 0) AS total FROM articles`)
        .first<{ total: number }>())?.total ?? 0,
    subscribers:
      (await db
        .prepare(`SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE status = 'active'`)
        .first<{ total: number }>())?.total ?? 0,
  };

  const { results: recentRows } = await db
    .prepare(
      `SELECT a.id FROM articles a ORDER BY a.created_at DESC LIMIT 5`,
    )
    .all<{ id: number }>();
  const recentArticles = [];
  for (const row of recentRows ?? []) {
    const full = await getArticleById(db, row.id);
    if (full) recentArticles.push(full);
  }

  const { results: recentComments } = await db
    .prepare(
      `SELECT c.id, c.article_id, a.title AS article_title, a.slug AS article_slug,
              c.author_name, c.author_email, c.content, c.status, c.created_at
       FROM comments c LEFT JOIN articles a ON a.id = c.article_id
       ORDER BY c.created_at DESC LIMIT 5`,
    )
    .all<DashboardStats["recent_comments"][number]>();

  const { results: topRows } = await db
    .prepare(`SELECT a.id FROM articles a ORDER BY a.views DESC LIMIT 5`)
    .all<{ id: number }>();
  const topArticles = [];
  for (const row of topRows ?? []) {
    const full = await getArticleById(db, row.id);
    if (full) topArticles.push(full);
  }

  const { results: recentAuditLogs } = await db
    .prepare(
      `SELECT al.id, al.user_id, u.name AS user_name, al.action, al.entity_type,
              al.entity_id, al.details, al.ip_address, al.created_at
       FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT 10`,
    )
    .all<DashboardStats["recent_audit_logs"][number]>();

  return {
    totals,
    articles_by_status: articlesByStatus,
    recent_articles: recentArticles,
    recent_comments: recentComments ?? [],
    recent_audit_logs: recentAuditLogs ?? [],
    top_articles: topArticles,
  };
}

function sumStatus(byStatus: Record<string, number>): number {
  return Object.values(byStatus).reduce((sum, n) => sum + n, 0);
}

export async function getAnalytics(db: D1Database, days: number): Promise<AnalyticsResponse> {
  const rangeDays = Math.min(Math.max(days, 1), 90);
  const startIso = daysAgoIso(rangeDays);

  // Daily views, gap-filled with 0 for days with no views.
  const { results: dayRows } = await db
    .prepare(
      `SELECT substr(viewed_at, 1, 10) AS date, COUNT(*) AS views
       FROM article_views WHERE viewed_at >= ?
       GROUP BY date ORDER BY date ASC`,
    )
    .bind(startIso)
    .all<{ date: string; views: number }>();
  const byDay = new Map((dayRows ?? []).map((r) => [r.date, r.views]));
  const viewsByDay: Array<{ date: string; views: number }> = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const date = isoDatePart(daysAgoIso(i));
    viewsByDay.push({ date, views: byDay.get(date) ?? 0 });
  }
  const totalViews = viewsByDay.reduce((sum, d) => sum + d.views, 0);

  const { results: topArticles } = await db
    .prepare(
      `SELECT id, slug, title, views FROM articles
       WHERE status = 'published' ORDER BY views DESC LIMIT 10`,
    )
    .all<{ id: number; slug: string; title: string; views: number }>();

  const { results: viewsByCategory } = await db
    .prepare(
      `SELECT c.name_en AS category, c.slug AS category_slug,
              COALESCE(SUM(a.views), 0) AS views, COUNT(a.id) AS articles
       FROM categories c
       LEFT JOIN articles a ON a.category_id = c.id AND a.status = 'published'
       GROUP BY c.id ORDER BY views DESC`,
    )
    .all<{ category: string; category_slug: string; views: number; articles: number }>();

  const totals = {
    articles:
      (await db.prepare(`SELECT COUNT(*) AS total FROM articles`).first<{ total: number }>())
        ?.total ?? 0,
    published_articles:
      (await db
        .prepare(`SELECT COUNT(*) AS total FROM articles WHERE status = 'published'`)
        .first<{ total: number }>())?.total ?? 0,
    users: (await db.prepare(`SELECT COUNT(*) AS total FROM users`).first<{ total: number }>())
      ?.total ?? 0,
    subscribers:
      (await db
        .prepare(`SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE status = 'active'`)
        .first<{ total: number }>())?.total ?? 0,
    comments:
      (await db.prepare(`SELECT COUNT(*) AS total FROM comments`).first<{ total: number }>())
        ?.total ?? 0,
  };

  return {
    range_days: rangeDays,
    total_views: totalViews,
    views_by_day: viewsByDay,
    top_articles: topArticles ?? [],
    views_by_category: viewsByCategory ?? [],
    totals,
  };
}
