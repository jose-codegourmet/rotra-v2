package liveupdates

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Topic names. A screen subscribes to the topics it may read (R2); the publisher puts each event on up to
// 2 + len(PlayerIDs) topics, and the "admin" topic gets every event.
const (
	AdminTopic = "admin"
	// Public is the label prefix a visitor or Player uses for a published Queue Session page, named by its slug.
	PublicPrefix = "public-session:"
)

// SessionTopic, ClubTopic and PlayerTopic are the internal topic names (also what a signed-in screen asks for).
func SessionTopic(id uuid.UUID) string { return "session:" + id.String() }
func ClubTopic(id uuid.UUID) string    { return "club:" + id.String() }
func PlayerTopic(id uuid.UUID) string  { return "player:" + id.String() }

// Published is one event as the publisher read it.
type Published struct {
	Pos        Position
	ID         int64 // the event id: the session's snapshot version when SessionID is set
	ClubID     uuid.UUID
	SessionID  uuid.UUID
	HasSession bool
	PlayerIDs  []uuid.UUID
	Kind       string
	CreatedAt  time.Time
}

// Topics are the internal topics the event belongs to.
func (e Published) Topics() []string {
	ts := make([]string, 0, 3+len(e.PlayerIDs))
	ts = append(ts, AdminTopic, ClubTopic(e.ClubID))
	if e.HasSession {
		ts = append(ts, SessionTopic(e.SessionID))
	}
	for _, p := range e.PlayerIDs {
		ts = append(ts, PlayerTopic(p))
	}
	return ts
}

// Target ties an internal topic to what the screen asked for.
type Target struct {
	// Topic is the internal topic (SessionTopic, ClubTopic, PlayerTopic or AdminTopic).
	Topic string
	// Label is the topic name the message carries: what the screen asked for ("public-session:<slug>" for a visitor's page).
	Label string
	// Masked hides the kind: a visitor's message says only that something changed (no private data to a masked visitor).
	Masked bool
}

// ChangedKind is the kind a masked viewer, or a "changed everywhere" catch-up, carries.
const ChangedKind = "changed"

// Message is one SSE event ready to write.
type Message struct {
	// ID is the SSE id: the stream position "<xact_id>:<id>" after this message. Empty for a message that moves nothing.
	ID    string
	Event string
	Data  []byte
}

// ChangedData is the JSON data of a "changed" event.
type ChangedData struct {
	Topic string `json:"topic"`
	// Version is the new snapshot version: the session's event id (or the newest id on a club or player topic). Null when it
	// is unknown, after a reconnect with an id older than the kept events: re-read everything.
	Version *int64 `json:"version"`
	Kind    string `json:"kind"`
}

// ChangedMessage builds a "changed" message.
func ChangedMessage(pos string, topic string, version *int64, kind string) Message {
	b, _ := json.Marshal(ChangedData{Topic: topic, Version: version, Kind: kind})
	return Message{ID: pos, Event: "changed", Data: b}
}

// Subscription is one open screen's feed.
type Subscription struct {
	hub     *Hub
	targets map[string][]Target
	ch      chan Message
	mu      sync.Mutex
	closed  bool
	dropped bool
}

// C is the feed. It is closed when the subscription ends: Close, or a screen too slow to keep up (Dropped).
func (s *Subscription) C() <-chan Message { return s.ch }

// Dropped reports whether the hub ended the subscription because the screen did not read fast enough. The screen
// reconnects with its last event id and gets one "changed" per topic that moved.
func (s *Subscription) Dropped() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.dropped
}

// Close ends the subscription. It is safe to call twice.
func (s *Subscription) Close() { s.hub.remove(s, false) }

// Hub is the in-memory fan-out (B-26): topics per session, club, player and admin. One API instance only; a broker comes
// only with a second instance.
type Hub struct {
	mu      sync.Mutex
	byTopic map[string]map[*Subscription]struct{}
	subs    map[*Subscription]struct{}
	buffer  int
}

// DefaultBuffer is how many messages a screen may fall behind before the hub drops it.
const DefaultBuffer = 256

// NewHub returns an empty hub. buffer <= 0 means DefaultBuffer.
func NewHub(buffer int) *Hub {
	if buffer <= 0 {
		buffer = DefaultBuffer
	}
	return &Hub{byTopic: map[string]map[*Subscription]struct{}{}, subs: map[*Subscription]struct{}{}, buffer: buffer}
}

// Subscribe registers a screen for targets. first are messages put in its feed before any live one (the catch-up).
func (h *Hub) Subscribe(targets []Target, first []Message) *Subscription {
	s := &Subscription{hub: h, targets: map[string][]Target{}, ch: make(chan Message, h.buffer+len(first))}
	for _, t := range targets {
		s.targets[t.Topic] = append(s.targets[t.Topic], t)
	}
	for _, m := range first {
		s.ch <- m
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.subs[s] = struct{}{}
	for topic := range s.targets {
		set := h.byTopic[topic]
		if set == nil {
			set = map[*Subscription]struct{}{}
			h.byTopic[topic] = set
		}
		set[s] = struct{}{}
	}
	return s
}

func (h *Hub) remove(s *Subscription, dropped bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.removeLocked(s, dropped)
}

func (h *Hub) removeLocked(s *Subscription, dropped bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return
	}
	s.closed, s.dropped = true, dropped
	delete(h.subs, s)
	for topic := range s.targets {
		if set := h.byTopic[topic]; set != nil {
			delete(set, s)
			if len(set) == 0 {
				delete(h.byTopic, topic)
			}
		}
	}
	close(s.ch)
}

// Publish hands one event to every subscription on its topics. It never blocks: a screen whose feed is full is dropped.
func (h *Hub) Publish(ev Published) {
	version := ev.ID
	pos := ev.Pos.String()
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, topic := range ev.Topics() {
		for s := range h.byTopic[topic] {
			for _, t := range s.targets[topic] {
				kind := ev.Kind
				if t.Masked {
					kind = ChangedKind
				}
				select {
				case s.ch <- ChangedMessage(pos, t.Label, &version, kind):
				default:
					h.removeLocked(s, true)
				}
				if s.closed {
					break
				}
			}
		}
	}
}

// Streams is the number of open subscriptions.
func (h *Hub) Streams() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs)
}

// CloseAll ends every subscription (shutdown).
func (h *Hub) CloseAll() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for s := range h.subs {
		h.removeLocked(s, false)
	}
}
