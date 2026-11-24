package liveupdates

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// readBatch is how many rows one read takes (the design's LIMIT 1000).
const readBatch = 1000

// The B-48 read: events after the cursor in transaction order, and only those whose writing transaction is below the
// oldest transaction still running (pg_snapshot_xmin). Every transaction below that limit has finished and every later one
// gets a higher transaction id, so nothing can appear behind the cursor.
const readSQL = `
SELECT xact_id::text, id, club_id, session_id, player_ids, kind, created_at
FROM live_update_events
WHERE (xact_id, id) > ($1::text::xid8, $2::bigint)
  AND xact_id < pg_snapshot_xmin(pg_current_snapshot())
ORDER BY xact_id, id
LIMIT $3`

// headSQL is the newest event the guard lets through: where a fresh publisher starts.
const headSQL = `
SELECT xact_id::text, id FROM live_update_events
WHERE xact_id < pg_snapshot_xmin(pg_current_snapshot())
ORDER BY xact_id DESC, id DESC LIMIT 1`

// lagSQL is the age of the oldest event not published yet (guard or not), and whether there is one: the publisher lag the
// dashboard shows, and the sign that a read must come again soon.
const lagSQL = `
SELECT COALESCE(EXTRACT(EPOCH FROM (clock_timestamp() - min(created_at))), 0)::float8, count(*) > 0
FROM live_update_events
WHERE (xact_id, id) > ($1::text::xid8, $2::bigint)`

// Metrics is what the publisher and the stream report. Nil values mean nothing is recorded.
type Metrics interface {
	// PublisherLag is the age of the oldest event not pushed yet (0 when caught up).
	PublisherLag(d time.Duration)
	// EventsPublished counts events pushed to the hub.
	EventsPublished(n int)
	// ListenerUp says whether the LISTEN connection is connected.
	ListenerUp(up bool)
}

// Listen opens the direct (unpooled) connection LISTEN needs: PgBouncer does not support LISTEN/NOTIFY (B-26).
type Listen func(ctx context.Context) (*pgx.Conn, error)

// Observer sees every event after it was published. The snapshot cache uses it to know a newer version exists (B-25).
type Observer interface {
	Observe(sessionID uuid.UUID, version int64)
}

// PublisherOptions tunes a Publisher. Zero values take the defaults.
type PublisherOptions struct {
	// Poll re-reads this often even with no nudge, so a row held back by the guard is still pushed once its writer
	// finishes and a missed nudge loses nothing. Default 1 s.
	Poll time.Duration
	// Recheck is how soon the publisher looks again while events wait behind a transaction that is still running; it backs off to
	// Poll. Default 25 ms.
	Recheck time.Duration
	// ReconnectMin and ReconnectMax bound the listener's reconnect backoff. Defaults 500 ms and 10 s.
	ReconnectMin, ReconnectMax time.Duration
	Metrics                    Metrics
	Observer                   Observer
	Log                        *slog.Logger
}

// Publisher reads new events in transaction order (B-48) and pushes them to the hub. Its cursor is in memory: on start it
// is the newest event there is, and after a listener reconnect it simply reads again from the cursor, so a missed nudge
// loses nothing. There is no delivery-status or retry table (B-26).
type Publisher struct {
	pool   *pgxpool.Pool
	listen Listen
	hub    *Hub
	opts   PublisherOptions

	readMu sync.Mutex // one read at a time; held across the database query
	mu     sync.Mutex // guards the cursor and serialises each publish with SubscribeAt; never held across a query
	cursor Position
	ready  chan struct{}
	nudge  chan struct{}
}

// NewPublisher builds a publisher on pool (all reads) and listen (the one direct connection).
func NewPublisher(pool *pgxpool.Pool, listen Listen, hub *Hub, o PublisherOptions) *Publisher {
	if o.Poll <= 0 {
		o.Poll = time.Second
	}
	if o.Recheck <= 0 {
		o.Recheck = 25 * time.Millisecond
	}
	if o.ReconnectMin <= 0 {
		o.ReconnectMin = 500 * time.Millisecond
	}
	if o.ReconnectMax <= 0 {
		o.ReconnectMax = 10 * time.Second
	}
	if o.Log == nil {
		o.Log = slog.New(slog.DiscardHandler)
	}
	return &Publisher{pool: pool, listen: listen, hub: hub, opts: o, ready: make(chan struct{}), nudge: make(chan struct{}, 1)}
}

// Ready is closed once the publisher has found where to start. Subscribe waits for it.
func (p *Publisher) Ready() <-chan struct{} { return p.ready }

// Cursor is the position of the last event pushed.
func (p *Publisher) Cursor() Position {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.cursor
}

// Run publishes until ctx ends. It keeps trying when the database or the listener is down.
func (p *Publisher) Run(ctx context.Context) {
	for ctx.Err() == nil {
		if err := p.start(ctx); err != nil {
			p.opts.Log.Warn("live updates publisher cannot start", slog.String("error", err.Error()))
			if !sleep(ctx, p.opts.ReconnectMin) {
				return
			}
			continue
		}
		break
	}
	if ctx.Err() != nil {
		return
	}
	go p.listenLoop(ctx)

	tick := time.NewTicker(p.opts.Poll)
	defer tick.Stop()
	// While events wait behind a transaction that is still running, nothing nudges the publisher when that transaction ends
	// without an event of its own (a refresh, a write that needs none). So it looks again soon, backing off to the poll.
	soon := p.opts.Recheck
	for {
		waiting, err := p.read(ctx)
		if err != nil && ctx.Err() == nil {
			p.opts.Log.Warn("live updates read failed", slog.String("error", err.Error()))
		}
		var again <-chan time.Time
		var timer *time.Timer
		if waiting {
			timer = time.NewTimer(soon)
			again = timer.C
			soon = min(soon*2, max(p.opts.Poll, p.opts.Recheck))
		} else {
			soon = p.opts.Recheck
		}
		select {
		case <-ctx.Done():
			return
		case <-p.nudge:
		case <-tick.C:
		case <-again:
		}
		if timer != nil {
			timer.Stop()
		}
	}
}

// start finds the newest event the guard lets through: events from before the start reach reconnecting phones through
// their Last-Event-ID, not through the hub.
func (p *Publisher) start(ctx context.Context) error {
	var xact string
	var id int64
	err := p.pool.QueryRow(ctx, headSQL).Scan(&xact, &id)
	cur := Position{}
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return fmt.Errorf("finding where to start: %w", err)
	default:
		x, perr := strconv.ParseUint(xact, 10, 64)
		if perr != nil {
			return fmt.Errorf("reading the start position: %w", perr)
		}
		cur = Position{Xact: x, ID: id}
	}
	p.mu.Lock()
	p.cursor = cur
	p.mu.Unlock()
	close(p.ready)
	return nil
}

// ReadNow reads and pushes everything after the cursor that the guard allows. Run calls it on each nudge and tick; tests
// call it directly.
func (p *Publisher) ReadNow(ctx context.Context) error {
	_, err := p.read(ctx)
	return err
}

// read is ReadNow that also says whether events still wait behind the guard (rows past the cursor that were not allowed through).
func (p *Publisher) read(ctx context.Context) (waiting bool, err error) {
	for {
		n, err := p.readBatch(ctx)
		if err != nil {
			return false, err
		}
		if n < readBatch {
			break
		}
	}
	return p.recordLag(ctx), nil
}

func (p *Publisher) readBatch(ctx context.Context) (int, error) {
	// One reader at a time. The database is read with no lock held, so a slow query never stops a screen from subscribing.
	p.readMu.Lock()
	defer p.readMu.Unlock()
	cur := p.Cursor()
	rows, err := p.pool.Query(ctx, readSQL, strconv.FormatUint(cur.Xact, 10), cur.ID, readBatch)
	if err != nil {
		return 0, fmt.Errorf("reading events: %w", err)
	}
	events, err := scanEvents(rows)
	if err != nil {
		return 0, err
	}
	for _, ev := range events {
		// The cache learns the version before a screen is told of it, so the re-read that follows can never be served the
		// copy it was told is old.
		if p.opts.Observer != nil && ev.HasSession {
			p.opts.Observer.Observe(ev.SessionID, ev.ID)
		}
		p.mu.Lock()
		p.cursor = ev.Pos
		p.hub.Publish(ev)
		p.mu.Unlock()
	}
	if len(events) > 0 && p.opts.Metrics != nil {
		p.opts.Metrics.EventsPublished(len(events))
	}
	return len(events), nil
}

// recordLag reports the publisher lag and says whether events still wait.
func (p *Publisher) recordLag(ctx context.Context) (waiting bool) {
	cur := p.Cursor()
	var secs float64
	if err := p.pool.QueryRow(ctx, lagSQL, strconv.FormatUint(cur.Xact, 10), cur.ID).Scan(&secs, &waiting); err != nil {
		return false
	}
	if p.opts.Metrics != nil {
		p.opts.Metrics.PublisherLag(time.Duration(secs * float64(time.Second)))
	}
	return waiting
}

func scanEvents(rows pgx.Rows) ([]Published, error) {
	defer rows.Close()
	var out []Published
	for rows.Next() {
		var (
			xact    string
			id      int64
			club    pgtype.UUID
			session pgtype.UUID
			players []pgtype.UUID
			kind    string
			created time.Time
		)
		if err := rows.Scan(&xact, &id, &club, &session, &players, &kind, &created); err != nil {
			return nil, fmt.Errorf("reading an event: %w", err)
		}
		x, err := strconv.ParseUint(xact, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("reading an event's transaction id: %w", err)
		}
		ev := Published{Pos: Position{Xact: x, ID: id}, ID: id, ClubID: uuid.UUID(club.Bytes), Kind: kind, CreatedAt: created}
		if session.Valid {
			ev.SessionID, ev.HasSession = uuid.UUID(session.Bytes), true
		}
		for _, pl := range players {
			if pl.Valid {
				ev.PlayerIDs = append(ev.PlayerIDs, uuid.UUID(pl.Bytes))
			}
		}
		out = append(out, ev)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("reading events: %w", err)
	}
	return out, nil
}

// SubscribeAt registers a subscription with the hub at the exact cursor position and returns that position. Events
// published afterwards are all after it, so a catch-up that reads up to it and the live feed together miss nothing and
// repeat nothing.
func (p *Publisher) SubscribeAt(targets []Target) (*Subscription, Position) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.hub.Subscribe(targets, nil), p.cursor
}

// Nudge asks the publisher to read now. It never blocks.
func (p *Publisher) Nudge() {
	select {
	case p.nudge <- struct{}{}:
	default:
	}
}

// listenLoop holds the one direct connection, nudges on every NOTIFY, and reconnects with backoff. After each
// reconnect it nudges once, so rows committed while it was away are read at once.
func (p *Publisher) listenLoop(ctx context.Context) {
	backoff := p.opts.ReconnectMin
	for ctx.Err() == nil {
		conn, err := p.listen(ctx)
		if err == nil {
			_, err = conn.Exec(ctx, "LISTEN "+Channel)
		}
		if err != nil {
			if conn != nil {
				_ = conn.Close(context.WithoutCancel(ctx))
			}
			p.setListener(false)
			if ctx.Err() != nil {
				return
			}
			p.opts.Log.Warn("live updates listener cannot connect", slog.String("error", err.Error()))
			if !sleep(ctx, backoff) {
				return
			}
			backoff = min(backoff*2, p.opts.ReconnectMax)
			continue
		}
		backoff = p.opts.ReconnectMin
		p.setListener(true)
		p.Nudge()
		for {
			if _, err := conn.WaitForNotification(ctx); err != nil {
				break
			}
			p.Nudge()
		}
		p.setListener(false)
		_ = conn.Close(context.WithoutCancel(ctx))
		if ctx.Err() == nil {
			p.opts.Log.Warn("live updates listener lost; reconnecting")
		}
	}
}

func (p *Publisher) setListener(up bool) {
	if p.opts.Metrics != nil {
		p.opts.Metrics.ListenerUp(up)
	}
}

func sleep(ctx context.Context, d time.Duration) bool {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-t.C:
		return true
	}
}
