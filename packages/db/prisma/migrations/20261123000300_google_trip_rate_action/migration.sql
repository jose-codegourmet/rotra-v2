-- The Go API counts Continue with Google callbacks per client IP under their own action, so they never use up the
-- sign-in attempts the password sign-in of every app shares (go-sign-in-catch-up, owner answer of November 23, 2026).

-- AlterTable
ALTER TABLE "auth_rate_limits" DROP CONSTRAINT "auth_rate_limits_action_check";
ALTER TABLE "auth_rate_limits" ADD CONSTRAINT "auth_rate_limits_action_check" CHECK ("action" IN ('sign_in', 'reset_request', 'claim', 'refresh', 'google_trip'));
