-- Slot transfer accounting, manual refunds and plays free (task 2.12): the readers of a session's money.
-- packages/db/src/queue/transfer-accounting.ts (slotLedger) and financials.ts.

-- name: ListLedgerApprovedTransfers :many
-- slotLedger: the session's approved transfers with the names of both entries, oldest decision first.
SELECT t.id, t.sender_session_player_id, t.recipient_session_player_id, t.decided_at, t.amount_due_minor, t.amount_paid_minor,
       t.prior_waived_minor, t.waived_minor, (t.link_token_digest IS NOT NULL)::bool AS via_link,
       s.name_snapshot AS from_name, r.name_snapshot AS to_name
FROM session_slot_transfers t
JOIN session_players s ON s.id = t.sender_session_player_id
LEFT JOIN session_players r ON r.id = t.recipient_session_player_id
WHERE t.session_id = @session_id AND t.status = 'approved'
ORDER BY t.decided_at ASC, t.id ASC;

-- name: ListLedgerRefunds :many
SELECT session_player_id, amount_minor, currency, refunded_at
FROM session_payment_refunds
WHERE session_id = @session_id;

-- name: CountQueueFreeRoster :one
-- D-2026-11-27-01: the live roster entries that play free (the estimate's freePlayers).
SELECT count(*)::int4 FROM session_players
WHERE session_id = @session_id AND released_at IS NULL AND no_show_at IS NULL AND is_free;

-- name: ListMoneyFreeRoster :many
-- The live roster's entries that play free, by id (the reads leave out the free ones that have no mark).
SELECT id FROM session_players
WHERE session_id = @session_id AND released_at IS NULL AND no_show_at IS NULL AND is_free;

-- name: SetSessionPlayerFree :exec
-- setPlayerFree: Prisma stamps updated_at with the clock and leaves the revision alone.
UPDATE session_players SET is_free = @free, updated_at = @now WHERE id = @id;

-- name: DeletePaymentMarksOfEntry :execrows
DELETE FROM session_payment_marks WHERE session_id = @session_id AND session_player_id = @session_player_id;

-- name: InsertPaymentRefund :exec
-- created_at is the clock: Prisma stamps a column default of now() itself.
INSERT INTO session_payment_refunds (id, club_id, session_id, session_player_id, reason, slot_transfer_id, amount_minor, refunded_at, created_at)
VALUES (@id, @club_id, @session_id, @session_player_id, @reason, sqlc.narg('slot_transfer_id'), @amount_minor, @refunded_at, @refunded_at);

-- name: LockSlotTransfer :one
-- lockTransfer: the transfer row of the session, FOR UPDATE.
SELECT id, sender_session_player_id, recipient_player_id, status
FROM session_slot_transfers
WHERE id = @id AND session_id = @session_id
FOR UPDATE;

-- name: RejectSlotTransfer :exec
UPDATE session_slot_transfers SET status = 'rejected', decided_at = @now WHERE id = @id;

-- name: GetSessionPlayerForTransfer :one
SELECT id, club_id, session_id, name_snapshot, released_at, no_show_at FROM session_players WHERE id = @id;

-- name: ReleaseSessionPlayerRefunded :exec
UPDATE session_players SET released_at = @now, release_reason = 'refunded', revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: CloseEntryDropOutNotices :exec
UPDATE session_drop_out_notices SET status = 'closed', closed_at = @now WHERE session_player_id = @session_player_id AND status = 'open';

-- name: CloseOpenSlotTransfers :exec
-- closePendingSlotTransfers: Start (expired) and Cancel session (cancelled) close every pending transfer.
UPDATE session_slot_transfers SET status = @status, decided_at = @now WHERE session_id = @session_id AND status = 'pending';


-- name: ListPaymentStatusRoster :many
-- liveRoster for the public payment status: the live entries in slot order.
SELECT id, name_snapshot, is_free FROM session_players
WHERE session_id = @session_id AND released_at IS NULL AND no_show_at IS NULL
ORDER BY confirmed_at ASC, id ASC;

-- name: ListPendingTransferViews :many
-- pendingSlotTransferViews: the transfers a Queue Master can decide (a claimed or RTR ID one, sender still live), oldest first.
SELECT t.id, t.sender_session_player_id, t.requested_at, (t.link_token_digest IS NOT NULL)::bool AS via_link,
       se.name_snapshot AS sender_name, scp.nickname AS sender_nickname,
       rp.id AS recipient_id, rp.full_name AS recipient_name, a.rtr_id AS recipient_rtr_id
FROM session_slot_transfers t
JOIN session_players se ON se.id = t.sender_session_player_id AND se.released_at IS NULL AND se.no_show_at IS NULL
JOIN club_players scp ON scp.id = se.club_player_id
JOIN players rp ON rp.id = t.recipient_player_id
LEFT JOIN player_id_allocations a ON a.player_id = rp.id
WHERE t.session_id = @session_id AND t.status = 'pending' AND t.recipient_player_id IS NOT NULL
ORDER BY t.requested_at ASC, t.id ASC;

-- name: ListClubPlayerIDsOfPlayer :many
-- waitlistPlaceOf: every saved player of this account in the club (removed ones too).
SELECT id FROM club_players WHERE club_id = @club_id AND player_id = @player_id;

-- name: GetSavedPlayerLatestLevel :one
-- pendingSlotTransferViews: the latest assessed level of a recipient's saved player in this club (not removed).
SELECT a.skill_level_id
FROM club_players cp
JOIN club_assessments a ON a.club_player_id = cp.id
WHERE cp.club_id = @club_id AND cp.player_id = @player_id AND cp.removed_at IS NULL
ORDER BY a.assessed_at DESC
LIMIT 1;
