package liveupdates

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

// Channel is the Postgres NOTIFY channel. The payload is always empty: a nudge to read now (B-26).
const Channel = "live_updates"

// DB is what Append needs. A pgx.Tx satisfies it (so does a pool, but a write always appends inside its own transaction).
type DB interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Event is one change to tell open screens about. It holds no names, scores or results.
type Event struct {
	// ClubID is whose change it is: it picks the club topic and is the authorization filter.
	ClubID pgtype.UUID
	// SessionID is the Queue Session it belongs to; invalid (NULL) for a club-wide change.
	SessionID pgtype.UUID
	// PlayerIDs are the registered players (players.id, never a club player id) whose own results changed: a match finished
	// or made invalid, a session finalized (B-50). Empty for most writes.
	PlayerIDs []pgtype.UUID
	// Kind is what changed (see Kinds). Plain text: a new kind needs no migration (B-45).
	Kind string
}

const (
	lockSessionSQL = `SELECT 1 FROM queue_sessions WHERE id = $1 FOR UPDATE`
	insertSQL      = `INSERT INTO live_update_events (club_id, session_id, player_ids, kind) VALUES ($1, $2, $3, $4) RETURNING id`
	setLatestSQL   = `UPDATE queue_sessions SET latest_event_id = $2 WHERE id = $1`
	notifySQL      = `SELECT pg_notify('` + Channel + `', '')`
)

// Append adds one event inside the write's transaction and returns its id, which is the session's new snapshot version
// (B-25). With a session it first locks the session row (FOR UPDATE), inserts the event, stores the id as the session's
// latest_event_id, and sends NOTIFY (delivered when the transaction commits). Holding the row lock from the insert to the
// commit is what makes two writes to one session get ids in commit order, while writes to different sessions never wait
// on each other (B-49). The writing transaction's id is filled in by the database default (B-48), never here.
func Append(ctx context.Context, db DB, ev Event) (int64, error) {
	if ev.Kind == "" {
		return 0, errors.New("liveupdates: an event needs a kind")
	}
	if !ev.ClubID.Valid {
		return 0, errors.New("liveupdates: an event needs a club")
	}
	if ev.SessionID.Valid {
		if _, err := db.Exec(ctx, lockSessionSQL, ev.SessionID); err != nil {
			return 0, fmt.Errorf("locking the session for its event: %w", err)
		}
	}
	players := ev.PlayerIDs
	if players == nil {
		players = []pgtype.UUID{} // the column is NOT NULL, and a nil slice would be sent as NULL
	}
	var id int64
	if err := db.QueryRow(ctx, insertSQL, ev.ClubID, ev.SessionID, players, ev.Kind).Scan(&id); err != nil {
		return 0, fmt.Errorf("adding a live update event: %w", err)
	}
	if ev.SessionID.Valid {
		if _, err := db.Exec(ctx, setLatestSQL, ev.SessionID, id); err != nil {
			return 0, fmt.Errorf("storing the session's latest event: %w", err)
		}
	}
	if _, err := db.Exec(ctx, notifySQL); err != nil {
		return 0, fmt.Errorf("sending the live update nudge: %w", err)
	}
	return id, nil
}

// ---- what a running write noted

type scopeKey struct{}

// scope collects what one request's writes changed, so each transaction adds its events just before it commits
// (writes.InTx calls Flush). A command notes through the context it was given; code that runs outside a routed request
// has no scope and notes nothing.
type scope struct {
	kind    string
	mu      sync.Mutex
	pending []Event
	added   int
	flushes int // transactions that reached their commit
}

func (sc *scope) transactions() int {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	return sc.flushes
}

func (sc *scope) appended() int {
	sc.mu.Lock()
	defer sc.mu.Unlock()
	return sc.added
}

// WithScope returns ctx carrying a scope whose events default to kind (the route's kind from Routes).
func WithScope(ctx context.Context, kind string) context.Context {
	return context.WithValue(ctx, scopeKey{}, &scope{kind: kind})
}

// EnsureScope returns ctx with a scope of kind unless it already has one (work that runs outside a routed write, such as
// the projection jobs a GET drives).
func EnsureScope(ctx context.Context, kind string) context.Context {
	if scopeOf(ctx) != nil {
		return ctx
	}
	return WithScope(ctx, kind)
}

func scopeOf(ctx context.Context) *scope {
	sc, _ := ctx.Value(scopeKey{}).(*scope)
	return sc
}

// Note records that the running write changed club (and session, when valid) and, for a result that is a registered
// player's own, players. It is added to the transaction when the write commits. Noting the same club and session twice
// keeps one event with the players of both. With no scope in ctx it does nothing.
func Note(ctx context.Context, club, session pgtype.UUID, players ...pgtype.UUID) {
	NoteKind(ctx, "", club, session, players...)
}

// NoteKind is Note with a kind of its own instead of the route's.
func NoteKind(ctx context.Context, kind string, club, session pgtype.UUID, players ...pgtype.UUID) {
	sc := scopeOf(ctx)
	if sc == nil || !club.Valid {
		return
	}
	if kind == "" {
		kind = sc.kind
	}
	if kind == "" {
		return
	}
	sc.mu.Lock()
	defer sc.mu.Unlock()
	for i := range sc.pending {
		p := &sc.pending[i]
		if p.ClubID == club && p.SessionID == session {
			for _, pl := range players {
				if pl.Valid && !containsUUID(p.PlayerIDs, pl) {
					p.PlayerIDs = append(p.PlayerIDs, pl)
				}
			}
			return
		}
	}
	ev := Event{ClubID: club, SessionID: session, Kind: kind}
	for _, pl := range players {
		if pl.Valid && !containsUUID(ev.PlayerIDs, pl) {
			ev.PlayerIDs = append(ev.PlayerIDs, pl)
		}
	}
	sc.pending = append(sc.pending, ev)
}

func containsUUID(list []pgtype.UUID, id pgtype.UUID) bool {
	for _, x := range list {
		if x == id {
			return true
		}
	}
	return false
}

// Flush adds every noted event in db (the write's transaction) and forgets them. Sessions are locked in id order, so two
// writes that touch the same sessions cannot deadlock on the events.
func Flush(ctx context.Context, db DB) error {
	sc := scopeOf(ctx)
	if sc == nil {
		return nil
	}
	sc.mu.Lock()
	pending := sc.pending
	sc.pending = nil
	sc.flushes++
	sc.mu.Unlock()
	sort.SliceStable(pending, func(i, j int) bool {
		a, b := pending[i].SessionID, pending[j].SessionID
		if a.Valid != b.Valid {
			return !a.Valid
		}
		return string(a.Bytes[:]) < string(b.Bytes[:])
	})
	for _, ev := range pending {
		if _, err := Append(ctx, db, ev); err != nil {
			return err
		}
		sc.mu.Lock()
		sc.added++
		sc.mu.Unlock()
	}
	return nil
}

// Discard forgets what was noted: the transaction rolled back, so no event is written (event written iff the write commits).
func Discard(ctx context.Context) {
	if sc := scopeOf(ctx); sc != nil {
		sc.mu.Lock()
		sc.pending = nil
		sc.mu.Unlock()
	}
}

// Pending reports how many events the scope waits to add (tests).
func Pending(ctx context.Context) int {
	sc := scopeOf(ctx)
	if sc == nil {
		return 0
	}
	sc.mu.Lock()
	defer sc.mu.Unlock()
	return len(sc.pending)
}
