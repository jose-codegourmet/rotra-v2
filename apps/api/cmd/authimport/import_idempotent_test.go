package main

import (
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// argonHash is a real argon2id hash, built at test time (no hash literal is committed).
func argonHash(t *testing.T) string {
	t.Helper()
	h, err := password.Params{MemoryKiB: 8 * 1024, Iterations: 1, Parallelism: 1, SaltLen: 16, KeyLen: 32}.Hash(goodPass)
	if err != nil {
		t.Fatal(err)
	}
	return h
}

// A second run finds nothing to do and changes nothing.
func TestImportTwiceDoesNotDuplicate(t *testing.T) {
	f := newFx(t)
	f.club(t, "club_a", f.user(t, "club_a@clubs.rotra.invalid"))
	f.player(t, "p@example.com", f.user(t, "p@example.com"))
	f.admin(t, f.user(t, "a@rotra.club"))
	mustImport(t, f, false)
	var before string
	if err := f.target.QueryRow(f.ctx, `SELECT string_agg(id::text || login_key || password_hash, ',' ORDER BY id) FROM auth_identities`).Scan(&before); err != nil {
		t.Fatal(err)
	}

	r := mustImport(t, f, false)

	for _, k := range kinds {
		if c := r.Types[k]; c.Pending != 0 || c.Imported != 0 || c.SkippedTotal() != 0 {
			t.Fatalf("%s counts on rerun: %+v", k, c)
		}
	}
	var after string
	if err := f.target.QueryRow(f.ctx, `SELECT string_agg(id::text || login_key || password_hash, ',' ORDER BY id) FROM auth_identities`).Scan(&after); err != nil {
		t.Fatal(err)
	}
	if before != after || f.count(t, `SELECT count(*) FROM auth_identities`) != 3 {
		t.Fatal("the rerun changed or added identities")
	}
}

// A password the Go sign-in already set (the first sign-in rehashed it) is never put back to bcrypt.
func TestRerunKeepsAGoSetPassword(t *testing.T) {
	f := newFx(t)
	goSetHash := argonHash(t)
	f.admin(t, f.user(t, "owner@rotra.club"))
	mustImport(t, f, false)
	f.execOn(t, f.target, `UPDATE auth_identities SET password_hash = $1, password_scheme = 'argon2id' WHERE audience = 'admin'`, goSetHash)

	mustImport(t, f, false)

	if got := f.identityFor(t, "admin", "owner@rotra.club"); got.hash != goSetHash || got.scheme != "argon2id" {
		t.Fatalf("the Go-set password was overwritten: %q %q", got.hash, got.scheme)
	}
}

// An identity with that login key already exists while the account is still on supabase: the import skips
// the account and leaves the existing identity alone.
func TestImportNeverOverwritesAnExistingIdentity(t *testing.T) {
	f := newFx(t)
	goSetHash := argonHash(t)
	a := f.admin(t, f.user(t, "owner@rotra.club"))
	f.execOn(t, f.target, `INSERT INTO auth_identities (id, audience, login_key, password_hash, password_scheme, password_changed_at)
	  VALUES (gen_random_uuid(), 'admin', 'owner@rotra.club', $1, 'argon2id', now())`, goSetHash)

	r := mustImport(t, f, false)

	c := r.Types[store.AudienceAdmin]
	if c.Imported != 0 || len(c.Skipped[skipKeyTaken]) != 1 || c.Skipped[skipKeyTaken][0] != a {
		t.Fatalf("counts: %+v", c)
	}
	if got := f.identityFor(t, "admin", "owner@rotra.club"); got.hash != goSetHash {
		t.Fatal("the existing identity was touched")
	}
	if acc := f.accountOf(t, "admin_accounts", "id", a); acc.provider != "supabase" {
		t.Fatalf("account re-pointed: %+v", acc)
	}
}

// Dry run reports what would happen and writes nothing.
func TestDryRunWritesNothing(t *testing.T) {
	f := newFx(t)
	club := f.club(t, "club_a", f.user(t, "club_a@clubs.rotra.invalid"))
	f.club(t, "club_b", f.user(t, "club_b@clubs.rotra.invalid"))
	f.player(t, "p@example.com", f.user(t, "p@example.com"))
	f.admin(t, f.user(t, "a@rotra.club"))

	r := mustImport(t, f, true)

	if !r.DryRun || r.Types[store.AudienceClub].Pending != 2 || r.Types[store.AudienceClub].Imported != 2 ||
		r.Types[store.AudiencePlayer].Imported != 1 || r.Types[store.AudienceAdmin].Imported != 1 {
		t.Fatalf("dry-run counts: %+v", r.Types)
	}
	if n := f.count(t, `SELECT count(*) FROM auth_identities`); n != 0 {
		t.Fatalf("dry run wrote %d identities", n)
	}
	if acc := f.accountOf(t, "club_accounts", "club_id", club); acc.provider != "supabase" {
		t.Fatalf("dry run re-pointed an account: %+v", acc)
	}
	// And the real run afterwards still imports everything.
	if real := mustImport(t, f, false); real.Types[store.AudienceClub].Imported != 2 {
		t.Fatalf("real run after the dry run: %+v", real.Types[store.AudienceClub])
	}
}
