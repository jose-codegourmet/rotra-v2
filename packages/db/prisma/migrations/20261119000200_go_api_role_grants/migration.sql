-- Grants for the Go API database role (go-signed-in-reads). Earlier migrations revoked these from PUBLIC and left
-- a commented GRANT for the runtime role (20261108000200, 20261108000300). Go reads them, so its role gets them.
-- The role name is `rotra_api`. It is a name chosen here, not one found in the repo: if the Go API connects as
-- another role, change the name below before applying. The block is a no-op when the role does not exist, so the
-- migration applies anywhere (a local database, CI), and running it twice changes nothing (GRANT is idempotent).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rotra_api') THEN
    RAISE NOTICE 'role rotra_api does not exist: Go API grants skipped';
    RETURN;
  END IF;

  -- Player compare (GET /api/players/{id}/compare).
  GRANT EXECUTE ON FUNCTION public.rotra_player_compare(uuid, uuid) TO rotra_api;

  -- Admin sales reads: the two views, the report functions, and the threshold setting.
  GRANT SELECT ON TABLE public.rotra_sales_payment_rows, public.rotra_sales_session_rows TO rotra_api;
  GRANT EXECUTE ON FUNCTION public.rotra_sales_period_buckets(text, date) TO rotra_api;
  GRANT EXECUTE ON FUNCTION public.rotra_sales_platform_buckets(text, date) TO rotra_api;
  GRANT EXECUTE ON FUNCTION public.rotra_sales_revenue_by_plan(text, date) TO rotra_api;
  GRANT EXECUTE ON FUNCTION public.rotra_sales_recent_payments(text, date, integer) TO rotra_api;
  GRANT EXECUTE ON FUNCTION public.rotra_sales_most_active_clubs(text, date, integer) TO rotra_api;
  GRANT EXECUTE ON FUNCTION public.rotra_sales_club_months(uuid, date, integer) TO rotra_api;
  GRANT SELECT ON TABLE public.admin_settings TO rotra_api;

  -- GET /api/club and /api/club/invite fill a missing invite code (clubs.invite_code, revision, updated_at).
  GRANT UPDATE ON TABLE public.clubs TO rotra_api;
END
$$;
