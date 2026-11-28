-- Slot transfer (task 5.5): Approve (Queue) and the seven Player routes under public-sessions/{slug}/slot-transfer. Ports of
-- packages/db/src/queue/slot-transfers.ts. The shared pieces (LockSlotTransfer, RejectSlotTransfer, the ledger) are in slot_money.sql.

-- name: LockSlotTransferFull :one
-- lockTransfer for the Player routes: the whole transfer row of the session, FOR UPDATE (the link state needs the sender and the recipient).
SELECT id, sender_session_player_id, sender_player_id, recipient_player_id, status, (link_token_digest IS NOT NULL)::bool AS has_link
FROM session_slot_transfers
WHERE id = @id AND session_id = @session_id
FOR UPDATE;

-- name: GetTransferLiveEntry :one
-- liveEntryOf: the Player's live roster entry (not released, not a no show) in the session.
SELECT sp.id, sp.club_player_id, sp.name_snapshot, sp.confirmed_at
FROM session_players sp
JOIN club_players cp ON cp.club_id = sp.club_id AND cp.id = sp.club_player_id
WHERE sp.session_id = @session_id AND sp.released_at IS NULL AND sp.no_show_at IS NULL AND cp.player_id = @player_id
ORDER BY sp.id LIMIT 1;

-- name: GetTransferRecipientByRtrID :one
-- recipientFor: the player behind an exact RTR ID (the allocation and its player).
SELECT a.rtr_id, p.id, p.full_name, p.nickname, p.avatar_ref, p.profile_state, p.hidden_from_directory
FROM player_id_allocations a
JOIN players p ON p.id = a.player_id
WHERE a.rtr_id = @rtr_id;

-- name: ListPlayerClubPlayerIDs :many
-- waitlistPlaceOf: every saved player row of the Player in the club (removed ones too).
SELECT id FROM club_players WHERE club_id = @club_id AND player_id = @player_id;

-- name: GetSavedSlotTransfer :one
-- requestSlotTransfer's replay check: the transfer by its id (any session), with the recipient's name (null for a link nobody claimed).
SELECT t.sender_player_id, rp.full_name AS recipient_name
FROM session_slot_transfers t
LEFT JOIN players rp ON rp.id = t.recipient_player_id
WHERE t.id = @id;

-- name: GetPendingTransferOfEntry :one
SELECT id FROM session_slot_transfers WHERE sender_session_player_id = @sender_session_player_id AND status = 'pending' LIMIT 1;

-- name: InsertSlotTransfer :exec
-- A request by RTR ID (a recipient, no digest) or a transfer link (no recipient, the token's digest).
INSERT INTO session_slot_transfers (id, club_id, session_id, sender_session_player_id, sender_club_player_id, sender_player_id, recipient_player_id,
                                    link_token_digest, requested_at)
VALUES (@id, @club_id, @session_id, @sender_session_player_id, @sender_club_player_id, @sender_player_id, sqlc.narg('recipient_player_id'),
        sqlc.narg('link_token_digest'), @requested_at);

-- name: WithdrawSlotTransfer :exec
UPDATE session_slot_transfers SET status = 'withdrawn', decided_at = @now, withdrawn_by_player_id = @player_id WHERE id = @id;

-- name: GetTransferByLinkDigest :one
-- transferForToken: the transfer whose link carries this token's digest.
SELECT id, session_id FROM session_slot_transfers WHERE link_token_digest = @digest;

-- name: GetTransferLinkCard :one
-- readTransferLink: the transfer and its sender's name as the entry shows it.
SELECT t.status, t.sender_player_id, t.recipient_player_id, se.name_snapshot AS sender_name
FROM session_slot_transfers t
JOIN session_players se ON se.id = t.sender_session_player_id
WHERE t.id = @id;

-- name: ClaimSlotTransfer :execrows
-- claimTransferLink: one conditional UPDATE, so a second claimant updates nothing.
UPDATE session_slot_transfers SET recipient_player_id = @player_id, claimed_at = @now
WHERE id = @id AND status = 'pending' AND recipient_player_id IS NULL;

-- name: ApproveSlotTransfer :exec
-- approveSlotTransfer: the transfer row records the slot's money once (amount_due_minor is NULL with no fee set).
UPDATE session_slot_transfers
SET status = 'approved', decided_at = @now, recipient_club_player_id = @recipient_club_player_id,
    recipient_session_player_id = @recipient_session_player_id, recipient_was_waitlisted = @recipient_was_waitlisted,
    amount_due_minor = sqlc.narg('amount_due_minor'), amount_paid_minor = @amount_paid_minor, prior_waived_minor = @prior_waived_minor,
    waived_minor = @waived_minor, currency = 'PHP'
WHERE id = @id;

-- name: ReleaseSessionPlayerTransferred :exec
-- approveSlotTransfer: the sender's entry is released with the reason transferred (its paid mark and assessments stay on it).
UPDATE session_players SET released_at = @now, release_reason = 'transferred', revision = revision + 1, updated_at = @now WHERE id = @id;

-- name: SetSessionPlayerConfirmedAt :exec
-- approveSlotTransfer: the recipient takes the sender's place in slot order (no revision change, as the update has none).
UPDATE session_players SET confirmed_at = @confirmed_at, updated_at = @now WHERE id = @id;

-- name: ClosePlayerPendingJoinRequests :exec
-- approveSlotTransfer: the recipient's pending join request in the session closes.
UPDATE session_join_requests SET status = 'closed', decided_at = @now, updated_at = @now
WHERE session_id = @session_id AND player_id = @player_id AND status = 'pending';

-- name: GetMyPendingSlotTransfer :one
-- myPendingSlotTransfer: the Player's own pending transfer on a roster entry, with the recipient's name and RTR ID.
SELECT t.id, t.requested_at, (t.link_token_digest IS NOT NULL)::bool AS via_link, t.recipient_player_id,
       rp.full_name AS recipient_name, a.rtr_id AS recipient_rtr_id
FROM session_slot_transfers t
LEFT JOIN players rp ON rp.id = t.recipient_player_id
LEFT JOIN player_id_allocations a ON a.player_id = t.recipient_player_id
WHERE t.sender_session_player_id = @sender_session_player_id AND t.status = 'pending'
LIMIT 1;

-- name: GetSessionOfSlugWithState :one
-- readTransferLink: the session behind a public link (findUnique by publicSlug) and its state.
SELECT id, club_id, state FROM queue_sessions WHERE public_slug = @slug;
