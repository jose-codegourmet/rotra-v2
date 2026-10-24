-- Allow player-organized (Quick) sessions without a club.
ALTER TABLE "queue_sessions" ALTER COLUMN "club_id" DROP NOT NULL;

ALTER TABLE "queue_sessions"
  ADD CONSTRAINT "clubless_only_player_organized"
  CHECK ("club_id" IS NOT NULL OR "origin" = 'player_organized');
