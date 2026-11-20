-- The Queue app's money writes (packages/db/src/queue/financials.ts): inventory, the cost estimate saved beside a session and the
-- payment marks. Money is integer centavos.

-- name: GetInventoryItem :one
-- findUnique by id, any club (the caller compares the club).
SELECT id, club_id, name, category, unit, stock, unit_cost_minor, currency, removed_at, created_at, updated_at, revision
FROM inventory_items WHERE id = @id;

-- name: GetClubInventoryItem :one
-- ownItem: this club's item by id; another club's id reads as missing.
SELECT id, club_id, name, category, unit, stock, unit_cost_minor, currency, removed_at, created_at, updated_at, revision
FROM inventory_items WHERE id = @id AND club_id = @club_id;

-- name: InsertInventoryItem :one
-- created_at is stamped by the application (Prisma's now() default is the client clock), as updated_at is.
INSERT INTO inventory_items (id, club_id, name, category, unit, stock, unit_cost_minor, created_at, updated_at)
VALUES (@id, @club_id, @name, @category, @unit, @stock, @unit_cost_minor, @now, @now)
RETURNING id, club_id, name, category, unit, stock, unit_cost_minor, currency, removed_at, created_at, updated_at, revision;

-- name: UpdateInventoryItem :one
UPDATE inventory_items
SET name = @name, category = @category, unit = @unit, stock = @stock, unit_cost_minor = @unit_cost_minor,
    revision = revision + 1, updated_at = @now
WHERE id = @id
RETURNING id, club_id, name, category, unit, stock, unit_cost_minor, currency, removed_at, created_at, updated_at, revision;

-- name: StepInventoryStock :execrows
-- stepInventoryStock: one atomic update, so two steps never lose one; it stamps updated_at with the database clock (raw SQL in the
-- TypeScript). It changes nothing for a removed item, another club's, or a step that would take the stock below zero.
UPDATE inventory_items
SET stock = stock + @delta::int4, revision = revision + 1, updated_at = now()
WHERE id = @id AND club_id = @club_id AND removed_at IS NULL AND stock + @delta::int4 >= 0;

-- name: RemoveInventoryItem :execrows
-- removeInventoryItem: a soft remove; an item already removed is left as it is.
UPDATE inventory_items
SET removed_at = @now, revision = revision + 1, updated_at = @now
WHERE id = @id AND club_id = @club_id AND removed_at IS NULL;

-- name: CountClubLiveInventoryItems :one
-- How many of these ids are items of the club that are not removed.
SELECT count(*)::int4 FROM inventory_items WHERE club_id = @club_id AND id = ANY (@ids::uuid[]) AND removed_at IS NULL;

-- name: DeleteSessionCostEstimate :exec
-- The plan lines go with it (on delete cascade).
DELETE FROM session_cost_estimates WHERE session_id = @session_id;

-- name: DeleteSessionShuttlePlanLines :exec
DELETE FROM session_shuttle_plan_lines WHERE session_id = @session_id;

-- name: InsertSessionCostEstimate :exec
-- A fee or payment mode that was not sent (set_* false) takes the column default: null, and break-even.
INSERT INTO session_cost_estimates (session_id, club_id, court_fee_per_court_hour_minor, entrance_fee_per_head_minor, payment_mode,
                                    custom_fee_per_head_minor, created_at, updated_at)
VALUES (@session_id, @club_id, sqlc.narg('court_fee'), sqlc.narg('entrance_fee'), COALESCE(sqlc.narg('payment_mode')::payment_mode, 'break_even'::payment_mode),
        sqlc.narg('custom_fee'), @now, @now);

-- name: UpdateSessionCostEstimate :exec
-- A field that was not sent (set_* false) stays as it is, as Prisma skips an undefined one.
UPDATE session_cost_estimates
SET court_fee_per_court_hour_minor = CASE WHEN @set_court_fee::bool THEN sqlc.narg('court_fee')::int4 ELSE court_fee_per_court_hour_minor END,
    entrance_fee_per_head_minor = CASE WHEN @set_entrance_fee::bool THEN sqlc.narg('entrance_fee')::int4 ELSE entrance_fee_per_head_minor END,
    payment_mode = COALESCE(sqlc.narg('payment_mode')::payment_mode, payment_mode),
    custom_fee_per_head_minor = sqlc.narg('custom_fee'),
    revision = revision + 1, updated_at = @now
WHERE session_id = @session_id;

-- name: InsertSessionShuttlePlanLine :exec
INSERT INTO session_shuttle_plan_lines (id, club_id, session_id, inventory_item_id, tubes, position)
VALUES (@id, @club_id, @session_id, @inventory_item_id, @tubes, @position);

-- name: ListMoneyLiveRoster :many
-- liveRoster: the entries not released and not marked No show, in slot order.
SELECT id, club_id, session_id, released_at, no_show_at
FROM session_players
WHERE session_id = @session_id AND released_at IS NULL AND no_show_at IS NULL
ORDER BY confirmed_at ASC, id ASC;

-- name: GetMoneySessionPlayer :one
-- The roster entry of a club player in a session (released ones too).
SELECT id, club_id, session_id, released_at, no_show_at
FROM session_players
WHERE session_id = @session_id AND club_player_id = @club_player_id;

-- name: GetPaymentMark :one
SELECT session_id, session_player_id, club_id, amount_minor, currency, marked_at, source_operation_id, actor_club_id, device_id
FROM session_payment_marks
WHERE session_id = @session_id AND session_player_id = @session_player_id;

-- name: InsertPaymentMark :exec
-- device_id is null: the Route Handlers never send a device (the offline contract is not part of this write).
INSERT INTO session_payment_marks (session_id, session_player_id, club_id, amount_minor, marked_at, source_operation_id, actor_club_id)
VALUES (@session_id, @session_player_id, @club_id, @amount_minor, @marked_at, @source_operation_id, @club_id);

-- name: DeletePaymentMark :exec
DELETE FROM session_payment_marks WHERE session_id = @session_id AND session_player_id = @session_player_id;

-- name: ListQueueSeriesSessionIDs :many
-- The sessions of a repeating series in the order the sessions list has them (start, then id).
SELECT id FROM queue_sessions WHERE club_id = @club_id AND series_id = @series_id ORDER BY scheduled_start_at ASC, id ASC;
