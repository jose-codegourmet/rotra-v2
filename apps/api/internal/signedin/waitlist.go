package signedin

import (
	"sort"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// orderedWaitlist is orderedWaitlist in session-store.ts: demoted entries first (latest demotion batch at the front,
// each batch in its original slot order), then everyone else by arrival, the id last. Every time compares at the
// millisecond the TypeScript's Date has, and a missing slot time counts as 0. (internal/publicreads has the same
// rule over its own row type.)
func orderedWaitlist(rows []sqlcgen.ListSessionWaitlistRowsRow) []sqlcgen.ListSessionWaitlistRowsRow {
	ms := func(t pgtype.Timestamptz) int64 {
		if !t.Valid {
			return 0
		}
		return t.Time.UnixMilli()
	}
	out := append([]sqlcgen.ListSessionWaitlistRowsRow(nil), rows...)
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.DemotedAt.Valid && b.DemotedAt.Valid {
			if d := ms(b.DemotedAt) - ms(a.DemotedAt); d != 0 {
				return d < 0
			}
			if d := ms(a.DemotedConfirmedAt) - ms(b.DemotedConfirmedAt); d != 0 {
				return d < 0
			}
		} else if a.DemotedAt.Valid || b.DemotedAt.Valid {
			return a.DemotedAt.Valid
		}
		if d := ms(a.AddedAt) - ms(b.AddedAt); d != 0 {
			return d < 0
		}
		return a.ID.String() < b.ID.String()
	})
	return out
}
