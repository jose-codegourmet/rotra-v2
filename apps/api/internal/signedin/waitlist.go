package signedin

import (
	"sort"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// orderedWaitlist is orderedWaitlist in session-store.ts: strictly by the time each entry joined the waitlist (the demotion time
// for a player moved off the roster, otherwise the arrival), a demotion batch in its original slot order, the id last
// (D-2026-11-23-06). Every time compares at the millisecond the TypeScript's Date has, and a missing slot time counts as 0.
func orderedWaitlist(rows []sqlcgen.ListSessionWaitlistRowsRow) []sqlcgen.ListSessionWaitlistRowsRow {
	ms := func(t pgtype.Timestamptz) int64 {
		if !t.Valid {
			return 0
		}
		return t.Time.UnixMilli()
	}
	joined := func(r sqlcgen.ListSessionWaitlistRowsRow) int64 {
		if r.DemotedAt.Valid {
			return ms(r.DemotedAt)
		}
		return ms(r.AddedAt)
	}
	out := append([]sqlcgen.ListSessionWaitlistRowsRow(nil), rows...)
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if d := joined(a) - joined(b); d != 0 {
			return d < 0
		}
		if d := ms(a.DemotedConfirmedAt) - ms(b.DemotedConfirmedAt); d != 0 {
			return d < 0
		}
		return a.ID.String() < b.ID.String()
	})
	return out
}
