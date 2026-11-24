package liveupdates

import (
	"strconv"
	"strings"
)

// Position is where an event sits in transaction order (B-48): its writing transaction's id, then its own id. It is the
// publisher's cursor and, as "<xact_id>:<id>", the SSE event id and the phone's Last-Event-ID.
type Position struct {
	Xact uint64
	ID   int64
}

// String is the wire form "<xact_id>:<id>".
func (p Position) String() string {
	return strconv.FormatUint(p.Xact, 10) + ":" + strconv.FormatInt(p.ID, 10)
}

// After reports whether p comes after q in transaction order.
func (p Position) After(q Position) bool {
	if p.Xact != q.Xact {
		return p.Xact > q.Xact
	}
	return p.ID > q.ID
}

// ParsePosition reads the wire form. A malformed or negative value is not a position.
func ParsePosition(s string) (Position, bool) {
	x, id, ok := strings.Cut(strings.TrimSpace(s), ":")
	if !ok {
		return Position{}, false
	}
	xact, err := strconv.ParseUint(x, 10, 64)
	if err != nil {
		return Position{}, false
	}
	n, err := strconv.ParseInt(id, 10, 64)
	if err != nil || n < 0 {
		return Position{}, false
	}
	return Position{Xact: xact, ID: n}, true
}
