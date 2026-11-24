package liveupdates_test

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writetest"
)

func visitor() who { return who{} }

func smash(h *harness) who { return who{app: "club", pass: h.pass("club", smashLogin)} }

// ---- the wire: ready, changed, ids

func TestAStreamStartsWithReadyAndCarriesTheLatestPositionOrNullWhenThereIsNone(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	tk, code := h.ticket(visitor(), "public-session:"+slugPrep)
	if code != 200 || len(tk.Topics) != 1 || tk.Topics[0] != "public-session:"+slugPrep || tk.ExpiresInSeconds != 60 {
		t.Fatalf("ticket = %+v (%d)", tk, code)
	}
	s := h.open(tk.Ticket, "")
	ready := s.expect("ready")
	if ready.ID != "" || ready.Data != `{"position":null}` {
		t.Fatalf("an empty table must give no position: %+v", ready)
	}
	h.commit(sessionEvent(sessionPrep, "roster"))
	h.settle()
	tk, _ = h.ticket(visitor(), "public-session:"+slugPrep)
	ready = h.open(tk.Ticket, "").expect("ready")
	pos, ok := liveupdates.ParsePosition(ready.ID)
	if !ok || pos != h.pub.Cursor() {
		t.Fatalf("ready id %q is not the publisher's position %v", ready.ID, h.pub.Cursor())
	}
}

func TestALiveMessageCarriesTheSessionEventIdAsItsSnapshotVersion(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	s, _ := h.watch(smash(h), "club:"+clubSmash, "session:"+sessionPrep)
	ids := h.commit(sessionEvent(sessionPrep, "roster"))
	seen := map[string]liveupdates.ChangedData{}
	var lastID string
	for range 2 {
		e := s.expect("changed")
		d := e.changed(t)
		seen[d.Topic], lastID = d, e.ID
	}
	for _, topic := range []string{"club:" + clubSmash, "session:" + sessionPrep} {
		d, ok := seen[topic]
		if !ok || d.Version == nil || *d.Version != ids[0] || d.Kind != "roster" {
			t.Fatalf("%s: %+v, want version %d kind roster", topic, d, ids[0])
		}
	}
	// The SSE id is the stream position "<xact_id>:<id>": the event's own transaction id and id.
	want := h.scalar(`SELECT xact_id::text || ':' || id FROM live_update_events WHERE id = $1`, ids[0])
	if lastID != want {
		t.Fatalf("event id %q, want %q", lastID, want)
	}
}

func TestEventReachesAConnectedScreenInUnderASecond(t *testing.T) {
	h := newHarness(t, harnessOpts{poll: time.Hour}) // only the NOTIFY nudge can deliver it
	s, _ := h.watch(smash(h), "session:"+sessionPrep)
	start := time.Now()
	h.commit(sessionEvent(sessionPrep, "courts"))
	s.expect("changed")
	if d := time.Since(start); d >= time.Second {
		t.Fatalf("the event took %v", d)
	}
}

// ---- B-48: the publisher reads in transaction order

func TestB48WriteRTakesItsTransactionIdFirstAndInsertsLastWriteEInsertsFirstAndCommitsLast(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	ctx := context.Background()
	live := "public-session:live-now"
	h.commit(sessionEvent(sessionPrep, "roster")) // a baseline the phone has seen
	base := h.settle()
	s, ready := h.watch(visitor(), "public-session:"+slugPrep, live)
	if ready != base.String() {
		t.Fatalf("ready at %q, want the baseline %v", ready, base)
	}

	r, err := h.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = r.Rollback(ctx) }()
	if _, err := r.Exec(ctx, `SELECT pg_current_xact_id()`); err != nil { // R takes its transaction id first ...
		t.Fatal(err)
	}
	e, err := h.pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = e.Rollback(ctx) }()
	idE, err := liveupdates.Append(ctx, e, sessionEvent(sessionLive, "queue")) // ... E inserts first ...
	if err != nil {
		t.Fatal(err)
	}
	idR, err := liveupdates.Append(ctx, r, sessionEvent(sessionPrep, "roster")) // ... R inserts last, with the higher id ...
	if err != nil {
		t.Fatal(err)
	}
	if idR <= idE {
		t.Fatalf("R's id %d is not above E's %d: the shape of the test is wrong", idR, idE)
	}
	if err := r.Commit(ctx); err != nil { // ... R commits first, E last.
		t.Fatal(err)
	}

	got := s.expect("changed").changed(t)
	if got.Topic != "public-session:"+slugPrep || *got.Version != idR {
		t.Fatalf("first message %+v, want R (#%d)", got, idR)
	}
	s.quiet(300 * time.Millisecond) // E's transaction is still running: its row must not be skipped past, and must not be sent early
	if err := e.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	got = s.expect("changed").changed(t)
	if got.Topic != live || *got.Version != idE {
		t.Fatalf("second message %+v, want E (#%d), which an id cursor would have skipped", got, idE)
	}

	// A reconnect with the last id the phone had before both gets both.
	tk, _ := h.ticket(visitor(), "public-session:"+slugPrep, live)
	back := h.open(tk.Ticket, ready)
	topics := map[string]int64{}
	for range 2 {
		d := back.expect("changed").changed(t)
		topics[d.Topic] = *d.Version
	}
	if topics["public-session:"+slugPrep] != idR || topics[live] != idE {
		t.Fatalf("the reconnect got %v, want R #%d and E #%d", topics, idR, idE)
	}
	back.expect("ready")
}

// ---- reconnect

func TestReconnectResumesFromTheLastEventIdWithOneChangedPerTopicThatMoved(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	s, _ := h.watch(smash(h), "club:"+clubSmash, "session:"+sessionPrep, "session:"+sessionLive)
	first := h.commit(sessionEvent(sessionPrep, "roster"))[0]
	var last string
	for range 2 { // club and session topic
		last = s.expect("changed").ID
	}
	s.close()

	// While the phone is away: two moves on the prep session, one on the live one, and one for another club.
	ids := h.commit(sessionEvent(sessionPrep, "roster"))
	ids = append(ids, h.commit(sessionEvent(sessionPrep, "courts"))...)
	ids = append(ids, h.commit(sessionEvent(sessionLive, "queue"))...)
	h.commit(liveupdates.Event{ClubID: uid(clubOther), Kind: "club"})
	h.settle()

	tk, code := h.ticket(smash(h), "club:"+clubSmash, "session:"+sessionPrep, "session:"+sessionLive)
	if code != 200 {
		t.Fatal(code)
	}
	back := h.open(tk.Ticket, last)
	moved := map[string]liveupdates.ChangedData{}
	for range 3 {
		d := back.expect("changed").changed(t)
		moved[d.Topic] = d
	}
	if m := moved["session:"+sessionPrep]; m.Version == nil || *m.Version != ids[1] || m.Kind != liveupdates.ChangedKind {
		t.Errorf("prep session: %+v, want now at #%d with kind changed (two kinds moved)", m, ids[1])
	}
	if m := moved["session:"+sessionLive]; m.Version == nil || *m.Version != ids[2] || m.Kind != "queue" {
		t.Errorf("live session: %+v, want now at #%d kind queue", m, ids[2])
	}
	if m := moved["club:"+clubSmash]; m.Version == nil || *m.Version != ids[2] {
		t.Errorf("club: %+v, want now at #%d (the newest of its sessions)", m, ids[2])
	}
	_ = first
	ready := back.expect("ready")
	if ready.ID != h.pub.Cursor().String() {
		t.Errorf("ready %q, want %v", ready.ID, h.pub.Cursor())
	}
	back.quiet(200 * time.Millisecond)

	// Nothing missed: a reconnect at the newest position gets only ready.
	tk, _ = h.ticket(smash(h), "club:"+clubSmash)
	again := h.open(tk.Ticket, ready.ID)
	again.expect("ready")
	again.quiet(200 * time.Millisecond)
}

func TestTheCatchUpCarriesNoIdSoACutStreamResumesFromWhereItWas(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	h.commit(sessionEvent(sessionPrep, "roster"))
	pos := h.settle().String()
	h.commit(sessionEvent(sessionPrep, "roster"))
	h.settle()
	tk, _ := h.ticket(smash(h), "session:"+sessionPrep)
	s := h.open(tk.Ticket, pos)
	if e := s.expect("changed"); e.ID != "" {
		t.Fatalf("a catch-up message carries id %q: a cut here would lose what follows", e.ID)
	}
	if e := s.expect("ready"); e.ID != h.pub.Cursor().String() {
		t.Fatalf("ready id %q", e.ID)
	}
}

func TestAnIdOlderThanTheKeptEventsGetsChangedOnEveryTopic(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	ctx := context.Background()
	h.commit(sessionEvent(sessionPrep, "roster"))
	old := h.settle().String()
	keep := h.commit(sessionEvent(sessionPrep, "courts"))[0]
	h.settle()
	versionBefore := h.scalar(`SELECT latest_event_id FROM queue_sessions WHERE id = $1`, sessionPrep)

	// The housekeeping of B-34: rows older than 7 days go, and the session keeps its version.
	h.env.Exec(t, `UPDATE live_update_events SET created_at = now() - interval '8 days' WHERE id < $1`, keep)
	n, err := liveupdates.Cleanup(7).Delete(ctx, h.pool, 1000)
	if err != nil || n != 1 {
		t.Fatalf("cleanup deleted %d (%v), want 1", n, err)
	}
	if got := h.scalar(`SELECT latest_event_id FROM queue_sessions WHERE id = $1`, sessionPrep); got != versionBefore {
		t.Fatalf("the cleanup moved the snapshot version from %s to %s", versionBefore, got)
	}

	tk, _ := h.ticket(smash(h), "club:"+clubSmash, "session:"+sessionPrep)
	s := h.open(tk.Ticket, old)
	for range 2 {
		d := s.expect("changed").changed(t)
		if d.Version != nil || d.Kind != liveupdates.ChangedKind {
			t.Fatalf("%+v: a stale id means changed everywhere with no version", d)
		}
	}
	s.expect("ready")

	// An id the server cannot read (garbage) is just as stale.
	tk, _ = h.ticket(smash(h), "session:"+sessionPrep)
	if d := h.open(tk.Ticket, "not-a-position").expect("changed").changed(t); d.Version != nil {
		t.Fatalf("garbage id: %+v", d)
	}
	// And so is any id once every event is gone.
	h.env.Exec(t, `DELETE FROM live_update_events`)
	tk, _ = h.ticket(smash(h), "session:"+sessionPrep)
	if d := h.open(tk.Ticket, old).expect("changed").changed(t); d.Version != nil {
		t.Fatalf("empty table: %+v", d)
	}
}

func TestACatchUpTooBigIsTreatedAsStale(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	h.commit(sessionEvent(sessionPrep, "roster"))
	pos := h.settle().String()
	h.commit(sessionEvent(sessionPrep, "roster"), sessionEvent(sessionPrep, "courts"), sessionEvent(sessionPrep, "queue"))
	h.settle()
	h.svc.CatchUpLimit = 2
	tk, _ := h.ticket(smash(h), "session:"+sessionPrep)
	if d := h.open(tk.Ticket, pos).expect("changed").changed(t); d.Version != nil {
		t.Fatalf("%+v: past the catch-up limit the phone re-reads everything", d)
	}
}

// ---- the listener and the database

func TestListenerCutEventsCommittedMeanwhileStillReachScreensAfterItReconnects(t *testing.T) {
	h := newHarness(t, harnessOpts{poll: time.Hour}) // the poll cannot help: only the listener and its reconnect can
	s, _ := h.watch(smash(h), "session:"+sessionPrep)
	ctx := context.Background()
	waitFor := func(what string, ok func() bool) {
		t.Helper()
		for deadline := time.Now().Add(5 * time.Second); !ok(); time.Sleep(10 * time.Millisecond) {
			if time.Now().After(deadline) {
				t.Fatalf("timed out waiting for %s", what)
			}
		}
	}
	listeners := func() string {
		return h.scalar(`SELECT count(*) FROM pg_stat_activity WHERE query = 'LISTEN live_updates' AND pid <> pg_backend_pid()`)
	}
	waitFor("the listener", func() bool { return listeners() == "1" && h.metrics.Snapshot().ListenerUp })

	h.gate.shut.Store(true) // the direct connection cannot be made again until the test opens it
	if _, err := h.pool.Exec(ctx, `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query = 'LISTEN live_updates' AND pid <> pg_backend_pid()`); err != nil {
		t.Fatal(err)
	}
	waitFor("the cut", func() bool { return !h.metrics.Snapshot().ListenerUp && listeners() == "0" })
	id := h.commit(sessionEvent(sessionPrep, "roster"))[0] // committed while the listener is away
	s.quiet(300 * time.Millisecond)                        // nothing nudges the publisher, and its poll is an hour away
	h.gate.shut.Store(false)
	d := s.expect("changed").changed(t) // the reconnect reads what it missed
	if *d.Version != id {
		t.Fatalf("got %+v, want #%d", d, id)
	}
	waitFor("the reconnect", func() bool { return h.metrics.Snapshot().ListenerUp && listeners() == "1" })
	id = h.commit(sessionEvent(sessionPrep, "courts"))[0] // and the nudge works again
	if d := s.expect("changed").changed(t); *d.Version != id {
		t.Fatalf("after the reconnect: %+v, want #%d", d, id)
	}
}

func TestIdleInTransactionTimeoutIsSetOnTheAPIConnectionsAndAHeldOpenWriteDelaysThenReleases(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	ctx := context.Background()
	wp, err := db.Open(ctx, h.pool.Config().ConnString(), db.Options{MaxConns: 3, IdleInTxTimeout: time.Second})
	if err != nil {
		t.Fatal(err)
	}
	defer wp.Close()
	var set string
	if err := wp.Raw().QueryRow(ctx, `SHOW idle_in_transaction_session_timeout`).Scan(&set); err != nil || set != "1s" {
		t.Fatalf("idle_in_transaction_session_timeout = %q (%v), want 1s on the API's connections", set, err)
	}

	s, _ := h.watch(visitor(), "public-session:"+slugPrep)
	r, err := wp.Raw().Begin(ctx) // a write that takes its transaction id, then sits idle in its transaction
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = r.Rollback(ctx) }()
	if _, err := liveupdates.Append(ctx, r, sessionEvent(sessionLive, "queue")); err != nil {
		t.Fatal(err)
	}
	id := h.commit(sessionEvent(sessionPrep, "roster"))[0]
	start := time.Now()
	s.quiet(500 * time.Millisecond) // the held-open write holds back the ping
	time.Sleep(200 * time.Millisecond)
	if lag := h.metrics.Snapshot().PublisherLag; lag < 300*time.Millisecond {
		t.Fatalf("publisher lag %v: it must show a write holding events back", lag)
	}
	d := s.expect("changed").changed(t) // the timeout ends the idle write; the event goes out
	if *d.Version != id {
		t.Fatalf("%+v, want #%d", d, id)
	}
	if took := time.Since(start); took < 900*time.Millisecond || took > 4*time.Second {
		t.Fatalf("released after %v, want about the 1 s timeout", took)
	}
	if err := r.Commit(ctx); err == nil {
		t.Fatal("the idle write was not ended by the timeout")
	}
	deadline := time.Now().Add(3 * time.Second)
	for h.metrics.Snapshot().PublisherLag != 0 && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
	}
	if lag := h.metrics.Snapshot().PublisherLag; lag != 0 {
		t.Fatalf("lag %v after the release", lag)
	}
}

func TestEventsAreReadInBatchesInOrder(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true, hubBuf: 4000})
	ctx := context.Background()
	if _, err := h.pool.Exec(ctx, `INSERT INTO live_update_events (club_id, kind) SELECT $1, 'bulk' FROM generate_series(1, 2500)`, uid(clubSmash)); err != nil {
		t.Fatal(err)
	}
	sub, _ := h.pub.SubscribeAt([]liveupdates.Target{{Topic: liveupdates.ClubTopic(uuid.MustParse(clubSmash)), Label: "club"}})
	defer sub.Close()
	if err := h.pub.ReadNow(ctx); err != nil { // 2,500 rows are three reads of at most 1,000
		t.Fatal(err)
	}
	var last int64
	for i := 0; i < 2500; i++ {
		select {
		case m := <-sub.C():
			var d liveupdates.ChangedData
			if err := json.Unmarshal(m.Data, &d); err != nil {
				t.Fatal(err)
			}
			if *d.Version <= last {
				t.Fatalf("message %d is #%d after #%d", i, *d.Version, last)
			}
			last = *d.Version
		case <-time.After(5 * time.Second):
			t.Fatalf("only %d of 2500 events arrived", i)
		}
	}
}

// ---- the stream's limits and the deploy

func TestTheFiftyFirstStreamFromOneIPIsRefusedAndSignedInScreensAreNeverLimited(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	ip := who{ip: "198.51.100.7"}
	var open []*stream
	for i := 0; i < 50; i++ {
		tk, code := h.ticket(ip, "public-session:"+slugPrep)
		if code != 200 {
			t.Fatalf("ticket %d refused: %d", i, code)
		}
		s := h.open(tk.Ticket, "")
		if s.resp.StatusCode != 200 {
			t.Fatalf("stream %d refused: %d", i, s.resp.StatusCode)
		}
		open = append(open, s)
	}
	tk, _ := h.ticket(ip, "public-session:"+slugPrep)
	refused := h.open(tk.Ticket, "")
	if refused.resp.StatusCode != http.StatusTooManyRequests || refused.resp.Header.Get("Retry-After") == "" {
		t.Fatalf("the 51st stream = %d", refused.resp.StatusCode)
	}
	if h.metrics.Snapshot().Refusals["ip_cap"] != 1 {
		t.Fatalf("refusals %v", h.metrics.Snapshot().Refusals)
	}
	// Another IP is not affected, and a slot frees when a screen leaves.
	other, _ := h.ticket(who{ip: "198.51.100.8"}, "public-session:"+slugPrep)
	if h.open(other.Ticket, "").resp.StatusCode != 200 {
		t.Fatal("another IP was refused")
	}
	open[0].close()
	time.Sleep(100 * time.Millisecond)
	tk, _ = h.ticket(ip, "public-session:"+slugPrep)
	if h.open(tk.Ticket, "").resp.StatusCode != 200 {
		t.Fatal("a freed slot was not given back")
	}
	// A signed-in screen on the same IP is never counted.
	club := who{app: "club", pass: h.pass("club", smashLogin), ip: "198.51.100.7"}
	for i := 0; i < 3; i++ {
		tk, code := h.ticket(club, "club:"+clubSmash)
		if code != 200 || h.open(tk.Ticket, "").resp.StatusCode != 200 {
			t.Fatalf("a signed-in screen was limited (%d)", code)
		}
	}
}

func TestStreamsPastTheTotalCapAreRefusedAndMoreThanSixtyTicketsAMinuteFromOneIPToo(t *testing.T) {
	h := newHarness(t, harnessOpts{stream: httpapi.StreamOptions{MaxStreams: 3}})
	for i := 0; i < 3; i++ {
		tk, _ := h.ticket(who{ip: "203.0.113." + strconv.Itoa(i+1)}, "public-session:"+slugPrep)
		if h.open(tk.Ticket, "").resp.StatusCode != 200 {
			t.Fatalf("stream %d refused under the cap", i)
		}
	}
	tk, _ := h.ticket(who{ip: "203.0.113.99"}, "public-session:"+slugPrep)
	if code := h.open(tk.Ticket, "").resp.StatusCode; code != http.StatusTooManyRequests {
		t.Fatalf("past the total cap = %d", code)
	}
	if h.metrics.Snapshot().Refusals["total_cap"] != 1 {
		t.Fatalf("refusals %v", h.metrics.Snapshot().Refusals)
	}
	if tk, _ := h.ticket(smash(h), "club:"+clubSmash); h.open(tk.Ticket, "").resp.StatusCode != 200 {
		t.Fatal("a signed-in screen was refused past the total cap")
	}

	// 60 tickets a minute from one IP; the 61st is refused. Signed-in screens are not counted.
	h = newHarness(t, harnessOpts{})
	ip := who{ip: "198.51.100.50"}
	for i := 0; i < 60; i++ {
		if _, code := h.ticket(ip, "public-session:"+slugPrep); code != 200 {
			t.Fatalf("ticket %d = %d", i+1, code)
		}
	}
	resp, err := h.ticketRequest(ip, "public-session:"+slugPrep)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusTooManyRequests || resp.Header.Get("Retry-After") == "" {
		t.Fatalf("the 61st ticket = %d", resp.StatusCode)
	}
	if h.metrics.Snapshot().Refusals["ticket_rate"] != 1 {
		t.Fatalf("refusals %v", h.metrics.Snapshot().Refusals)
	}
	club := who{app: "club", pass: h.pass("club", smashLogin), ip: "198.51.100.50"}
	for i := 0; i < 70; i++ {
		if _, code := h.ticket(club, "club:"+clubSmash); code != 200 {
			t.Fatalf("signed-in ticket %d = %d", i+1, code)
		}
	}
}

func TestOnDeployEachStreamIsToldToReconnectAfterARandomOneToFiveSecondsAndClosed(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	const n = 30
	var streams []*stream
	for i := 0; i < n; i++ {
		s, _ := h.watch(visitor(), "public-session:"+slugPrep)
		streams = append(streams, s)
	}
	h.readiness.SetDraining()
	var waits []int
	for _, s := range streams {
		e := s.expect("reconnect")
		ms, err := strconv.Atoi(e.Retry)
		if err != nil || ms < 1000 || ms > 5000 {
			t.Fatalf("retry %q: want 1000 to 5000 ms", e.Retry)
		}
		if e.Data != `{"retryMs":`+e.Retry+`}` {
			t.Fatalf("data %q does not repeat the wait", e.Data)
		}
		waits = append(waits, ms)
		if _, open := s.next(2 * time.Second); open {
			t.Fatal("the stream stayed open after its hint")
		}
	}
	lo, hi := waits[0], waits[0]
	for _, w := range waits {
		lo, hi = min(lo, w), max(hi, w)
	}
	if hi-lo < 1500 {
		t.Fatalf("reconnect waits %v..%v do not spread over the window", lo, hi)
	}
	// A phone that connects after draining began is not accepted by this instance: /readyz fails.
	req, _ := http.NewRequest(http.MethodGet, h.srv.URL+"/readyz", nil)
	req.Header.Set(httpapi.ProxySecretHeader, writetest.ProxySecret)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("/readyz = %d while draining", resp.StatusCode)
	}
}

func TestAScreenTooSlowToKeepUpIsToldToReconnectAndCatchesUp(t *testing.T) {
	h := newHarness(t, harnessOpts{hubBuf: 2})
	h.commit(sessionEvent(sessionPrep, "roster")) // the position the screen was at
	h.settle()
	s, ready := h.watch(smash(h), "session:"+sessionPrep)
	// Many events at once: the screen's feed of 2 overflows before the stream has written them.
	var evs []liveupdates.Event
	for range 60 {
		evs = append(evs, sessionEvent(sessionPrep, "roster"))
	}
	h.commit(evs...)
	var dropped bool
	deadline := time.After(5 * time.Second)
	for !dropped {
		select {
		case e, ok := <-s.events:
			if !ok {
				t.Fatal("the stream closed with no hint")
			}
			dropped = e.Event == "reconnect"
		case <-deadline:
			t.Fatal("no reconnect hint for a screen that fell behind")
		}
	}
	// Its last id is still the one it had, so the catch-up tells it what moved.
	tk, _ := h.ticket(smash(h), "session:"+sessionPrep)
	back := h.open(tk.Ticket, ready)
	if d := back.expect("changed").changed(t); d.Version == nil {
		t.Fatalf("%+v", d)
	}
}

func TestCORSAllowsLastEventIdOnTheStreamRoute(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	req, _ := http.NewRequest(http.MethodOptions, h.srv.URL+"/stream", nil)
	req.Header.Set("Origin", "http://localhost:9000")
	req.Header.Set("Access-Control-Request-Method", "GET")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	if !strings.Contains(resp.Header.Get("Access-Control-Allow-Headers"), "Last-Event-ID") {
		t.Fatalf("headers %q", resp.Header.Get("Access-Control-Allow-Headers"))
	}
}

func TestAnAPIRestartMidSessionPhonesReconnectAndCatchUpWithNoManualRefresh(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	s, _ := h.watch(smash(h), "session:"+sessionPrep, "session:"+sessionLive)
	h.commit(sessionEvent(sessionPrep, "roster"))
	last := s.expect("changed").ID
	s.close()

	h.stop() // the deploy: the old copy is gone, and with it the hub, the cursor and every open stream
	// While no API runs, writes still commit (the events are in the table, not in the process).
	ids := h.commit(sessionEvent(sessionPrep, "courts"))
	ids = append(ids, h.commit(sessionEvent(sessionLive, "queue"))...)
	h.start() // the new copy starts at the newest event, knowing nothing of the old one

	// The phone waits its hint, asks for a new ticket and reconnects with the id it had.
	tk, code := h.ticket(smash(h), "session:"+sessionPrep, "session:"+sessionLive)
	if code != 200 {
		t.Fatal(code)
	}
	back := h.open(tk.Ticket, last)
	moved := map[string]int64{}
	for range 2 {
		d := back.expect("changed").changed(t)
		moved[d.Topic] = *d.Version
	}
	if moved["session:"+sessionPrep] != ids[0] || moved["session:"+sessionLive] != ids[1] {
		t.Fatalf("caught up with %v, want #%d and #%d", moved, ids[0], ids[1])
	}
	back.expect("ready")
	// And the new copy goes on from there.
	id := h.commit(sessionEvent(sessionPrep, "roster"))[0]
	if d := back.expect("changed").changed(t); *d.Version != id {
		t.Fatalf("live after the restart: %+v, want #%d", d, id)
	}
}

// A transaction that ends without an event of its own nudges nobody: the events it held back must not wait for the next poll.
func TestAnEventHeldBehindATransactionThatEndsSilentlyIsSentAtOnce(t *testing.T) {
	h := newHarness(t, harnessOpts{poll: time.Hour}) // no poll can save it
	s, _ := h.watch(visitor(), "public-session:"+slugPrep)
	ctx := context.Background()
	x, err := h.pool.Begin(ctx) // a write that takes its transaction id first and will commit with no event (or an auth refresh)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = x.Rollback(ctx) }()
	if _, err := x.Exec(ctx, `SELECT pg_current_xact_id()`); err != nil {
		t.Fatal(err)
	}
	id := h.commit(sessionEvent(sessionPrep, "roster"))[0]
	s.quiet(300 * time.Millisecond) // held back by the guard
	start := time.Now()
	if err := x.Commit(ctx); err != nil { // no NOTIFY follows: only the publisher's own look
		t.Fatal(err)
	}
	d := s.expect("changed").changed(t)
	if *d.Version != id || time.Since(start) > time.Second {
		t.Fatalf("%+v after %v, want #%d within a second of the release", d, time.Since(start), id)
	}
}
