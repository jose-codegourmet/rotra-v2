-- F07.19 · query-plan review (#260)
-- DRAFT. The waitlist order index from F07.13 is never chosen: Prisma cannot express the NULLS LAST
-- order the read needs, and waitlist reads already use the (session_id, club_player_id) unique key.

-- DropIndex
DROP INDEX "session_waitlist_session_id_demoted_at_demoted_confirmed_at_idx";
