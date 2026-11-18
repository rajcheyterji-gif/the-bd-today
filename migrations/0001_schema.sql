-- THE BD TODAY — 0001: core schema (D1 / SQLite)
--
-- Conventions
--   * All *_at timestamps are ISO-8601 UTC strings (e.g. 2026-11-18T09:00:00.000Z),
--     produced by `strftime('%Y-%m-%dT%H:%M:%fZ','now')` as the column default.
--     Never compare them with datetime('now') ('YYYY-MM-DD HH:MM:SS' sorts
--     wrong against ISO strings); use strftime('%Y-%m-%dT%H:%M:%fZ','now').
--   * Articles keep the contract columns (content, category_id FK). Two extra
--     columns exist for the SEO routes (src/server/routes/seo.ts), which read
--     the table directly:
--       - articles.body      GENERATED ALWAYS AS (content) — mirror of content
--       - articles.category  denormalized category name_en, kept in sync by
--                            the article/category services on every write
--       - categories.name    GENERATED ALWAYS AS (name_en) — used by the
--                            sitemap's `ORDER BY name`
--   * Foreign keys are declared for documentation; the services also delete
--     child rows explicitly because D1 FK enforcement is not relied on.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('admin', 'editor', 'author')),
  avatar_url TEXT,
  bio TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, -- hex SHA-256 of the raw session token (raw token is never stored)
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name TEXT GENERATED ALWAYS AS (name_en) STORED,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  body TEXT GENERATED ALWAYS AS (content) STORED,
  category_id INTEGER NOT NULL REFERENCES categories (id),
  category TEXT, -- denormalized categories.name_en (SEO/RSS reads this)
  author_id INTEGER NOT NULL REFERENCES users (id),
  featured_image_url TEXT,
  image_caption TEXT,
  image_credit TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TEXT,
  scheduled_at TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  reading_time_minutes INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles (status, published_at);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles (author_id);
CREATE INDEX IF NOT EXISTS idx_articles_views ON articles (views);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_bn TEXT
);

CREATE TABLE IF NOT EXISTS article_tags (
  article_id INTEGER NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags (tag_id);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  alt_text TEXT,
  uploaded_by INTEGER REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_media_created ON media (created_at);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_article_status ON comments (article_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments (created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS navigation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  label_bn TEXT,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  parent_id INTEGER REFERENCES navigation (id),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users (id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT, -- JSON object
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);

-- One row per public article view; feeds the admin analytics daily chart.
CREATE TABLE IF NOT EXISTS article_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  viewed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_article_views_article_date ON article_views (article_id, viewed_at);
