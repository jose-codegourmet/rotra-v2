package main

import (
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func mustImport(t *testing.T, f *fx, dryRun bool) *Report {
	t.Helper()
	r, err := f.importer().Import(f.ctx, dryRun)
	if err != nil {
		t.Fatalf("import: %v", err)
	}
	return r
}

// Club: the login key is the club username (normalized), never the @clubs.rotra.invalid email.
func TestImportClubUsesTheUsernameNotTheProviderEmail(t *testing.T) {
	f := newFx(t)
	u := f.user(t, "smash_club@clubs.rotra.invalid")
	club := f.club(t, "smash_club", u)

	r := mustImport(t, f, false)

	if c := r.Types[store.AudienceClub]; c.Pending != 1 || c.Imported != 1 || c.SkippedTotal() != 0 {
		t.Fatalf("club counts: %+v", c)
	}
	ident := f.identityFor(t, "club", "smash_club")
	if ident.scheme != "bcrypt" || !strings.HasPrefix(ident.hash, "$2") {
		t.Fatalf("scheme %q hash prefix", ident.scheme)
	}
	acc := f.accountOf(t, "club_accounts", "club_id", club)
	if acc.provider != "rotra" || acc.subject != ident.id {
		t.Fatalf("account not re-pointed: %+v want identity %s", acc, ident.id)
	}
	if ident.id == u {
		t.Fatal("the identity must get a new id, not the Supabase id")
	}
	if ident.id.Version() != 7 {
		t.Fatalf("identity id version %d, want 7", ident.id.Version())
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities WHERE login_key LIKE '%invalid%'`); n != 0 {
		t.Fatal("the provider email must not become a login key")
	}
}

// Player: the login key is the lowercased, trimmed auth.users email.
func TestImportPlayerUsesTheNormalizedSupabaseEmail(t *testing.T) {
	f := newFx(t)
	u := f.user(t, "  Ana@Example.COM ")
	p := f.player(t, "ana@example.com", u)

	r := mustImport(t, f, false)

	if c := r.Types[store.AudiencePlayer]; c.Imported != 1 || len(c.Mismatch) != 0 {
		t.Fatalf("player counts: %+v", c)
	}
	ident := f.identityFor(t, "player", "ana@example.com")
	acc := f.accountOf(t, "player_accounts", "player_id", p)
	if acc.provider != "rotra" || acc.subject != ident.id {
		t.Fatalf("account not re-pointed: %+v", acc)
	}
}

// Admin: audience admin, login key is the lowercased email.
func TestImportAdminUsesTheLowercasedEmail(t *testing.T) {
	f := newFx(t)
	u := f.user(t, "Owner@Rotra.club")
	a := f.admin(t, u)

	r := mustImport(t, f, false)

	if c := r.Types[store.AudienceAdmin]; c.Pending != 1 || c.Imported != 1 {
		t.Fatalf("admin counts: %+v", c)
	}
	ident := f.identityFor(t, "admin", "owner@rotra.club")
	acc := f.accountOf(t, "admin_accounts", "id", a)
	if acc.provider != "rotra" || acc.subject != ident.id {
		t.Fatalf("account not re-pointed: %+v", acc)
	}
}

// The existing bcrypt hash is copied verbatim (no password reset needed).
func TestImportCopiesTheExistingBcryptHash(t *testing.T) {
	f := newFx(t)
	hash := bcryptHash(t, goodPass)
	u := f.user(t, "owner@rotra.club", withHash(hash))
	f.admin(t, u)

	mustImport(t, f, false)

	if got := f.identityFor(t, "admin", "owner@rotra.club").hash; got != hash {
		t.Fatal("the hash was altered")
	}
}

// Accounts already on rotra, and other providers, are not touched.
func TestImportLeavesRotraAccountsAlone(t *testing.T) {
	f := newFx(t)
	u := f.user(t, "owner@rotra.club")
	a := f.admin(t, u)
	f.execOn(t, f.target, `UPDATE admin_accounts SET auth_provider = 'rotra' WHERE id = $1`, a)

	r := mustImport(t, f, false)

	if c := r.Types[store.AudienceAdmin]; c.Pending != 0 || c.Imported != 0 {
		t.Fatalf("counts: %+v", c)
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities`); n != 0 {
		t.Fatalf("%d identities, want 0", n)
	}
}

// A mixed run imports every type in one pass.
func TestImportAllTypesTogether(t *testing.T) {
	f := newFx(t)
	f.club(t, "club_a", f.user(t, "club_a@clubs.rotra.invalid"))
	f.club(t, "club_b", f.user(t, "club_b@clubs.rotra.invalid"))
	f.player(t, "p@example.com", f.user(t, "p@example.com"))
	f.admin(t, f.user(t, "a@rotra.club"))

	r := mustImport(t, f, false)

	if r.Types[store.AudienceClub].Imported != 2 || r.Types[store.AudiencePlayer].Imported != 1 || r.Types[store.AudienceAdmin].Imported != 1 {
		t.Fatalf("report: %+v %+v %+v", r.Types["club"], r.Types["player"], r.Types["admin"])
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities`); n != 4 {
		t.Fatalf("%d identities, want 4", n)
	}
	for _, table := range []string{"club_accounts", "player_accounts", "admin_accounts"} {
		if n := f.count(t, `SELECT count(*) FROM `+table+` WHERE auth_provider = 'supabase'`); n != 0 {
			t.Fatalf("%s still has %d supabase rows", table, n)
		}
	}
}
