package identity_test

import (
	"testing"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

// normalizeEmail (shared-entry.ts): trimmed, lower-cased like JavaScript, and /^[^@\s]+@[^@\s]+$/.
func TestNormalizeEmail(t *testing.T) {
	for typed, want := range map[string]string{
		"  Shared@Example.TEST \t": "shared@example.test",
		"a@b":                      "a@b", // no dot needed: only the shape is checked
		"İ@x.test":                 "i̇@x.test",
	} {
		if got, ok := identity.NormalizeEmail(typed); !ok || got != want {
			t.Errorf("%q: %q %v, want %q", typed, got, ok, want)
		}
	}
	for _, typed := range []string{"", "   ", "nobody", "@x", "x@", "a@b@c", "a b@c", "a@b c", "a\u00a0b@c", "a@b\u2028c"} {
		if got, ok := identity.NormalizeEmail(typed); ok {
			t.Errorf("%q is %q, want none", typed, got)
		}
	}
}

// adoptEntryAllocation: the open entry's RTR ID is copied; one that is some other player's is not, and the player gets a new
// one; a retry by the player who holds it keeps it. claimSharedEntry: the entry is claimed once and its records join once.
func TestSharedEntryAdoptAndClaim(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	ceb := location(t, pool, "PH", "CEB")
	smash := newClub(t, pool, "Smash", ceb)
	ninja := newClub(t, pool, "Ninja", ceb)
	exec(t, pool, `INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES ($1, DATE '2026-10-29', 41)`, ceb)
	entry := uuid.New()
	exec(t, pool, `INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, created_at, updated_at)
		VALUES ($1, 'shared@example.test', 'RTR-PH-CEB-102926-0041', $2, $3, 'PH', 'CEB', DATE '2026-10-29', 41, now(), now(), now())`, entry, smash, ceb)
	for _, club := range []uuid.UUID{smash, ninja} {
		exec(t, pool, `INSERT INTO club_players (id, club_id, display_name, nickname, shared_entry_id, added_at, updated_at) VALUES ($1, $2, 'Shared', 'Shary', $3, now(), now())`, uuid.New(), club, entry)
	}
	player := newPlayer(t, pool)

	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	rtr, err := identity.AllocateRTRIDFor(ctx, tx, player, smash, noon, "nobody", "Shared@Example.test")
	if err != nil || rtr != "RTR-PH-CEB-102926-0041" {
		t.Fatalf("adopt: %q %v", rtr, err)
	}
	// Again, by the same player: the allocation is theirs, so the entry's ID is still their ID.
	if again, err := identity.AllocateRTRIDFor(ctx, tx, player, smash, noon, "shared@example.test"); err != nil || again != rtr {
		t.Fatalf("retry: %q %v", again, err)
	}
	linked, err := identity.ClaimSharedEntry(ctx, tx, player, []string{"shared@example.test"}, noon)
	if err != nil || len(linked) != 2 {
		t.Fatalf("claim: %v %v", linked, err)
	}
	// Repeat-safe: the entry is found by its claimer and its records are already linked.
	if linked, err = identity.ClaimSharedEntry(ctx, tx, player, []string{"shared@example.test"}, noon); err != nil || len(linked) != 0 {
		t.Fatalf("second claim: %v %v", linked, err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	var email *string
	var claimed uuid.UUID
	var revision int64
	if err := pool.QueryRow(ctx, `SELECT email, claimed_player_id, revision FROM shared_player_entries WHERE id = $1`, entry).Scan(&email, &claimed, &revision); err != nil {
		t.Fatal(err)
	}
	if email != nil || claimed != player || revision != 2 {
		t.Fatalf("entry: %v %v %d", email, claimed, revision)
	}
	var n int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM club_players WHERE player_id = $1 AND nickname IS NULL AND revision = 2`, player).Scan(&n); err != nil || n != 2 {
		t.Fatalf("linked records: %d %v", n, err)
	}

	// A second person with the same (now claimed) email finds no open entry: a new RTR ID.
	other := newPlayer(t, pool)
	tx2, _ := pool.Begin(ctx)
	got, err := identity.AllocateRTRIDFor(ctx, tx2, other, smash, noon, "shared@example.test")
	_ = tx2.Commit(ctx)
	if err != nil || got == "RTR-PH-CEB-102926-0041" {
		t.Fatalf("a claimed entry is not adopted: %q %v", got, err)
	}
}

// An entry whose RTR ID is some other player's allocation is not adopted (adoptEntryAllocation returns null at once): the
// player gets a new number and the entry stays open.
func TestSharedEntryWithATakenRTRIDIsNotAdopted(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	ceb := location(t, pool, "PH", "CEB")
	smash := newClub(t, pool, "Smash", ceb)
	exec(t, pool, `INSERT INTO player_id_counters (location_code_id, sync_date, last_sequence) VALUES ($1, DATE '2026-10-29', 41)`, ceb)
	holder := newPlayer(t, pool)
	exec(t, pool, `INSERT INTO player_id_allocations (player_id, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence) VALUES ($1, 'RTR-PH-CEB-102926-0041', $2, $3, 'PH', 'CEB', DATE '2026-10-29', 41)`, holder, smash, ceb)
	exec(t, pool, `INSERT INTO shared_player_entries (id, email, rtr_id, creating_club_id, location_code_id, country_code, city_code, sync_date, sequence, allocated_at, created_at, updated_at)
		VALUES ($1, 'shared@example.test', 'RTR-PH-CEB-102926-0041', $2, $3, 'PH', 'CEB', DATE '2026-10-29', 41, now(), now(), now())`, uuid.New(), smash, ceb)
	player := newPlayer(t, pool)
	tx, _ := pool.Begin(ctx)
	got, err := identity.AllocateRTRIDFor(ctx, tx, player, smash, noon, "shared@example.test")
	_ = tx.Commit(ctx)
	if err != nil || got != "RTR-PH-CEB-102926-0042" {
		t.Fatalf("%q %v", got, err)
	}
}
