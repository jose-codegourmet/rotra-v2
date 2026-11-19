package clubjoin_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/clubjoin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

func TestMain(m *testing.M) { testpg.Main(m) }

var ctx = context.Background()

func id(u uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: u, Valid: true} }

func isNotFound(err error, field string) bool {
	var e *writes.Error
	return errors.As(err, &e) && e.Code == httpapi.ErrNotFound && (field == "" || e.Fields[field] != "")
}

// requireClubInvite: the club whose current code this is; a bad club id, a code that cannot be stored, a wrong or another
// club's code and an unknown club are the same refusal.
func TestRequireInvite(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	q := sqlcgen.New(pool)
	club, other := uuid.New(), uuid.New()
	for c, code := range map[uuid.UUID]string{club: "BIRDIE2026", other: "OTHERCODE9"} {
		if _, err := pool.Exec(ctx, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, invite_code, updated_at)
			VALUES ($1, $2, $2, (SELECT id FROM location_codes LIMIT 1), 'x', 'free', $3, $4, now())`, c, "Club "+code, uuid.New(), code); err != nil {
			t.Fatal(err)
		}
	}
	got, err := clubjoin.RequireInvite(ctx, q, club.String(), "  birdie2026\t")
	if err != nil || got.Name != "Club BIRDIE2026" || got.ID != id(club) {
		t.Fatalf("%+v %v", got, err)
	}
	if _, err := clubjoin.RequireInvite(ctx, q, club.String(), "OTHERCODE9"); !isNotFound(err, "club") {
		t.Fatalf("another club's code: %v", err)
	}
	for _, c := range []struct{ club, code string }{
		{club.String(), ""}, {club.String(), "SHORT"}, {"birdie", "BIRDIE2026"}, {uuid.New().String(), "BIRDIE2026"}, {"{" + club.String() + "}", "BIRDIE2026"},
	} {
		if _, err := clubjoin.RequireInvite(ctx, q, c.club, c.code); !isNotFound(err, "club") {
			t.Fatalf("%+v: %v", c, err)
		}
	}
}

// joinInTransaction: a new row under the player's name and nickname; a second join is a no-op; a row the player left comes
// back; an unknown club and an unknown player are refused.
func TestAddToClub(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 4)
	q := sqlcgen.New(pool)
	club, player := uuid.New(), uuid.New()
	if _, err := pool.Exec(ctx, `INSERT INTO clubs (id, name, name_key, founding_location_code_id, founding_address, license_pricing, source_command_id, updated_at)
		VALUES ($1, 'Club', 'club', (SELECT id FROM location_codes LIMIT 1), 'x', 'free', $2, now())`, club, uuid.New()); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO players (id, full_name, nickname, updated_at) VALUES ($1, 'Pat Lim', 'Patty', now())`, player); err != nil {
		t.Fatal(err)
	}
	at := pgtype.Timestamptz{Time: time.Date(2026, 11, 20, 4, 0, 0, 0, time.UTC), Valid: true}
	if err := clubjoin.AddToClub(ctx, q, at, id(player), id(club)); err != nil {
		t.Fatal(err)
	}
	if err := clubjoin.AddToClub(ctx, q, at, id(player), id(club)); err != nil {
		t.Fatalf("second join: %v", err)
	}
	var name, nick string
	var n int
	if err := pool.QueryRow(ctx, `SELECT count(*), max(display_name), max(nickname) FROM club_players WHERE club_id = $1 AND player_id = $2`, club, player).Scan(&n, &name, &nick); err != nil || n != 1 || name != "Pat Lim" || nick != "Patty" {
		t.Fatalf("%d %q %q %v", n, name, nick, err)
	}
	if _, err := pool.Exec(ctx, `UPDATE club_players SET removed_at = now() WHERE club_id = $1`, club); err != nil {
		t.Fatal(err)
	}
	if err := clubjoin.AddToClub(ctx, q, at, id(player), id(club)); err != nil {
		t.Fatal(err)
	}
	var left int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM club_players WHERE club_id = $1 AND removed_at IS NULL AND revision = 2`, club).Scan(&left); err != nil || left != 1 {
		t.Fatalf("the left row did not come back: %d %v", left, err)
	}
	if err := clubjoin.AddToClub(ctx, q, at, id(player), id(uuid.New())); !isNotFound(err, "club") {
		t.Fatalf("unknown club: %v", err)
	}
	var e *writes.Error
	if err := clubjoin.AddToClub(ctx, q, at, id(uuid.New()), id(club)); !errors.As(err, &e) || e.Code != httpapi.ErrForbidden {
		t.Fatalf("unknown player: %v", err)
	}
}

func TestParseUUID(t *testing.T) {
	u := uuid.New()
	for _, s := range []string{u.String(), "C9000000-0000-4000-8000-000000000002"} {
		if _, ok := clubjoin.ParseUUID(s); !ok {
			t.Errorf("%q should parse", s)
		}
	}
	for _, s := range []string{"", "x", u.String() + " ", " " + u.String(), "{" + u.String() + "}", u.String()[1:] + "0", "c9000000_0000-4000-8000-000000000002", "g9000000-0000-4000-8000-000000000002"} {
		if _, ok := clubjoin.ParseUUID(s); ok {
			t.Errorf("%q should not parse", s)
		}
	}
}
