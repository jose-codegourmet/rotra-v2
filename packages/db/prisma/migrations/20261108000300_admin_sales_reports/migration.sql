-- D-2026-11-08-01 / #540: Admin Sales computed on read. One single-row Admin settings table (cost
-- per session, seeded at the ₱15 placeholder) and read-only SQL views/functions, one per report.
-- No totals table, no cron, no Edge Function. Additive; apply to a shared database only after human
-- sign-off. Days and months are Manila calendar days ('Asia/Manila').

-- CreateTable
CREATE TABLE "admin_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "cost_per_session_minor" INTEGER NOT NULL DEFAULT 1500,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "updated_by_admin_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revision" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_settings_updated_by_admin_id_idx" ON "admin_settings"("updated_by_admin_id");

-- AddForeignKey
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_updated_by_admin_id_fkey" FOREIGN KEY ("updated_by_admin_id") REFERENCES "admin_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "admin_settings"
  ADD CONSTRAINT "admin_settings_single_row" CHECK ("id" = 1),
  ADD CONSTRAINT "admin_settings_cost_per_session_nonnegative" CHECK ("cost_per_session_minor" >= 0),
  ADD CONSTRAINT "admin_settings_revision_positive" CHECK ("revision" > 0);

-- The one row. ₱15 stays a placeholder until the owner sets the real figure in Admin.
INSERT INTO "admin_settings" ("id", "cost_per_session_minor", "currency", "updated_at")
VALUES (1, 1500, 'PHP', CURRENT_TIMESTAMP);

ALTER TABLE "admin_settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "admin_settings" FROM anon, authenticated, PUBLIC;

-- ---------- Base rows (views; invoker rights, so table RLS and grants still apply) ----------

-- Every recorded license term as a payment. A free term has no paid day: it counts, at ₱0, on the
-- Manila day it was recorded (activated). `starts_on` is the first licensed Manila day.
CREATE VIEW public.rotra_sales_payment_rows WITH (security_invoker = true) AS
SELECT t.id AS term_id, t.club_id, t.plan,
  COALESCE(t.paid_on, (t.activated_at AT TIME ZONE 'Asia/Manila')::date) AS paid_on,
  t.amount_minor,
  (t.starts_at AT TIME ZONE 'Asia/Manila')::date AS starts_on
FROM public.club_license_terms t;

-- Sessions that count as started: final (completed) sessions only, on the Manila day they went
-- live; invalid and cancelled sessions never count. Free clubs count. `matches` is the completed
-- matches of that session.
CREATE VIEW public.rotra_sales_session_rows WITH (security_invoker = true) AS
SELECT s.club_id, s.id AS session_id,
  (s.started_at AT TIME ZONE 'Asia/Manila')::date AS started_on,
  (
    SELECT count(*)::integer
    FROM public.matches m
    WHERE m.club_id = s.club_id AND m.session_id = s.id AND m.state = 'completed'
  ) AS matches
FROM public.queue_sessions s
WHERE s.state = 'completed' AND s.started_at IS NOT NULL;

-- ---------- Period bars ----------

-- The bars of a period ending on p_today, oldest first (index 0): '7d' and '30d' are days, '12m'
-- is calendar months (this month included). Each bar also carries the matching bar of the period
-- before. Ends are exclusive. An unknown period returns no rows.
CREATE FUNCTION public.rotra_sales_period_buckets(p_period text, p_today date)
RETURNS TABLE (
  bucket_index integer,
  bucket_start date,
  bucket_end date,
  previous_start date,
  previous_end date
)
LANGUAGE sql IMMUTABLE SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT i,
    CASE WHEN cfg.monthly
      THEN (date_trunc('month', p_today::timestamp) - make_interval(months => cfg.n - 1 - i))::date
      ELSE p_today - (cfg.n - 1 - i) END,
    CASE WHEN cfg.monthly
      THEN (date_trunc('month', p_today::timestamp) - make_interval(months => cfg.n - 2 - i))::date
      ELSE p_today - (cfg.n - 2 - i) END,
    CASE WHEN cfg.monthly
      THEN (date_trunc('month', p_today::timestamp) - make_interval(months => 2 * cfg.n - 1 - i))::date
      ELSE p_today - (2 * cfg.n - 1 - i) END,
    CASE WHEN cfg.monthly
      THEN (date_trunc('month', p_today::timestamp) - make_interval(months => 2 * cfg.n - 2 - i))::date
      ELSE p_today - (2 * cfg.n - 2 - i) END
  FROM (
    SELECT CASE p_period WHEN '7d' THEN 7 WHEN '30d' THEN 30 WHEN '12m' THEN 12 END AS n,
      p_period = '12m' AS monthly
  ) cfg
  CROSS JOIN LATERAL generate_series(0, cfg.n - 1) AS i
  ORDER BY i;
$function$;

-- A-SALES number cards: revenue (centavos), sessions started and matches played per bar, for the
-- period and the period before. `first_licensed_on` (same on every row; null with no terms) decides
-- whether the comparison has enough history.
CREATE FUNCTION public.rotra_sales_platform_buckets(p_period text, p_today date)
RETURNS TABLE (
  bucket_index integer,
  bucket_start text,
  previous_start text,
  revenue_minor bigint,
  sessions integer,
  matches integer,
  previous_revenue_minor bigint,
  previous_sessions integer,
  previous_matches integer,
  first_licensed_on text
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT b.bucket_index,
    to_char(b.bucket_start, 'YYYY-MM-DD'),
    to_char(b.previous_start, 'YYYY-MM-DD'),
    COALESCE((
      SELECT sum(p.amount_minor) FROM public.rotra_sales_payment_rows p
      WHERE p.paid_on >= b.bucket_start AND p.paid_on < b.bucket_end
    ), 0)::bigint,
    (
      SELECT count(*) FROM public.rotra_sales_session_rows s
      WHERE s.started_on >= b.bucket_start AND s.started_on < b.bucket_end
    )::integer,
    COALESCE((
      SELECT sum(s.matches) FROM public.rotra_sales_session_rows s
      WHERE s.started_on >= b.bucket_start AND s.started_on < b.bucket_end
    ), 0)::integer,
    COALESCE((
      SELECT sum(p.amount_minor) FROM public.rotra_sales_payment_rows p
      WHERE p.paid_on >= b.previous_start AND p.paid_on < b.previous_end
    ), 0)::bigint,
    (
      SELECT count(*) FROM public.rotra_sales_session_rows s
      WHERE s.started_on >= b.previous_start AND s.started_on < b.previous_end
    )::integer,
    COALESCE((
      SELECT sum(s.matches) FROM public.rotra_sales_session_rows s
      WHERE s.started_on >= b.previous_start AND s.started_on < b.previous_end
    ), 0)::integer,
    (SELECT to_char(min(p.starts_on), 'YYYY-MM-DD') FROM public.rotra_sales_payment_rows p)
  FROM public.rotra_sales_period_buckets(p_period, p_today) b
  ORDER BY b.bucket_index;
$function$;

-- ---------- Period lists ----------

-- A-SALES › Revenue by plan: every plan (enum order: monthly, yearly) with its total and payments.
CREATE FUNCTION public.rotra_sales_revenue_by_plan(p_period text, p_today date)
RETURNS TABLE (plan text, total_minor bigint, payments integer)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH period AS (
    SELECT min(b.bucket_start) AS from_day, max(b.bucket_end) AS to_day
    FROM public.rotra_sales_period_buckets(p_period, p_today) b
  )
  SELECT plans.plan::text, COALESCE(sum(p.amount_minor), 0)::bigint, count(p.term_id)::integer
  FROM period
  CROSS JOIN unnest(enum_range(NULL::public.license_plan)) AS plans(plan)
  LEFT JOIN public.rotra_sales_payment_rows p
    ON p.plan = plans.plan AND p.paid_on >= period.from_day AND p.paid_on < period.to_day
  GROUP BY plans.plan
  ORDER BY plans.plan;
$function$;

-- A-SALES › Latest payments: the newest p_limit payments in the period.
CREATE FUNCTION public.rotra_sales_recent_payments(p_period text, p_today date, p_limit integer)
RETURNS TABLE (
  term_id uuid,
  club_id uuid,
  club_name text,
  plan text,
  paid_on text,
  amount_minor integer
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH period AS (
    SELECT min(b.bucket_start) AS from_day, max(b.bucket_end) AS to_day
    FROM public.rotra_sales_period_buckets(p_period, p_today) b
  )
  SELECT p.term_id, p.club_id, c.name, p.plan::text, to_char(p.paid_on, 'YYYY-MM-DD'),
    p.amount_minor
  FROM period
  JOIN public.rotra_sales_payment_rows p
    ON p.paid_on >= period.from_day AND p.paid_on < period.to_day
  JOIN public.clubs c ON c.id = p.club_id
  ORDER BY p.paid_on DESC, p.term_id::text DESC
  LIMIT p_limit;
$function$;

-- A-SALES › Most active clubs: clubs with sessions or money paid in the period, by matches then
-- money paid; ties keep the club directory order (newest club first).
CREATE FUNCTION public.rotra_sales_most_active_clubs(p_period text, p_today date, p_limit integer)
RETURNS TABLE (
  club_id uuid,
  club_name text,
  sessions integer,
  matches integer,
  paid_minor bigint
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH period AS (
    SELECT min(b.bucket_start) AS from_day, max(b.bucket_end) AS to_day
    FROM public.rotra_sales_period_buckets(p_period, p_today) b
  ), activity AS (
    SELECT c.id, c.name, c.created_at,
      (
        SELECT count(*) FROM public.rotra_sales_session_rows s
        WHERE s.club_id = c.id AND s.started_on >= period.from_day AND s.started_on < period.to_day
      )::integer AS sessions,
      COALESCE((
        SELECT sum(s.matches) FROM public.rotra_sales_session_rows s
        WHERE s.club_id = c.id AND s.started_on >= period.from_day AND s.started_on < period.to_day
      ), 0)::integer AS matches,
      COALESCE((
        SELECT sum(p.amount_minor) FROM public.rotra_sales_payment_rows p
        WHERE p.club_id = c.id AND p.paid_on >= period.from_day AND p.paid_on < period.to_day
      ), 0)::bigint AS paid_minor
    FROM period CROSS JOIN public.clubs c
  )
  SELECT a.id, a.name, a.sessions, a.matches, a.paid_minor
  FROM activity a
  WHERE a.sessions > 0 OR a.paid_minor > 0
  ORDER BY a.matches DESC, a.paid_minor DESC, a.created_at DESC, a.id
  LIMIT p_limit;
$function$;

-- ---------- Club Sales tab ----------

-- A-CLUB-SALES › Month by month: the last p_months calendar months up to p_today, oldest first,
-- with what the club paid, its started sessions and their matches, and the current Admin cost per
-- session (one value for every month). Days after p_today never count.
CREATE FUNCTION public.rotra_sales_club_months(p_club_id uuid, p_today date, p_months integer)
RETURNS TABLE (
  month text,
  paid_minor bigint,
  sessions integer,
  matches integer,
  cost_per_session_minor integer
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH months AS (
    SELECT k,
      (date_trunc('month', p_today::timestamp) - make_interval(months => k))::date AS month_start,
      LEAST(
        (date_trunc('month', p_today::timestamp) - make_interval(months => k - 1))::date,
        p_today + 1
      ) AS month_end
    FROM generate_series(p_months - 1, 0, -1) AS k
  )
  SELECT to_char(m.month_start, 'YYYY-MM'),
    COALESCE((
      SELECT sum(p.amount_minor) FROM public.rotra_sales_payment_rows p
      WHERE p.club_id = p_club_id AND p.paid_on >= m.month_start AND p.paid_on < m.month_end
    ), 0)::bigint,
    (
      SELECT count(*) FROM public.rotra_sales_session_rows s
      WHERE s.club_id = p_club_id AND s.started_on >= m.month_start AND s.started_on < m.month_end
    )::integer,
    COALESCE((
      SELECT sum(s.matches) FROM public.rotra_sales_session_rows s
      WHERE s.club_id = p_club_id AND s.started_on >= m.month_start AND s.started_on < m.month_end
    ), 0)::integer,
    settings.cost_per_session_minor
  FROM months m
  CROSS JOIN public.admin_settings settings
  WHERE settings.id = 1
  ORDER BY m.month_start;
$function$;

-- Admin-only reports: never an RPC for Supabase client roles. Invoker privileges and RLS remain.
REVOKE ALL ON TABLE public.rotra_sales_payment_rows, public.rotra_sales_session_rows
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotra_sales_period_buckets(text, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotra_sales_platform_buckets(text, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotra_sales_revenue_by_plan(text, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotra_sales_recent_payments(text, date, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotra_sales_most_active_clubs(text, date, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rotra_sales_club_months(uuid, date, integer)
  FROM PUBLIC, anon, authenticated;

-- Deployment sign-off must identify the actual DATABASE_URL runtime role and grant only that role
-- SELECT on the two views and EXECUTE on the functions, as for rotra_player_compare. Do not guess a
-- role or expose these via RPC.
-- GRANT SELECT ON public.rotra_sales_payment_rows, public.rotra_sales_session_rows TO "<runtime_role>";
-- GRANT EXECUTE ON FUNCTION public.rotra_sales_platform_buckets(text, date) TO "<runtime_role>";
