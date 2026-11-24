package liveupdates

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// maxTopics is how many topics one ticket may ask for.
const maxTopics = 16

// maxCatchUpRows bounds a reconnect's catch-up: past it the phone is told everything changed, which costs it one re-read.
const maxCatchUpRows = 20000

// Viewer is who asks for a ticket: a signed-in account of one app, or a visitor.
type Viewer struct {
	Audience store.Audience
	// AccountID is the club, player or admin account id of the pass.
	AccountID uuid.UUID
	SignedIn  bool
}

// grant is what a ticket carries: the topics its viewer may watch.
type grant struct {
	targets []Target
}

// Service is the stream's brain (httpapi.StreamBackend): who may watch what (R2), and the feed with its catch-up.
type Service struct {
	pool *pgxpool.Pool
	auth *session.Authenticator // nil: everyone is a visitor
	pub  *Publisher
	log  *slog.Logger
	// CatchUpLimit overrides maxCatchUpRows (tests).
	CatchUpLimit int
	// WaitReady bounds how long Open waits for the publisher to find its start (default 5 s).
	WaitReady time.Duration
}

// NewService builds the stream backend. auth may be nil when sign-in is not configured: then every viewer is a visitor and
// only published session pages can be watched.
func NewService(pool *pgxpool.Pool, auth *session.Authenticator, pub *Publisher, log *slog.Logger) *Service {
	if log == nil {
		log = slog.New(slog.DiscardHandler)
	}
	return &Service{pool: pool, auth: auth, pub: pub, log: log, CatchUpLimit: maxCatchUpRows, WaitReady: 5 * time.Second}
}

var _ httpapi.StreamBackend = (*Service)(nil)

// Identify reads who asks for the ticket. The pass comes from the app's own cookie through its proxy, which also sets the
// proxy secret and the X-Rotra-App header: without the secret nothing says which app the pass is for, so the caller is a
// visitor. An expired pass is answered with the distinct 401 "expired" (the client refreshes once and asks again); a pass
// that is wrong or for another app is a visitor, as for every route a visitor may read.
func (s *Service) Identify(w http.ResponseWriter, r *http.Request) (any, bool, bool) {
	aud, ok := session.AudienceOf(r)
	if s.auth == nil || !ok || !httpapi.TrustedFrom(r.Context()) {
		return Viewer{}, false, true
	}
	token := session.TokenFromRequest(r, aud)
	if token == "" {
		return Viewer{}, false, true
	}
	mode := session.ModeRead
	if aud == store.AudienceAdmin {
		mode = session.ModeSessionRead // the Admin app checks the session row on reads too
	}
	p, err := s.auth.Authenticate(r.Context(), token, aud, mode)
	switch {
	case err == nil:
		return Viewer{Audience: aud, AccountID: p.AccountID, SignedIn: true}, true, true
	case errors.Is(err, session.ErrExpired):
		session.WriteExpired(w)
		return nil, false, false
	case errors.Is(err, session.ErrUnauthenticated), errors.Is(err, session.ErrWrongAccount), errors.Is(err, session.ErrSessionRevoked):
		return Viewer{}, false, true
	default:
		s.log.ErrorContext(r.Context(), "identifying a stream ticket request failed", slog.Any("error", err))
		httpapi.WriteInternal(w)
		return nil, false, false
	}
}

// Grant decides which topics the viewer may watch (R2), reusing the rules the reads already apply:
//
//	club:<id>, session:<id>   the signed-in club that owns it (the Queue reads' club scope), or an admin
//	player:<id>               the player themselves (the Player app's own reads), or an admin
//	admin                     an admin (every event: the Admin reads see every club)
//	public-session:<slug>     anyone, for a published page (the public page read): a visitor's message names no kind
//
// A visitor, a Player and a club never get another club's or player's topic.
func (s *Service) Grant(r *http.Request, viewer any, topics []string) (any, []string, error) {
	v, _ := viewer.(Viewer)
	ctx := r.Context()
	var (
		targets  []Target
		accepted []string
		seen     = map[string]bool{}
		missing  bool
	)
	for _, topic := range topics {
		if len(seen) >= maxTopics {
			break
		}
		if topic == "" || seen[topic] {
			continue
		}
		seen[topic] = true
		t, err := s.allow(ctx, v, topic)
		if errors.Is(err, errNoPage) {
			missing = true
			continue
		}
		if err != nil {
			return nil, nil, err
		}
		if t != nil {
			targets = append(targets, *t)
			accepted = append(accepted, topic)
		}
	}
	if len(targets) == 0 {
		switch {
		case missing:
			return nil, nil, &httpapi.StreamError{Code: httpapi.ErrNotFound}
		case !v.SignedIn:
			return nil, nil, &httpapi.StreamError{Code: httpapi.ErrUnauthenticated}
		default:
			return nil, nil, &httpapi.StreamError{Code: httpapi.ErrForbidden}
		}
	}
	return &grant{targets: targets}, accepted, nil
}

var errNoPage = errors.New("no such published page")

// allow returns the target for topic when v may watch it, nil when not, errNoPage for a public page that does not exist.
func (s *Service) allow(ctx context.Context, v Viewer, topic string) (*Target, error) {
	name, arg, _ := strings.Cut(topic, ":")
	admin := v.SignedIn && v.Audience == store.AudienceAdmin
	switch name {
	case "admin":
		if arg == "" && admin && !strings.Contains(topic, ":") {
			return &Target{Topic: AdminTopic, Label: topic}, nil
		}
	case "club":
		id, err := uuid.Parse(arg)
		if err != nil {
			return nil, nil
		}
		if admin || (v.SignedIn && v.Audience == store.AudienceClub && v.AccountID == id) {
			return &Target{Topic: ClubTopic(id), Label: topic}, nil
		}
	case "player":
		id, err := uuid.Parse(arg)
		if err != nil {
			return nil, nil
		}
		if admin || (v.SignedIn && v.Audience == store.AudiencePlayer && v.AccountID == id) {
			return &Target{Topic: PlayerTopic(id), Label: topic}, nil
		}
	case "session":
		id, err := uuid.Parse(arg)
		if err != nil {
			return nil, nil
		}
		switch {
		case admin:
			return &Target{Topic: SessionTopic(id), Label: topic}, nil
		case v.SignedIn && v.Audience == store.AudienceClub:
			var one int
			err := s.pool.QueryRow(ctx, `SELECT 1 FROM queue_sessions WHERE id = $1 AND club_id = $2`, id, v.AccountID).Scan(&one)
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, nil
			}
			if err != nil {
				return nil, fmt.Errorf("checking the session's club: %w", err)
			}
			return &Target{Topic: SessionTopic(id), Label: topic}, nil
		}
	case "public-session":
		if !validSlug(arg) {
			return nil, errNoPage
		}
		var sid uuid.UUID
		err := s.pool.QueryRow(ctx, `
			SELECT s.id FROM queue_sessions s LEFT JOIN session_publications sp ON sp.session_id = s.id
			WHERE s.public_slug = $1 AND COALESCE(sp.state = 'deleted', false) = false`, arg).Scan(&sid)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errNoPage
		}
		if err != nil {
			return nil, fmt.Errorf("finding the published page: %w", err)
		}
		return &Target{Topic: SessionTopic(sid), Label: topic, Masked: true}, nil
	}
	return nil, nil
}

// validSlug is what a public slug can be (queue_sessions_public_slug_check): 4 to 64 of a-z, 0-9 and a hyphen.
func validSlug(s string) bool {
	if len(s) < 4 || len(s) > 64 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c < 'a' || c > 'z') && (c < '0' || c > '9') && c != '-' {
			return false
		}
	}
	return true
}

// Open subscribes the screen and builds its feed, in this order: when the phone sends the last id it saw, one "changed, now at
// #M" per topic that moved since, with no id (or "changed" on every topic when that id is older than the kept events, B-34);
// then "ready", which carries the position the screen is live from; then the live events, each with its id.
func (s *Service) Open(r *http.Request, g any, lastEventID string) (httpapi.StreamFeed, error) {
	gr, ok := g.(*grant)
	if !ok {
		return nil, errors.New("liveupdates: the ticket carries no grant")
	}
	ctx := r.Context()
	wait := s.WaitReady
	if wait <= 0 {
		wait = 5 * time.Second
	}
	select {
	case <-s.pub.Ready():
	case <-time.After(wait):
		return nil, errors.New("liveupdates: the publisher is not ready")
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	sub, cur := s.pub.SubscribeAt(gr.targets)

	// The catch-up goes first and carries no id: a stream cut half way through it must come back with the id it had, not with
	// one that claims the rest was seen. Only "ready", the last of them, moves the phone's position to where it is live from.
	var first []Message
	if lastEventID != "" {
		catch, err := s.catchUp(ctx, gr.targets, lastEventID, cur)
		if err != nil {
			sub.Close()
			return nil, err
		}
		first = append(first, catch...)
	}
	if cur != (Position{}) {
		data, _ := json.Marshal(map[string]string{"position": cur.String()})
		first = append(first, Message{ID: cur.String(), Event: "ready", Data: data})
	} else {
		// With nothing in the table yet there is no position to offer.
		first = append(first, Message{Event: "ready", Data: []byte(`{"position":null}`)})
	}
	return newFeed(sub, first), nil
}

// catchUp is what a reconnect with Last-Event-ID is told.
func (s *Service) catchUp(ctx context.Context, targets []Target, lastEventID string, cur Position) ([]Message, error) {
	everything := func() []Message {
		out := make([]Message, 0, len(targets))
		for _, t := range targets {
			out = append(out, ChangedMessage("", t.Label, nil, ChangedKind))
		}
		return out
	}
	last, ok := ParsePosition(lastEventID)
	if !ok || last.After(cur) {
		return everything(), nil
	}
	if last == cur {
		return nil, nil
	}
	// The newest event the phone saw must still be there or newer than the oldest one kept: otherwise events it missed may
	// have been deleted (B-34), and it re-reads everything.
	var oldestXact string
	var oldestID int64
	err := s.pool.QueryRow(ctx, `SELECT xact_id::text, id FROM live_update_events ORDER BY xact_id, id LIMIT 1`).Scan(&oldestXact, &oldestID)
	if errors.Is(err, pgx.ErrNoRows) {
		return everything(), nil
	}
	if err != nil {
		return nil, fmt.Errorf("finding the oldest kept event: %w", err)
	}
	ox, err := strconv.ParseUint(oldestXact, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("reading the oldest kept event: %w", err)
	}
	if (Position{Xact: ox, ID: oldestID}).After(last) {
		return everything(), nil
	}

	var admin bool
	var clubs, sessions, players []uuid.UUID
	for _, t := range targets {
		switch kind, arg, _ := strings.Cut(t.Topic, ":"); kind {
		case "admin":
			admin = true
		case "club":
			clubs = append(clubs, uuid.MustParse(arg))
		case "session":
			sessions = append(sessions, uuid.MustParse(arg))
		case "player":
			players = append(players, uuid.MustParse(arg))
		}
	}
	limit := s.CatchUpLimit
	if limit <= 0 {
		limit = maxCatchUpRows
	}
	rows, err := s.pool.Query(ctx, `
		SELECT xact_id::text, id, club_id, session_id, player_ids, kind, created_at
		FROM live_update_events
		WHERE (xact_id, id) > ($1::text::xid8, $2::bigint) AND (xact_id, id) <= ($3::text::xid8, $4::bigint)
		  AND ($5::bool OR club_id = ANY($6::uuid[]) OR session_id = ANY($7::uuid[]) OR player_ids && $8::uuid[])
		ORDER BY xact_id, id LIMIT $9`,
		strconv.FormatUint(last.Xact, 10), last.ID, strconv.FormatUint(cur.Xact, 10), cur.ID,
		admin, clubs, sessions, players, limit+1)
	if err != nil {
		return nil, fmt.Errorf("reading what the phone missed: %w", err)
	}
	events, err := scanEvents(rows)
	if err != nil {
		return nil, err
	}
	if len(events) > limit {
		return everything(), nil
	}
	type moved struct {
		version int64
		kind    string
	}
	byTopic := map[string]*moved{}
	for _, ev := range events {
		for _, topic := range ev.Topics() {
			m := byTopic[topic]
			if m == nil {
				byTopic[topic] = &moved{version: ev.ID, kind: ev.Kind}
				continue
			}
			m.version = max(m.version, ev.ID)
			if m.kind != ev.Kind {
				m.kind = ChangedKind // more than one thing moved: re-read the screen
			}
		}
	}
	var out []Message
	for _, t := range targets {
		m := byTopic[t.Topic]
		if m == nil {
			continue
		}
		version := m.version
		kind := m.kind
		if t.Masked {
			kind = ChangedKind
		}
		out = append(out, ChangedMessage("", t.Label, &version, kind))
	}
	return out, nil
}

// feed hands a subscription's messages to the stream, the catch-up first.
type feed struct {
	out  chan httpapi.StreamMessage
	stop chan struct{}
	sub  *Subscription
	once sync.Once
}

func newFeed(sub *Subscription, first []Message) *feed {
	f := &feed{out: make(chan httpapi.StreamMessage), stop: make(chan struct{}), sub: sub}
	go f.run(first)
	return f
}

func (f *feed) run(first []Message) {
	defer close(f.out)
	send := func(m Message) bool {
		select {
		case f.out <- httpapi.StreamMessage{ID: m.ID, Event: m.Event, Data: m.Data}:
			return true
		case <-f.stop:
			return false
		}
	}
	for _, m := range first {
		if !send(m) {
			return
		}
	}
	for {
		select {
		case m, open := <-f.sub.C():
			if !open {
				return
			}
			if !send(m) {
				return
			}
		case <-f.stop:
			return
		}
	}
}

func (f *feed) Messages() <-chan httpapi.StreamMessage { return f.out }

func (f *feed) Close() {
	f.once.Do(func() {
		close(f.stop)
		f.sub.Close()
	})
}
