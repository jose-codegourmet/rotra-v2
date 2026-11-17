package main

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func only(t *testing.T, ids []uuid.UUID, want uuid.UUID) {
	t.Helper()
	if len(ids) != 1 || ids[0] != want {
		t.Fatalf("ids %v, want [%s]", ids, want)
	}
}

// Banned and soft-deleted Supabase users import as disabled identities (disabled_at set).
func TestDisabledSupabaseUsersImportDisabled(t *testing.T) {
	f := newFx(t)
	f.admin(t, f.user(t, "banned@rotra.club", banned(base.Add(24*time.Hour))))
	f.player(t, "gone@example.com", f.user(t, "gone@example.com", deleted(base.Add(-time.Hour))))
	f.player(t, "ok@example.com", f.user(t, "ok@example.com"))

	r := mustImport(t, f, false)

	if r.Types[store.AudienceAdmin].Disabled != 1 || r.Types[store.AudiencePlayer].Disabled != 1 || r.Types[store.AudiencePlayer].Imported != 2 {
		t.Fatalf("counts: admin %+v player %+v", r.Types["admin"], r.Types["player"])
	}
	for _, k := range []struct{ aud, key string }{{"admin", "banned@rotra.club"}, {"player", "gone@example.com"}} {
		got := f.identityFor(t, k.aud, k.key)
		if got.disabled == nil || !got.disabled.Equal(base) {
			t.Fatalf("%s identity disabled_at = %v, want %v", k.aud, got.disabled, base)
		}
	}
	if f.identityFor(t, "player", "ok@example.com").disabled != nil {
		t.Fatal("an ordinary user was imported disabled")
	}
}

// A ban that already ended does not disable the identity.
func TestExpiredBanDoesNotDisable(t *testing.T) {
	f := newFx(t)
	f.admin(t, f.user(t, "owner@rotra.club", banned(base.Add(-time.Minute))))

	r := mustImport(t, f, false)

	if r.Types[store.AudienceAdmin].Disabled != 0 || f.identityFor(t, "admin", "owner@rotra.club").disabled != nil {
		t.Fatal("an ended ban disabled the identity")
	}
}

// Anything that is not a bcrypt $2a/$2b/$2y hash is refused, counted and reported, never imported.
func TestNonBcryptHashesAreRefused(t *testing.T) {
	f := newFx(t)
	good := bcryptHash(t, goodPass)
	cases := map[string]any{
		"empty":     "",
		"null":      (*string)(nil), // typed, so the fixture stores NULL
		"argon2":    argonHash(t),
		"plaintext": goodPass,
		"2x":        "$2x" + good[3:],
		"short":     good[:40],
		"badcost":   "$2a$99" + good[6:],
	}
	ids := map[string]uuid.UUID{}
	for name, h := range cases {
		ids[name] = f.admin(t, f.user(t, name+"@rotra.club", withHash(h)))
	}
	okAdmin := f.admin(t, f.user(t, "good@rotra.club"))
	for _, prefix := range []string{"$2a", "$2b", "$2y"} {
		f.admin(t, f.user(t, "prefix"+prefix[2:]+"@rotra.club", withHash(prefix+good[3:])))
	}

	r := mustImport(t, f, false)

	c := r.Types[store.AudienceAdmin]
	if len(c.Skipped[skipBadHash]) != len(cases) || c.Imported != 4 {
		t.Fatalf("admin counts: imported %d, bad_hash %d of %d: %+v", c.Imported, len(c.Skipped[skipBadHash]), len(cases), c)
	}
	for name, id := range ids {
		if acc := f.accountOf(t, "admin_accounts", "id", id); acc.provider != "supabase" {
			t.Fatalf("%s was re-pointed", name)
		}
	}
	if acc := f.accountOf(t, "admin_accounts", "id", okAdmin); acc.provider != "rotra" {
		t.Fatal("the good account was not imported")
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities WHERE password_scheme <> 'bcrypt'`); n != 0 {
		t.Fatalf("%d non-bcrypt identities", n)
	}
}

// Two Supabase users that resolve to one login key in one audience: both are skipped and reported.
func TestDuplicateLoginKeysSkipBoth(t *testing.T) {
	f := newFx(t)
	a := f.player(t, "dup@example.com", f.user(t, "Dup@Example.com"))
	b := f.player(t, "dup2@example.com", f.user(t, " dup@example.com "))
	ok := f.player(t, "fine@example.com", f.user(t, "fine@example.com"))
	// The same key in another audience is not a duplicate.
	adm := f.admin(t, f.user(t, "dup@example.com"))

	r := mustImport(t, f, false)

	c := r.Types[store.AudiencePlayer]
	if got := c.Skipped[skipDuplicateKey]; len(got) != 2 || (got[0] != a || got[1] != b) && (got[0] != b || got[1] != a) {
		t.Fatalf("duplicate ids: %v", got)
	}
	if c.Imported != 1 || f.accountOf(t, "player_accounts", "player_id", ok).provider != "rotra" {
		t.Fatalf("the unique player was not imported: %+v", c)
	}
	if f.accountOf(t, "admin_accounts", "id", adm).provider != "rotra" {
		t.Fatal("an admin with the same email was held back")
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities WHERE audience = 'player' AND login_key = 'dup@example.com'`); n != 0 {
		t.Fatal("a duplicate key was guessed")
	}
}

// A duplicate is a duplicate even when one of the two has a bad hash: no guessing.
func TestDuplicateWinsOverBadHash(t *testing.T) {
	f := newFx(t)
	a := f.admin(t, f.user(t, "dup@rotra.club"))
	b := f.admin(t, f.user(t, "DUP@rotra.club", withHash("nope")))

	r := mustImport(t, f, false)

	c := r.Types[store.AudienceAdmin]
	if len(c.Skipped[skipDuplicateKey]) != 2 || len(c.Skipped[skipBadHash]) != 0 || c.Imported != 0 {
		t.Fatalf("counts: %+v (%s %s)", c, a, b)
	}
}

// A player whose contact email differs from the Supabase email is imported on the Supabase email (it is the
// login that works today) and reported; nothing is guessed from the contact.
func TestPlayerEmailMismatchIsReportedNotGuessed(t *testing.T) {
	f := newFx(t)
	p := f.player(t, "new-address@example.com", f.user(t, "old-address@example.com"))
	f.player(t, "same@example.com", f.user(t, " Same@Example.com"))

	r := mustImport(t, f, false)

	c := r.Types[store.AudiencePlayer]
	only(t, c.Mismatch, p)
	if c.Imported != 2 {
		t.Fatalf("counts: %+v", c)
	}
	f.identityFor(t, "player", "old-address@example.com")
	if n := f.count(t, `SELECT count(*) FROM auth_identities WHERE login_key = 'new-address@example.com'`); n != 0 {
		t.Fatal("the contact email became a login key")
	}
	if !strings.Contains(f.logs.String(), p.String()) {
		t.Fatalf("the mismatch is not logged with the player id: %q", f.logs.String())
	}
}

// Accounts the import cannot resolve are reported by id and left on supabase.
func TestUnresolvableAccountsAreReported(t *testing.T) {
	f := newFx(t)
	missing := f.admin(t, uuid.New())                       // no such Supabase user
	noEmail := f.admin(t, f.user(t, "", withEmail(nil)))    // user without an email
	blank := f.player(t, "x@example.com", f.user(t, "   ")) // blank email
	unprovisioned := f.club(t, "never_provisioned", nil)    // club with no Supabase user yet
	f.admin(t, f.user(t, "fine@rotra.club"))

	r := mustImport(t, f, false)

	only(t, r.Types[store.AudienceAdmin].Skipped[skipNoSourceUser], missing)
	only(t, r.Types[store.AudienceAdmin].Skipped[skipNoLoginKey], noEmail)
	only(t, r.Types[store.AudiencePlayer].Skipped[skipNoLoginKey], blank)
	only(t, r.Types[store.AudienceClub].Skipped[skipNoSubject], unprovisioned)
	if r.Types[store.AudienceAdmin].Imported != 1 {
		t.Fatalf("admin counts: %+v", r.Types[store.AudienceAdmin])
	}
	for _, id := range []uuid.UUID{missing, noEmail} {
		if f.accountOf(t, "admin_accounts", "id", id).provider != "supabase" {
			t.Fatal("an unresolvable account was re-pointed")
		}
	}
}

// One bad account does not stop the others (one transaction per account), and the log names the account
// and the error class, never the data.
func TestOneFailureDoesNotStopTheRest(t *testing.T) {
	f := newFx(t)
	f.execOn(t, f.target, `ALTER TABLE auth_identities ADD CONSTRAINT boom CHECK (login_key <> 'boom@rotra.club')`)
	bad := f.admin(t, f.user(t, "boom@rotra.club"))
	f.admin(t, f.user(t, "fine@rotra.club"))

	r := mustImport(t, f, false)

	only(t, r.Types[store.AudienceAdmin].Skipped[skipFailed], bad)
	if r.Failed() != 1 || r.Types[store.AudienceAdmin].Imported != 1 {
		t.Fatalf("report: %+v", r.Types)
	}
	if f.accountOf(t, "admin_accounts", "id", bad).provider != "supabase" {
		t.Fatal("a failed account was re-pointed")
	}
	logs := f.logs.String()
	if !strings.Contains(logs, bad.String()) || !strings.Contains(logs, "23514") || strings.Contains(logs, "boom@") {
		t.Fatalf("log: %q", logs)
	}
}

// An account that moved on while the import ran is skipped, not overwritten.
func TestAccountChangedDuringTheImportIsSkipped(t *testing.T) {
	f := newFx(t)
	id := f.admin(t, f.user(t, "owner@rotra.club"))
	im := f.importer()
	stale := account{kind: store.AudienceAdmin, id: id, subject: uuid.New()} // another subject than the row's

	err := im.importOne(f.ctx, stale, "owner@rotra.club", bcryptHash(t, goodPass), false, base, false)

	if !errors.Is(err, errChanged) {
		t.Fatalf("err %v, want errChanged", err)
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities`); n != 0 {
		t.Fatal("the identity of a skipped account was kept")
	}
	if got := errClass(errors.New("anything with a@b.c in it")); got != "other" {
		t.Fatalf("errClass %q", got)
	}
}

// A database that cannot be read stops the run instead of reporting an empty import.
func TestUnreadableDatabasesStopTheRun(t *testing.T) {
	for _, closeWhich := range []string{"source", "target"} {
		f := newFx(t)
		f.admin(t, f.user(t, "owner@rotra.club"))
		im := f.importer()
		if closeWhich == "source" {
			f.source.Close()
		} else {
			f.target.Close()
		}
		if _, err := im.Import(f.ctx, false); err == nil {
			t.Fatalf("closed %s: want an error", closeWhich)
		}
		if closeWhich == "target" {
			if _, err := im.Verify(f.ctx); err == nil {
				t.Fatal("verify on a closed target: want an error")
			}
		}
	}
}
