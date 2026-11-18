package profile_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

var ctx = context.Background()

func seedPlayer(t *testing.T, pool *pgxpool.Pool) uuid.UUID {
	t.Helper()
	id := uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO players (id, full_name, nickname, updated_at) VALUES ($1, 'Old Name', 'Old', now())`, id); err != nil {
		t.Fatal(err)
	}
	return id
}

// save runs profile.Save in its own transaction and commits.
func save(t *testing.T, pool *pgxpool.Pool, id uuid.UUID, d profile.Details, expected *int64, now time.Time) (int64, error) {
	t.Helper()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	rev, err := profile.Save(ctx, tx, id, d, expected, now)
	if err != nil {
		_ = tx.Rollback(ctx)
		return 0, err
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	return rev, nil
}

type row struct {
	fullName string
	nickname *string
	months   *int32
	recorded *time.Time
	details  string
	version  *int32
	revision int64
	links    map[string]string
}

func read(t *testing.T, pool *pgxpool.Pool, id uuid.UUID) row {
	t.Helper()
	var r row
	err := pool.QueryRow(ctx, `SELECT full_name, nickname, experience_months, experience_recorded_at, coalesce(personal_details::text, ''), details_version, revision FROM players WHERE id = $1`, id).
		Scan(&r.fullName, &r.nickname, &r.months, &r.recorded, &r.details, &r.version, &r.revision)
	if err != nil {
		t.Fatal(err)
	}
	r.links = map[string]string{}
	rows, err := pool.Query(ctx, `SELECT provider::text, url FROM player_social_links WHERE player_id = $1`, id)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var p, u string
		if err := rows.Scan(&p, &u); err != nil {
			t.Fatal(err)
		}
		r.links[p] = u
	}
	return r
}

func TestSaveWritesTheDetails(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	id := seedPlayer(t, pool)
	now := d("2026-11-17T12:00:00Z")
	in := base()
	in.FullName, in.Nickname, in.PlayingStyle = " Ana Reyes ", " Nana ", " baseline "
	in.ExperienceYears, in.ExperienceMonths = f64(2), f64(3)
	in.Links["facebook"] = "https://facebook.com/ana"
	details, ferr := profile.Parse(in)
	if ferr != nil {
		t.Fatal(ferr)
	}
	rev, err := save(t, pool, id, details, nil, now)
	if err != nil || rev != 2 {
		t.Fatalf("revision %d %v", rev, err)
	}
	r := read(t, pool, id)
	if r.fullName != "Ana Reyes" || r.nickname == nil || *r.nickname != "Nana" || r.revision != 2 {
		t.Fatalf("%+v", r)
	}
	if r.months == nil || *r.months != 27 || r.recorded == nil || !r.recorded.Equal(now) {
		t.Fatalf("experience %v %v", deref(r.months), r.recorded)
	}
	if r.details != `{"playingStyle": "baseline"}` || r.version == nil || *r.version != 1 {
		t.Fatalf("details %q %v", r.details, r.version)
	}
	if len(r.links) != 1 || r.links["facebook"] != "https://facebook.com/ana" {
		t.Fatalf("links %v", r.links)
	}
	var updated time.Time
	if err := pool.QueryRow(ctx, `SELECT updated_at FROM players WHERE id = $1`, id).Scan(&updated); err != nil || !updated.Equal(now) {
		t.Fatalf("updated_at %v %v", updated, err)
	}
}

func TestSaveExperienceSnapshot(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	recorded := d("2026-01-10T00:00:00Z")
	id := uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO players (id, full_name, experience_months, experience_recorded_at, updated_at) VALUES ($1, 'P', 20, $2, now())`, id, recorded); err != nil {
		t.Fatal(err)
	}
	now := d("2026-11-17T12:00:00Z") // 10 calendar months later: shown is 30
	in := base()
	in.ExperienceYears, in.ExperienceMonths = f64(2), f64(6) // 30 months: what the form shows, unchanged
	details, _ := profile.Parse(in)
	if _, err := save(t, pool, id, details, nil, now); err != nil {
		t.Fatal(err)
	}
	if r := read(t, pool, id); *r.months != 20 || !r.recorded.Equal(recorded) {
		t.Fatalf("an unchanged value keeps its snapshot: %v %v", *r.months, r.recorded)
	}
	in.ExperienceMonths = f64(7) // changed: recorded now
	details, _ = profile.Parse(in)
	if _, err := save(t, pool, id, details, nil, now); err != nil {
		t.Fatal(err)
	}
	if r := read(t, pool, id); *r.months != 31 || !r.recorded.Equal(now) {
		t.Fatalf("a new value is recorded now: %v %v", *r.months, r.recorded)
	}
	in.ExperienceYears, in.ExperienceMonths = nil, nil // cleared together (players_experience_recorded_check)
	details, _ = profile.Parse(in)
	if _, err := save(t, pool, id, details, nil, now); err != nil {
		t.Fatal(err)
	}
	if r := read(t, pool, id); r.months != nil || r.recorded != nil {
		t.Fatalf("cleared: %v %v", r.months, r.recorded)
	}
}

func TestSaveLinks(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	id := seedPlayer(t, pool)
	now := d("2026-11-17T12:00:00Z")
	put := func(links map[string]string) {
		in := base()
		in.Links = links
		details, ferr := profile.Parse(in)
		if ferr != nil {
			t.Fatal(ferr)
		}
		if _, err := save(t, pool, id, details, nil, now); err != nil {
			t.Fatal(err)
		}
	}
	put(map[string]string{"facebook": "https://facebook.com/a", "youtube": "https://youtube.com/@a"})
	put(map[string]string{"facebook": "https://facebook.com/b", "youtube": ""}) // updated, removed
	put(map[string]string{"instagram": "https://instagram.com/c"})              // facebook left alone
	r := read(t, pool, id)
	if len(r.links) != 2 || r.links["facebook"] != "https://facebook.com/b" || r.links["instagram"] != "https://instagram.com/c" {
		t.Fatalf("%v", r.links)
	}
	if r.revision != 4 {
		t.Fatalf("each save bumps the revision once: %d", r.revision)
	}
}

func TestSaveChecksTheRevision(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	id := seedPlayer(t, pool)
	details, _ := profile.Parse(base())
	stale := int64(5)
	if _, err := save(t, pool, id, details, &stale, d("2026-11-17T12:00:00Z")); !errors.Is(err, profile.ErrRevisionConflict) {
		t.Fatalf("%v", err)
	}
	if r := read(t, pool, id); r.fullName != "Old Name" || r.revision != 1 {
		t.Fatalf("a refused save writes nothing: %+v", r)
	}
	current := int64(1)
	if rev, err := save(t, pool, id, details, &current, d("2026-11-17T12:00:00Z")); err != nil || rev != 2 {
		t.Fatalf("%d %v", rev, err)
	}
}

func TestSaveUnknownPlayer(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 2)
	details, _ := profile.Parse(base())
	if _, err := save(t, pool, uuid.New(), details, nil, d("2026-11-17T12:00:00Z")); !errors.Is(err, profile.ErrNotFound) {
		t.Fatalf("%v", err)
	}
}

// The profile row is locked for the whole save: a second save waits for the first, so two edits can never both
// pass the same expected revision.
func TestSaveSerializesOnTheRow(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 6)
	id := seedPlayer(t, pool)
	details, _ := profile.Parse(base())
	one := int64(1)
	results := make(chan error, 4)
	for i := 0; i < 4; i++ {
		go func() {
			tx, err := pool.Begin(ctx)
			if err != nil {
				results <- err
				return
			}
			_, err = profile.Save(ctx, tx, id, details, &one, d("2026-11-17T12:00:00Z"))
			if err != nil {
				_ = tx.Rollback(ctx)
			} else {
				err = tx.Commit(ctx)
			}
			results <- err
		}()
	}
	var ok, conflict int
	for i := 0; i < 4; i++ {
		switch err := <-results; {
		case err == nil:
			ok++
		case errors.Is(err, profile.ErrRevisionConflict):
			conflict++
		default:
			t.Fatal(err)
		}
	}
	if ok != 1 || conflict != 3 {
		t.Fatalf("ok %d conflict %d", ok, conflict)
	}
}
