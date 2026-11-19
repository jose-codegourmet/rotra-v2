package contactwrites_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/contactwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

func TestMain(m *testing.M) { testpg.Main(m) }

const (
	ann    = "d4000000-0000-4000-8000-000000000001"
	ben    = "d4000000-0000-4000-8000-000000000002"
	nobody = "d4000000-0000-4000-8000-000000000003"
	admin  = "ad000000-0000-4000-8000-000000000001"
)

func id(t *testing.T, s string) pgtype.UUID {
	t.Helper()
	var u pgtype.UUID
	if err := u.Scan(s); err != nil {
		t.Fatal(err)
	}
	return u
}

func command(n string) pgtype.UUID {
	var u pgtype.UUID
	_ = u.Scan("c5000000-0000-4000-8000-00000000000" + n)
	return u
}

// Submit is the one `submit` the Player's own request and the owner's request share: the same checks, the same words except
// who is named, and the source and the admin on the row.
func TestSubmit(t *testing.T) {
	pool := testpg.NewMigratedPool(t, 5)
	ctx := context.Background()
	conn, err := pool.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, stmt := range []string{
		`SET session_replication_role = replica`,
		`INSERT INTO players (id, full_name, profile_state, updated_at) VALUES ('` + ann + `', 'Ann', 'claimed', now()), ('` + ben + `', 'Ben', 'claimed', now()), ('` + nobody + `', 'Nobody', 'claimed', now())`,
		`INSERT INTO player_private_contacts (player_id, phone_e164, email, updated_at) VALUES ('` + ann + `', '+639175550001', 'ann@example.test', now()), ('` + ben + `', '+639175550002', 'ben@example.test', now())`,
		`INSERT INTO admin_accounts (id, auth_provider, auth_subject, active, display_name, updated_at) VALUES ('` + admin + `', 'rotra', 'ad100000-0000-4000-8000-000000000001', true, 'Owner', now())`,
		`SET session_replication_role = DEFAULT`,
	} {
		if _, err := conn.Exec(ctx, stmt); err != nil {
			t.Fatalf("%s: %v", stmt, err)
		}
	}
	conn.Release()
	q := sqlcgen.New(pool)
	now := pgtype.Timestamptz{Time: time.Date(2026, 11, 20, 4, 0, 0, 0, time.UTC), Valid: true}
	own, owner := contactwrites.Source{}, contactwrites.Source{Owner: true, Admin: id(t, admin)}

	want := func(name string, err error, code, field, message string) {
		t.Helper()
		var we *writes.Error
		if !errors.As(err, &we) || string(we.Code) != code || (field != "" && we.Fields[field] != message) {
			t.Errorf("%s: %v (fields %v), want %s %q", name, err, func() map[string]string {
				if we != nil {
					return we.Fields
				}
				return nil
			}(), code, message)
		}
	}
	// A request of the player's own: source app, no admin, the original value kept.
	r, err := contactwrites.Submit(ctx, q, now, id(t, ann), command("1"), "phone", " +639175550099 ", own)
	if err != nil || r.Source != sqlcgen.ContactChangeSourceApp || r.SubmittedByAdminID.Valid || r.ProposedValue != "+639175550099" || r.OriginalValue.String != "+639175550001" {
		t.Fatalf("own phone request: %+v %v", r, err)
	}
	// The same command answers the same request, whatever it asks now; another player's command is not found.
	again, err := contactwrites.Submit(ctx, q, now, id(t, ann), command("1"), "email", "nope", own)
	if err != nil || again.ID != r.ID {
		t.Errorf("repeat: %+v %v", again, err)
	}
	_, err = contactwrites.Submit(ctx, q, now, id(t, ben), command("1"), "email", "ben.new@example.test", own)
	want("another player's command", err, "not_found", "", "")
	// The owner's request names the player, and records who entered it.
	r, err = contactwrites.Submit(ctx, q, now, id(t, ben), command("2"), "email", "Ben.New@Example.TEST", owner)
	if err != nil || r.Source != sqlcgen.ContactChangeSourceOwner || r.SubmittedByAdminID != owner.Admin || r.ProposedValue != "ben.new@example.test" {
		t.Fatalf("owner email request: %+v %v", r, err)
	}
	_, err = contactwrites.Submit(ctx, q, now, id(t, ann), command("3"), "email", "ANN@example.test", own)
	want("same as now, own", err, "invalid", "value", "That's already your email.")
	_, err = contactwrites.Submit(ctx, q, now, id(t, ann), command("3"), "phone", "+639175550001", owner)
	want("same as now, owner", err, "invalid", "value", "That's already this player's phone number.")
	_, err = contactwrites.Submit(ctx, q, now, id(t, ann), command("3"), "email", "ben@example.test", own)
	want("taken, own", err, "conflict", "value", "That email belongs to another ROTRA profile. Contact ROTRA for help.")
	_, err = contactwrites.Submit(ctx, q, now, id(t, ann), command("3"), "phone", "+639175550002", owner)
	want("taken, owner", err, "conflict", "value", "That phone number belongs to another ROTRA profile.")
	_, err = contactwrites.Submit(ctx, q, now, id(t, ann), command("3"), "phone", "0917 555 0142", own)
	want("phone not E.164", err, "invalid", "value", "Enter a Philippine mobile number, like 0917 555 0142.")
	_, err = contactwrites.Submit(ctx, q, now, id(t, ann), command("3"), "email", "nope", own)
	want("email not an address", err, "invalid", "value", "Enter an email address, like name@example.com.")
	_, err = contactwrites.Submit(ctx, q, now, id(t, nobody), command("4"), "email", "x@example.test", own)
	want("no contact row", err, "not_found", "", "")
	// A value another player has is not "collides" for their own contact, and Collides says so.
	if taken, err := contactwrites.Collides(ctx, q, id(t, ann), sqlcgen.ContactChangeFieldEmail, "ann@example.test"); err != nil || taken {
		t.Errorf("own value: %v %v", taken, err)
	}
	if taken, err := contactwrites.Collides(ctx, q, id(t, ann), sqlcgen.ContactChangeFieldPhone, "+639175550002"); err != nil || !taken {
		t.Errorf("another's value: %v %v", taken, err)
	}
	// A unique violation is "a contact change is already open"; anything else goes on.
	_, err = contactwrites.Submit(ctx, q, now, id(t, ann), command("5"), "email", "ann.second@example.test", own)
	want("one in flight per player", contactwrites.MapOpen(err), "conflict", "request", "A contact change is already open.")
	other := errors.New("boom")
	var we *writes.Error
	if contactwrites.MapOpen(other) != other || errors.As(contactwrites.MapOpen(&pgconn.PgError{Code: "23503"}), &we) {
		t.Error("MapOpen only maps a unique violation")
	}
}
