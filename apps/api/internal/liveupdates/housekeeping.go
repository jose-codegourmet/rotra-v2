package liveupdates

import "github.com/jose-codegourmet/rotra-v2/apps/api/internal/housekeeping"

// Cleanup is the B-34 retention of the events: rows older than days are deleted in small batches, walking the primary key
// (rows arrive in roughly time order, so the oldest sit at its start). A session's latest_event_id is not touched, so its
// snapshot version never moves. A phone reconnecting with an id older than what is kept re-reads everything.
func Cleanup(days int) housekeeping.Cleanup {
	return housekeeping.OlderThanDays("live_update_events", "live_update_events", "id", "created_at", days)
}
