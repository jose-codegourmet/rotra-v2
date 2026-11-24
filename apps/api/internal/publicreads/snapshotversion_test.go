package publicreads_test

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

const openNightSession = "e4000000-0000-4000-8000-000000000001"

func pageAt(t *testing.T, h http.Handler, slug string, min int, ip string) (title string, version string) {
	t.Helper()
	path := "/api/public-sessions/" + slug
	if min > 0 {
		path += "?minVersion=" + strconv.Itoa(min)
	}
	rec := get(h, path, ip)
	if rec.Code != http.StatusOK {
		t.Fatalf("%s = %d: %s", path, rec.Code, rec.Body.String())
	}
	return decode(t, rec.Body.Bytes()).(map[string]any)["title"].(string), rec.Header().Get(publicreads.SnapshotVersionHeader)
}

func TestARereadAfterALiveMessageReturnsTheNewSnapshotNeverTheCachedOlderOne(t *testing.T) {
	pool, _ := openCounted(t)
	snaps := publicreads.NewSnapshots(publicreads.SnapshotSettings{})
	h := server(publicreads.Deps{Pool: pool, Snapshots: snaps})
	ctx := context.Background()

	if title, version := pageAt(t, h, "open-night", 0, "198.51.100.1"); title != "Open Night" || version != "" {
		t.Fatalf("first read: %q at version %q (a plain read carries no version header)", title, version)
	}
	// A write changes the page and moves the session's version; the cache still holds the older copy.
	if _, err := pool.Exec(ctx, `UPDATE queue_sessions SET title = 'Open Night II', latest_event_id = 7 WHERE id = $1`, openNightSession); err != nil {
		t.Fatal(err)
	}
	if title, _ := pageAt(t, h, "open-night", 0, "198.51.100.1"); title != "Open Night" {
		t.Fatalf("a plain read inside the safety window must still share the copy it has, got %q", title)
	}
	// The live message said "version 7": the screen asks for at least that and never gets the older copy.
	if title, version := pageAt(t, h, "open-night", 7, "198.51.100.1"); title != "Open Night II" || version != "7" {
		t.Fatalf("re-read at 7: %q at version %q", title, version)
	}
	// The newer copy replaced the older one: one copy per session and view.
	if snaps.Len() != 1 {
		t.Fatalf("the cache holds %d copies, want 1", snaps.Len())
	}
	if title, _ := pageAt(t, h, "open-night", 0, "198.51.100.1"); title != "Open Night II" {
		t.Fatalf("a plain read after it got %q", title)
	}
}

func TestAPlainReadNeverReturnsACopyOlderThanAVersionThePublisherPushed(t *testing.T) {
	pool, _ := openCounted(t)
	snaps := publicreads.NewSnapshots(publicreads.SnapshotSettings{})
	h := server(publicreads.Deps{Pool: pool, Snapshots: snaps})
	pageAt(t, h, "open-night", 0, "198.51.100.1")
	if _, err := pool.Exec(context.Background(), `UPDATE queue_sessions SET title = 'Open Night III', latest_event_id = 9 WHERE id = $1`, openNightSession); err != nil {
		t.Fatal(err)
	}
	snaps.Observe(uuid.MustParse(openNightSession), 9) // what the publisher does for every event it pushes
	if title, _ := pageAt(t, h, "open-night", 0, "198.51.100.1"); title != "Open Night III" {
		t.Fatalf("%q: a read with no version still must not be older than what the API has seen", title)
	}
}

func TestManyScreensRereadingTheSameNewVersionCauseOneSnapshotBuild(t *testing.T) {
	pool, reads := openCounted(t)
	h := server(publicreads.Deps{Pool: pool})
	pageAt(t, h, "open-night", 0, "198.51.100.1")
	before := reads.count()
	if _, err := pool.Exec(context.Background(), `UPDATE queue_sessions SET title = 'Open Night IV', latest_event_id = 11 WHERE id = $1`, openNightSession); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	titles := make([]string, 100)
	for i := range titles {
		wg.Add(1)
		go func() {
			defer wg.Done()
			titles[i], _ = pageAt(t, h, "open-night", 11, fmt.Sprintf("203.0.113.%d", i+1))
		}()
	}
	wg.Wait()
	for i, title := range titles {
		if title != "Open Night IV" {
			t.Fatalf("screen %d got %q", i, title)
		}
	}
	if built := reads.count() - before; built != 1 {
		t.Fatalf("%d database reads for 100 screens re-reading one version, want exactly 1", built)
	}
}

func TestACopyStillExpiresOnTheSafetyClockWhateverItsVersion(t *testing.T) {
	pool, _ := openCounted(t)
	clk := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	h := server(publicreads.Deps{Pool: pool, Now: clk.Now})
	pageAt(t, h, "open-night", 0, "198.51.100.1")
	// A change that carries no session event (a club's name) reaches the page within one TTL.
	if _, err := pool.Exec(context.Background(), `UPDATE queue_sessions SET title = 'Renamed' WHERE id = $1`, openNightSession); err != nil {
		t.Fatal(err)
	}
	clk.Advance(sessionTTL)
	if title, _ := pageAt(t, h, "open-night", 0, "198.51.100.1"); title != "Renamed" {
		t.Fatalf("got %q after the safety window", title)
	}
}

func TestAMinVersionThatIsNotANumberAsksForNoVersion(t *testing.T) {
	pool, reads := openCounted(t)
	h := server(publicreads.Deps{Pool: pool})
	pageAt(t, h, "open-night", 0, "198.51.100.1")
	n := reads.count()
	for _, q := range []string{"?minVersion=abc", "?minVersion=-4", "?minVersion=", "?minVersion=1e3"} {
		if rec := get(h, "/api/public-sessions/open-night"+q, "198.51.100.1"); rec.Code != 200 {
			t.Fatalf("%s = %d", q, rec.Code)
		}
	}
	if reads.count() != n {
		t.Fatalf("a bad minVersion forced %d rebuilds", reads.count()-n)
	}
	// A version far ahead of anything the database has is built once and answered with what the database has.
	title, version := pageAt(t, h, "open-night", 999999, "198.51.100.1")
	if title == "" || version != "0" {
		t.Fatalf("%q at %q", title, version)
	}
}
