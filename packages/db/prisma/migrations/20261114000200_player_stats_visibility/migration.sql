-- Privacy and contact › Stats on your profile (2026-11-13-player-stats-visibility, P11.6 #828).
-- Additive. Both switches are on by default, so every existing player keeps showing their stats.

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "show_profile_stats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_weekly_performance" BOOLEAN NOT NULL DEFAULT true;
