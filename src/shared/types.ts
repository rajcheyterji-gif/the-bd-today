// Shared types for THE BD TODAY — used by both the Workers backend and the
// frontend. Keep this file free of Node / Workers-only APIs.

export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type UserRole = 'admin' | 'editor' | 'author';
export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';
export type ArticleSort = 'latest' | 'popular' | 'trending';

export interface Category {
  id: number;
  slug: string;
  name_bn: string;
  name_en: string;
  description?: string | null;
  article_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Author {
  id: number;
  name: string;
  role: UserRole;
  avatar_url?: string | null;
  bio?: string | null;
  email?: string;
  article_count?: number;
}

export interface User extends Author {
  email: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

/** The user attached to a request after session auth (no password hash). */
export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface Tag {
  id: number;
  slug: string;
  name: string;
  name_bn?: string | null;
  article_count?: number;
}

export interface Article {
  id: number | string;
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  /** Sanitized HTML (see src/shared/utils.ts sanitizeHtml). */
  content: string;
  category_id: number;
  category?: Category;
  author_id: number;
  author?: Author;
  tags: string[];
  featured_image_url?: string;
  image_caption?: string;
  image_credit?: string;
  status: ArticleStatus;
  published_at?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  views: number;
  reading_time_minutes: number;
  seo_title?: string;
  seo_description?: string;
}

export interface MediaItem {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  r2_key: string;
  url: string;
  alt_text?: string | null;
  uploaded_by?: number | null;
  uploaded_by_name?: string;
  created_at: string;
}

export interface Comment {
  id: number;
  article_id: number;
  article_title?: string;
  article_slug?: string;
  author_name: string;
  author_email?: string;
  content: string;
  status: CommentStatus;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  status: 'active' | 'unsubscribed';
  subscribed_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number | null;
  user_name?: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  /** JSON-encoded details object. */
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
}

export interface NavigationItem {
  id: number;
  label: string;
  label_bn?: string | null;
  url: string;
  position: number;
  parent_id?: number | null;
  is_active: number;
}

/** Site settings are stored as flat string key/value pairs. */
export type SiteSettings = Record<string, string>;

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: Pagination;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SessionUser;
}

export interface InitAdminRequest {
  token: string;
  name: string;
  email: string;
  password: string;
}

export interface ArticleListParams {
  category?: string;
  search?: string;
  tag?: string;
  author?: string;
  status?: ArticleStatus | 'all';
  page?: number;
  limit?: number;
  sort?: ArticleSort;
  /** Server-computed, never sent by clients: article ids whose slug loosely
   *  matches a Latin search query (see looseRoman in transliterate.ts). */
  searchSlugIds?: number[];
}

export interface DashboardStats {
  totals: {
    articles: number;
    published_articles: number;
    draft_articles: number;
    scheduled_articles: number;
    users: number;
    pending_comments: number;
    total_views: number;
    subscribers: number;
  };
  articles_by_status: Record<string, number>;
  recent_articles: Article[];
  recent_comments: Comment[];
  recent_audit_logs: AuditLog[];
  top_articles: Article[];
}

export interface AnalyticsResponse {
  range_days: number;
  total_views: number;
  views_by_day: Array<{ date: string; views: number }>;
  top_articles: Array<{ id: number; slug: string; title: string; views: number }>;
  views_by_category: Array<{ category: string; category_slug: string; views: number; articles: number }>;
  totals: {
    articles: number;
    published_articles: number;
    users: number;
    subscribers: number;
    comments: number;
  };
}
