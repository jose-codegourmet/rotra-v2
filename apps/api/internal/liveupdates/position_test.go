package liveupdates

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestPositionParsesAndOrdersByTransactionThenId(t *testing.T) {
	for _, s := range []string{"", "x", "1", "1:", ":2", "a:2", "1:b", "-1:2", "1:-2", "1:2:3"} {
		if _, ok := ParsePosition(s); ok {
			t.Errorf("%q parsed", s)
		}
	}
	p, ok := ParsePosition(" 120:7 ")
	if !ok || p != (Position{Xact: 120, ID: 7}) || p.String() != "120:7" {
		t.Fatalf("%+v %v", p, ok)
	}
	// A later transaction comes after, whatever the ids: this is B-48.
	later, earlier := Position{Xact: 101, ID: 1}, Position{Xact: 100, ID: 2}
	if !later.After(earlier) || earlier.After(later) || later.After(later) {
		t.Fatal("ordering by transaction first")
	}
	if !(Position{Xact: 5, ID: 3}).After(Position{Xact: 5, ID: 2}) {
		t.Fatal("same transaction: by id")
	}
}

func TestHubDropsAScreenWhoseFeedIsFullAndNeverBlocks(t *testing.T) {
	h := NewHub(2)
	slow := h.Subscribe([]Target{{Topic: AdminTopic, Label: "admin"}}, nil)
	other := h.Subscribe([]Target{{Topic: "club:x", Label: "x"}}, nil)
	for i := 0; i < 5; i++ {
		h.Publish(Published{Pos: Position{Xact: 1, ID: int64(i + 1)}, ID: int64(i + 1), Kind: "queue"})
	}
	if !slow.Dropped() || h.Streams() != 1 {
		t.Fatalf("dropped %v streams %d", slow.Dropped(), h.Streams())
	}
	n := 0
	for range slow.C() { // closed after its two buffered messages
		n++
	}
	if n != 2 {
		t.Fatalf("%d buffered messages", n)
	}
	slow.Close() // safe after the drop
	other.Close()
	other.Close()
	if h.Streams() != 0 {
		t.Fatal("streams left")
	}
	h.Subscribe([]Target{{Topic: AdminTopic, Label: "a"}}, []Message{{Event: "ready"}})
	h.CloseAll()
	if h.Streams() != 0 {
		t.Fatal("CloseAll left streams")
	}
}

func TestAMaskedTargetNeverCarriesAKindAndTwoTargetsOnOneTopicEachGetTheirOwnMessage(t *testing.T) {
	h := NewHub(0)
	id := uuid.MustParse("00000000-0000-4000-8000-000000000001")
	topic := SessionTopic(id)
	s := h.Subscribe([]Target{{Topic: topic, Label: "public-session:slug", Masked: true}, {Topic: topic, Label: topic}}, nil)
	defer s.Close()
	h.Publish(Published{Pos: Position{Xact: 9, ID: 4}, ID: 4, ClubID: id, SessionID: id, HasSession: true, Kind: "payments"})
	got := map[string]ChangedData{}
	for i := 0; i < 2; i++ {
		m := <-s.C()
		if m.ID != "9:4" || m.Event != "changed" {
			t.Fatalf("%+v", m)
		}
		var d ChangedData
		if err := json.Unmarshal(m.Data, &d); err != nil {
			t.Fatal(err)
		}
		got[d.Topic] = d
	}
	if d := got["public-session:slug"]; d.Kind != ChangedKind || *d.Version != 4 {
		t.Fatalf("masked: %+v", d)
	}
	if d := got[topic]; d.Kind != "payments" || *d.Version != 4 {
		t.Fatalf("unmasked: %+v", d)
	}
	select {
	case m := <-s.C():
		t.Fatalf("a third message: %+v", m)
	default:
	}
}

func TestAPublishedEventBelongsToItsAdminClubSessionAndPlayerTopics(t *testing.T) {
	c, s, p := uuid.New(), uuid.New(), uuid.New()
	ev := Published{ClubID: c, SessionID: s, HasSession: true, PlayerIDs: []uuid.UUID{p}}
	want := []string{AdminTopic, ClubTopic(c), SessionTopic(s), PlayerTopic(p)}
	got := ev.Topics()
	if len(got) != 4 {
		t.Fatalf("%v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("%v, want %v", got, want)
		}
	}
	if n := len((Published{ClubID: c}).Topics()); n != 2 {
		t.Fatalf("a club-wide event has %d topics, want 2", n)
	}
}
