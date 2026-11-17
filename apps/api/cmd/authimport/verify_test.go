package main

import (
	"bytes"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func mustVerify(t *testing.T, f *fx) *VerifyReport {
	t.Helper()
	r, err := f.importer().Verify(f.ctx)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	return r
}

// Before the import every provisioned account is a gap; after it none is.
func TestVerifyCountsAccountsAgainstIdentities(t *testing.T) {
	f := newFx(t)
	club := f.club(t, "club_a", f.user(t, "club_a@clubs.rotra.invalid"))
	player := f.player(t, "p@example.com", f.user(t, "p@example.com"))
	admin := f.admin(t, f.user(t, "a@rotra.club"))
	f.club(t, "never_provisioned", nil)

	before := mustVerify(t, f)

	if before.Gaps() != 3 || before.Types[store.AudienceClub].Pending != 1 || before.Types[store.AudienceClub].Unprovisioned != 1 ||
		before.Types[store.AudienceClub].Accounts != 2 {
		t.Fatalf("before: %+v %+v", before, before.Types[store.AudienceClub])
	}
	var out bytes.Buffer
	if err := before.Print(&out); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"without_identity club " + club.String() + " provider=supabase",
		"without_identity player " + player.String(), "without_identity admin " + admin.String(), "verify=failed"} {
		if !strings.Contains(out.String(), want) {
			t.Fatalf("report lacks %q:\n%s", want, out.String())
		}
	}

	mustImport(t, f, false)
	after := mustVerify(t, f)

	if after.Gaps() != 0 {
		t.Fatalf("after: %+v", after.Types)
	}
	c := after.Types[store.AudienceClub]
	if c.Accounts != 2 || c.Linked != 1 || c.Pending != 0 || c.Unprovisioned != 1 || c.Identities != 1 || c.Unlinked != 0 {
		t.Fatalf("club after: %+v", c)
	}
	out.Reset()
	if err := after.Print(&out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "verify=ok") || !strings.Contains(out.String(), "player accounts=1 linked=1 pending=0 unprovisioned=0 without_identity=0 identities=1 unlinked_identities=0") {
		t.Fatalf("report:\n%s", out.String())
	}
}

// A rotra account whose identity is gone, and an identity nobody points at, are both reported.
func TestVerifyFindsDanglingAccountsAndUnlinkedIdentities(t *testing.T) {
	f := newFx(t)
	admin := f.admin(t, f.user(t, "a@rotra.club"))
	mustImport(t, f, false)
	f.execOn(t, f.target, `UPDATE admin_accounts SET auth_subject = gen_random_uuid() WHERE id = $1`, admin)

	r := mustVerify(t, f)

	c := r.Types[store.AudienceAdmin]
	if len(c.Without) != 1 || c.Without[0].ID != admin || c.Without[0].Provider != "rotra" || c.Unlinked != 1 || c.Linked != 0 {
		t.Fatalf("admin: %+v", c)
	}
}

// An identity of the wrong audience does not count as the account's identity.
func TestVerifyChecksTheAudience(t *testing.T) {
	f := newFx(t)
	admin := f.admin(t, f.user(t, "a@rotra.club"))
	mustImport(t, f, false)
	f.execOn(t, f.target, `UPDATE auth_identities SET audience = 'player'`)

	if r := mustVerify(t, f); len(r.Types[store.AudienceAdmin].Without) != 1 || r.Types[store.AudienceAdmin].Without[0].ID != admin {
		t.Fatalf("admin: %+v", r.Types[store.AudienceAdmin])
	}
}

func TestRunVerifyExitsNonZeroOnGaps(t *testing.T) {
	f := newFx(t)
	f.admin(t, f.user(t, "owner@rotra.club"))
	env := map[string]string{"DATABASE_URL": f.targetDSN} // verify needs no Supabase database

	out, _, err := f.cli([]string{"--verify"}, env)
	if err == nil || !strings.Contains(err.Error(), "1 account") || !strings.Contains(out, "verify=failed") {
		t.Fatalf("err %v\n%s", err, out)
	}
	if _, _, err := f.cli(nil, f.env()); err != nil {
		t.Fatal(err)
	}
	out, _, err = f.cli([]string{"--verify"}, env)
	if err != nil || !strings.Contains(out, "verify=ok") {
		t.Fatalf("err %v\n%s", err, out)
	}
	if strings.Contains(out, "owner@") {
		t.Fatal("verify prints personal data")
	}
}
