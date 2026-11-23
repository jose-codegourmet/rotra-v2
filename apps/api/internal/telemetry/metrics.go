package telemetry

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

// LiveMetrics records what live updates need on the Grafana dashboard (B-16, B-26, B-43, B-48): publisher lag, open streams,
// refusals per limit, events published and whether the listener is connected. It writes to the OpenTelemetry metric API:
// with no meter provider installed (this package only sets up tracing so far) the instruments do nothing, and the in-process
// Snapshot still counts, so tests and a future debug route can read the same numbers.
type LiveMetrics struct {
	refused   metric.Int64Counter
	published metric.Int64Counter
	open      metric.Int64UpDownCounter
	lag       metric.Float64Gauge
	listener  metric.Int64Gauge

	mu           sync.Mutex
	refusals     map[string]int64
	openStreams  atomic.Int64
	totalOpened  atomic.Int64
	eventsPushed atomic.Int64
	lagNanos     atomic.Int64
	listenerUp   atomic.Bool
}

// LiveSnapshot is the in-process view of LiveMetrics.
type LiveSnapshot struct {
	// Refusals counts refusals per reason: "ip_cap", "total_cap", "ticket_rate".
	Refusals      map[string]int64
	OpenStreams   int64
	StreamsOpened int64
	EventsPushed  int64
	PublisherLag  time.Duration
	ListenerUp    bool
}

// NewLiveMetrics builds the instruments on the global meter provider.
func NewLiveMetrics() (*LiveMetrics, error) {
	m := otel.Meter(ServiceName)
	var err error
	l := &LiveMetrics{refusals: map[string]int64{}}
	if l.refused, err = m.Int64Counter("rotra.live.refused", metric.WithDescription("Live update streams and tickets refused by a limit")); err != nil {
		return nil, err
	}
	if l.published, err = m.Int64Counter("rotra.live.events_published", metric.WithDescription("Live update events pushed to the hub")); err != nil {
		return nil, err
	}
	if l.open, err = m.Int64UpDownCounter("rotra.live.streams_open", metric.WithDescription("Open live update streams")); err != nil {
		return nil, err
	}
	if l.lag, err = m.Float64Gauge("rotra.live.publisher_lag_seconds", metric.WithUnit("s"),
		metric.WithDescription("Age of the oldest live update event not pushed yet (a write left open delays every ping, B-48)")); err != nil {
		return nil, err
	}
	if l.listener, err = m.Int64Gauge("rotra.live.listener_up", metric.WithDescription("1 while the LISTEN connection is connected")); err != nil {
		return nil, err
	}
	return l, nil
}

// StreamRefused counts one refusal by reason ("ip_cap", "total_cap" or "ticket_rate").
func (l *LiveMetrics) StreamRefused(reason string) {
	l.mu.Lock()
	l.refusals[reason]++
	l.mu.Unlock()
	l.refused.Add(context.Background(), 1, metric.WithAttributes(attribute.String("reason", reason)))
}

// StreamOpened counts a stream that opened.
func (l *LiveMetrics) StreamOpened() {
	l.openStreams.Add(1)
	l.totalOpened.Add(1)
	l.open.Add(context.Background(), 1)
}

// StreamClosed counts a stream that ended.
func (l *LiveMetrics) StreamClosed() {
	l.openStreams.Add(-1)
	l.open.Add(context.Background(), -1)
}

// PublisherLag records the age of the oldest event not pushed yet.
func (l *LiveMetrics) PublisherLag(d time.Duration) {
	l.lagNanos.Store(int64(d))
	l.lag.Record(context.Background(), d.Seconds())
}

// EventsPublished counts events pushed to the hub.
func (l *LiveMetrics) EventsPublished(n int) {
	l.eventsPushed.Add(int64(n))
	l.published.Add(context.Background(), int64(n))
}

// ListenerUp records whether the LISTEN connection is connected.
func (l *LiveMetrics) ListenerUp(up bool) {
	l.listenerUp.Store(up)
	v := int64(0)
	if up {
		v = 1
	}
	l.listener.Record(context.Background(), v)
}

// Snapshot is what the metrics hold now.
func (l *LiveMetrics) Snapshot() LiveSnapshot {
	l.mu.Lock()
	refusals := make(map[string]int64, len(l.refusals))
	for k, v := range l.refusals {
		refusals[k] = v
	}
	l.mu.Unlock()
	return LiveSnapshot{
		Refusals: refusals, OpenStreams: l.openStreams.Load(), StreamsOpened: l.totalOpened.Load(), EventsPushed: l.eventsPushed.Load(),
		PublisherLag: time.Duration(l.lagNanos.Load()), ListenerUp: l.listenerUp.Load(),
	}
}
