package telemetry

import (
	"testing"
	"time"
)

func TestLiveMetricsCountWhatTheDashboardShows(t *testing.T) {
	m, err := NewLiveMetrics()
	if err != nil {
		t.Fatal(err)
	}
	m.StreamRefused("ip_cap")
	m.StreamRefused("ip_cap")
	m.StreamRefused("total_cap")
	m.StreamOpened()
	m.StreamOpened()
	m.StreamClosed()
	m.PublisherLag(1500 * time.Millisecond)
	m.EventsPublished(3)
	m.EventsPublished(2)
	m.ListenerUp(true)
	s := m.Snapshot()
	if s.Refusals["ip_cap"] != 2 || s.Refusals["total_cap"] != 1 || s.OpenStreams != 1 || s.StreamsOpened != 2 ||
		s.PublisherLag != 1500*time.Millisecond || s.EventsPushed != 5 || !s.ListenerUp {
		t.Fatalf("%+v", s)
	}
	m.ListenerUp(false)
	m.PublisherLag(0)
	if s := m.Snapshot(); s.ListenerUp || s.PublisherLag != 0 {
		t.Fatalf("%+v", s)
	}
	// The snapshot is a copy: counting on never changes one already taken.
	before := m.Snapshot()
	m.StreamRefused("ticket_rate")
	if before.Refusals["ticket_rate"] != 0 {
		t.Fatal("a snapshot changed after it was taken")
	}
}
