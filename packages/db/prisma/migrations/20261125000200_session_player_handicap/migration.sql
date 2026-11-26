-- Handicap · tonight (D-2026-11-25-03): the spots the Queue Master marked on a live roster entry.
-- Any spot makes Generate matches rest the player after 1 game in a row instead of 2 (Hard 2
-- instead of 3). Session only: Session done sets it empty. Never copied to club players, facts,
-- results, exports or any public read; Queue Master reads only. Distinct values are kept by the
-- service; the check only allows the eleven spot codes.
BEGIN;

ALTER TABLE "session_players"
  ADD COLUMN "handicap_spots" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "session_players"
  ADD CONSTRAINT "session_players_handicap_spots_check" CHECK (
    "handicap_spots" <@ ARRAY[
      'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist',
      'lower_back', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
    ]::TEXT[]
  );

COMMIT;
