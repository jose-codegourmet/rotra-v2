-- Registration from the Admin link in real mode (D-2026-11-09-06, D-2026-11-20-01; P12.7 #922).
-- The Admin link gives no club: the player picks a city or province, and the RTR ID takes its place
-- from that founding city instead of a creating club's. Additive only: two NOT NULL constraints are
-- dropped, nothing else changes, no row is rewritten, and every existing row keeps its club.
--   - player_id_allocations.creating_club_id: null means the RTR ID came from the Admin link (the
--     picked city is location_code_id, as for every allocation). Still append-only.
--   - player_claim_links.issuing_club_id: null only for the staging link of an Admin-link
--     registration (a link a club issues always has its club).
-- Must be applied before the code that writes these nulls is deployed. Apply to a shared database
-- only after human sign-off.

-- AlterTable
ALTER TABLE "player_id_allocations" ALTER COLUMN "creating_club_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "player_claim_links" ALTER COLUMN "issuing_club_id" DROP NOT NULL;

-- Hand-written: Admin's RTR ID change still works on an allocation with no creating club. The guard
-- compared creating_club_id with `=`, which is never true for a null; it now compares with
-- IS NOT DISTINCT FROM. Same rule otherwise: DELETE refused; UPDATE only inside an RTR ID change,
-- with player_id, creating_club_id, sequence and allocated_at unchanged.
CREATE OR REPLACE FUNCTION "player_id_allocations_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND coalesce(current_setting('rotra.rtr_id_change', true), '') = 'on'
    AND NEW."player_id" = OLD."player_id"
    AND NEW."creating_club_id" IS NOT DISTINCT FROM OLD."creating_club_id"
    AND NEW."sequence" = OLD."sequence"
    AND NEW."allocated_at" = OLD."allocated_at"
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$;
REVOKE ALL ON FUNCTION "player_id_allocations_guard"() FROM PUBLIC;
