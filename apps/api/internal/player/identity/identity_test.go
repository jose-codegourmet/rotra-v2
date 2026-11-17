package identity_test

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

var ctx = context.Background()

// noon on 2026-10-29 in Manila: the sync day is 2026-10-29 (the RTR ID in the docs is ...-102926-...)
var noon = time.Date(2026, 10, 29, 4, 0, 0, 0, time.UTC)

func exec(t testing.TB, pool *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := pool.Exec(ctx, sql, args...); err != nil {
		t.Fatalf("exec %q: %v", sql, err)
	}
}

// location returns the id of a seeded location code (PH/CEB is one of them), or adds one.
func location(t testing.TB, pool *pgxpool.Pool, country, city string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := pool.QueryRow(ctx, `SELECT id FROM location_codes WHERE country_code = $1 AND city_code = $2`, country, city).Scan(&id)
	if err != nil {
		id = uuid.New()
		exec(t, pool, `INSERT INTO location_codes (id, country_code, city_code, display_name, updated_at) VALUES ($1, $2, $3, $3, now())`, id, country, city)
	}
	return id
}

func newClub(t testing.TB, pool *pgxpool.Pool, name string, loc uuid.UUID) uuid.UUID {
	t.Helper()
	id := uuid.New()
	exec(t, pool, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
	  VALUES ($1, $2, $3, $4, 'Somewhere', 'free', $5, now())`, id, name, name+id.String(), loc, uuid.New())
	return id
}

func newPlayer(t testing.TB, pool *pgxpool.Pool) uuid.UUID {
	t.Helper()
	id := uuid.New()
	exec(t, pool, `INSERT INTO players (id, full_name, updated_at) VALUES ($1, 'Player', now())`, id)
	return id
}

// allocate runs AllocateRTRID in its own transaction.
func allocate(pool *pgxpool.Pool, player, club uuid.UUID, at time.Time) (string, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	id, err := identity.AllocateRTRID(ctx, tx, player, club, at)
	if err != nil {
		_ = tx.Rollback(ctx)
		return "", err
	}
	return id, tx.Commit(ctx)
}

func TestAllocateRTRID(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	cebu := newClub(t, pool, "Cebu One", location(t, pool, "PH", "CEB"))
	manila := newClub(t, pool, "Manila One", location(t, pool, "PH", "MNL"))

	p1, p2, p3, p4 := newPlayer(t, pool), newPlayer(t, pool), newPlayer(t, pool), newPlayer(t, pool)
	for i, c := range []struct {
		player uuid.UUID
		club   uuid.UUID
		at     time.Time
		want   string
	}{
		{p1, cebu, noon, "RTR-PH-CEB-102926-0001"},
		{p2, cebu, noon.Add(time.Hour), "RTR-PH-CEB-102926-0002"},      // the same day continues the counter
		{p3, manila, noon, "RTR-PH-MNL-102926-0001"},                   // another location counts on its own
		{p4, cebu, noon.Add(24 * time.Hour), "RTR-PH-CEB-103026-0001"}, // a new sync day starts at 1
	} {
		got, err := allocate(pool, c.player, c.club, c.at)
		if err != nil || got != c.want {
			t.Fatalf("#%d: %q %v, want %q", i, got, err, c.want)
		}
	}
	// The immutable allocation row carries the frozen codes, the founding club and the sequence.
	var rtr, country, city, syncDate string
	var seq int32
	var creating, loc uuid.UUID
	err := pool.QueryRow(ctx, `SELECT rtr_id, country_code, city_code, sync_date::text, sequence, creating_club_id, location_code_id FROM player_id_allocations WHERE player_id = $1`, p2).
		Scan(&rtr, &country, &city, &syncDate, &seq, &creating, &loc)
	if err != nil || rtr != "RTR-PH-CEB-102926-0002" || country != "PH" || city != "CEB" || syncDate != "2026-10-29" || seq != 2 || creating != cebu {
		t.Fatalf("%q %q %q %q %d %v: %v", rtr, country, city, syncDate, seq, creating, err)
	}
	// a second allocation for the same player is refused by the primary key
	if _, err := allocate(pool, p1, cebu, noon); err == nil {
		t.Fatal("a player gets one RTR ID")
	}
	// an unknown club is an error, not a panic
	if _, err := allocate(pool, newPlayer(t, pool), uuid.New(), noon); err == nil {
		t.Fatal("unknown club")
	}
}

// The counter is advanced by rotra_next_player_sequence, one atomic upsert: a rolled-back allocation gives its
// number back (no gap), and concurrent allocations serialize on the counter row.
func TestAllocateRTRIDRollbackLeavesNoGap(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	club := newClub(t, pool, "Cebu One", location(t, pool, "PH", "CEB"))
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	first, err := identity.AllocateRTRID(ctx, tx, newPlayer(t, pool), club, noon)
	if err != nil || first != "RTR-PH-CEB-102926-0001" {
		t.Fatalf("%q %v", first, err)
	}
	if err := tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	if got, err := allocate(pool, newPlayer(t, pool), club, noon); err != nil || got != "RTR-PH-CEB-102926-0001" {
		t.Fatalf("after a rollback: %q %v", got, err)
	}
}

// Two clubs founded in the same city, and many players, drawing at the same moment: every RTR ID is distinct and
// the sequence has no holes.
func TestAllocateRTRIDConcurrentClubsGetDistinctIDs(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 16)
	loc := location(t, pool, "PH", "CEB")
	clubs := []uuid.UUID{newClub(t, pool, "Club A", loc), newClub(t, pool, "Club B", loc)}
	const n = 24
	players := make([]uuid.UUID, n)
	for i := range players {
		players[i] = newPlayer(t, pool)
	}
	got := make([]string, n)
	errs := make([]error, n)
	var wg sync.WaitGroup
	start := make(chan struct{})
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			got[i], errs[i] = allocate(pool, players[i], clubs[i%2], noon)
		}()
	}
	close(start)
	wg.Wait()
	seen := map[string]bool{}
	for i := range got {
		if errs[i] != nil {
			t.Fatalf("#%d: %v", i, errs[i])
		}
		if seen[got[i]] {
			t.Fatalf("duplicate %s", got[i])
		}
		seen[got[i]] = true
	}
	for i := 1; i <= n; i++ {
		if !seen[fmt.Sprintf("RTR-PH-CEB-102926-%04d", i)] {
			t.Errorf("missing sequence %d", i)
		}
	}
}

type record struct {
	club, id uuid.UUID
}

// newRecord adds a club's record: unclaimed, or linked to player, with a private phone intake in the given state.
func newRecord(t testing.TB, pool *pgxpool.Pool, club uuid.UUID, name, phone, state string, addedAt time.Time, extra ...string) record {
	t.Helper()
	id := uuid.New()
	removed := "NULL"
	if len(extra) > 0 && extra[0] == "removed" {
		removed = "now()"
	}
	exec(t, pool, `INSERT INTO club_players (id, club_id, display_name, added_at, removed_at, updated_at) VALUES ($1, $2, $3, $4, `+removed+`, now())`, id, club, name, addedAt)
	if phone != "" {
		var resolvedBy any
		var resolvedAt any
		if state == "resolved" {
			resolvedBy, resolvedAt = newPlayer(t, pool), addedAt
		}
		exec(t, pool, `INSERT INTO club_player_private_inputs (club_player_id, club_id, phone_e164, captured_at, state, resolved_player_id, resolved_at, updated_at)
		  VALUES ($1, $2, $3, now(), $4::club_player_input_state, $5, $6, now())`, id, club, phone, state, resolvedBy, resolvedAt)
	}
	return record{club, id}
}

func recordState(t testing.TB, pool *pgxpool.Pool, r record) (player *uuid.UUID, revision int64, state string, resolvedPlayer *uuid.UUID, resolvedAt *time.Time) {
	t.Helper()
	if err := pool.QueryRow(ctx, `SELECT player_id, revision FROM club_players WHERE id = $1`, r.id).Scan(&player, &revision); err != nil {
		t.Fatal(err)
	}
	err := pool.QueryRow(ctx, `SELECT state::text, resolved_player_id, resolved_at FROM club_player_private_inputs WHERE club_player_id = $1`, r.id).Scan(&state, &resolvedPlayer, &resolvedAt)
	if err != nil {
		state = ""
	}
	return
}

// linkClubRecordsByPhone in identity.ts.
func TestLinkClubRecordsByPhone(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	loc := location(t, pool, "PH", "CEB")
	a, b, c, d := newClub(t, pool, "A", loc), newClub(t, pool, "B", loc), newClub(t, pool, "C", loc), newClub(t, pool, "D", loc)
	phone := "+639175550142"
	t0 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	aEarly := newRecord(t, pool, a, "Ana", phone, "pending", t0)
	aLater := newRecord(t, pool, a, "Ana R.", phone, "conflicted", t0.Add(time.Hour)) // one record per club: the earliest
	bOnly := newRecord(t, pool, b, "Ana B", phone, "conflicted", t0.Add(2*time.Hour))
	cRemoved := newRecord(t, pool, c, "Ana C", phone, "pending", t0, "removed")
	cOther := newRecord(t, pool, c, "Someone", "+639175550143", "pending", t0)
	dResolved := newRecord(t, pool, d, "Ana D", phone, "resolved", t0)
	dDiscarded := newRecord(t, pool, d, "Ana D2", phone, "discarded", t0)
	noInput := newRecord(t, pool, a, "No phone", "", "", t0)

	player := newPlayer(t, pool)
	now := time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	linked, err := identity.LinkClubRecordsByPhone(ctx, tx, player, phone, now)
	if err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if len(linked) != 2 || linked[0].ClubPlayerID != aEarly.id || linked[1].ClubPlayerID != bOnly.id || linked[0].ClubID != a || linked[1].ClubID != b {
		t.Fatalf("%+v", linked)
	}
	for _, r := range []record{aEarly, bOnly} {
		p, rev, state, rp, at := recordState(t, pool, r)
		if p == nil || *p != player || rev != 2 || state != "resolved" || rp == nil || *rp != player || at == nil || !at.Equal(now) {
			t.Errorf("linked record %v: %v %d %s %v %v", r.id, p, rev, state, rp, at)
		}
	}
	for name, r := range map[string]record{"second in a club": aLater, "removed": cRemoved, "other phone": cOther, "resolved": dResolved, "discarded": dDiscarded, "no input": noInput} {
		if p, rev, _, _, _ := recordState(t, pool, r); p != nil || rev != 1 {
			t.Errorf("%s must stay unlinked: %v %d", name, p, rev)
		}
	}
	if _, _, state, _, _ := recordState(t, pool, aLater); state != "conflicted" {
		t.Errorf("an unlinked record's intake is untouched: %s", state)
	}
}

// A club that already lists the player keeps that row: its other record with the phone is not linked.
func TestLinkClubRecordsByPhoneSkipsAClubThatAlreadyListsThePlayer(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	club := newClub(t, pool, "A", location(t, pool, "PH", "CEB"))
	player := newPlayer(t, pool)
	t0 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	listed := newRecord(t, pool, club, "Ana (already linked)", "", "", t0)
	exec(t, pool, `UPDATE club_players SET player_id = $1 WHERE id = $2`, player, listed.id)
	dup := newRecord(t, pool, club, "Ana", "+639175550142", "pending", t0)

	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	linked, err := identity.LinkClubRecordsByPhone(ctx, tx, player, "+639175550142", t0)
	if err != nil || len(linked) != 0 {
		t.Fatalf("%+v %v", linked, err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if p, _, state, _, _ := recordState(t, pool, dup); p != nil || state != "pending" {
		t.Fatalf("%v %s", p, state)
	}
}
