# Owned by the backend builder: D1 migrations live here.
# Files must be named NNNN_description.sql and are applied with:
#   npm run db:migrate:local   (local dev)
#   npm run db:migrate:remote  (production)
# See README.md — "Database" section.
#
# Seed data (0002_seed.sql): 4 staff users, 9 categories, 14 tags,
# 14 Bengali articles (12 published, 1 scheduled, 1 draft), comments,
# settings, navigation and newsletter subscribers.
#
# FIRST ADMIN: the seeded users have password_hash = '__SET_VIA_INIT__'
# (a placeholder — real hashes can never live in SQL). Nobody can sign in
# with a seeded account until a real password is set. Create the first
# admin with POST /api/v1/auth/init (token = ADMIN_INIT_TOKEN, only works
# while the users table is empty); see README.md "First admin account"
# and ENVIRONMENT.md. After that, rotate/delete ADMIN_INIT_TOKEN.
#
# Timestamps are ISO-8601 UTC strings. Compare them in SQL with
# strftime('%Y-%m-%dT%H:%M:%fZ','now'), never datetime('now')
# ('YYYY-MM-DD HH:MM:SS' sorts wrong against ISO strings).
