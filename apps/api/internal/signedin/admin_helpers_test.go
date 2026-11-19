package signedin_test

import (
	"testing"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// relinkAdmins turns the capture's 'supabase' admin accounts into Go sign-in identities: one identity per
// account, with the account's subject as its ID and the display name as its login. The player accounts that have
// a contact are linked too (a Player pass is the wrong audience for an Admin route). It is also what makes the
// reloaded seed usable again, because the seed puts the 'supabase' provider back.
func (e *env) relinkAdmins(t *testing.T) {
	t.Helper()
	e.setup(t, []string{`UPDATE admin_accounts SET auth_provider = 'rotra'`, `UPDATE player_accounts SET auth_provider = 'rotra'`})
	if e.adminIdentities {
		return
	}
	e.adminIdentities = true
	rows, err := e.pool.Query(e.ctx, `SELECT auth_subject, lower(replace(display_name, ' ', '-')) FROM admin_accounts`)
	if err != nil {
		t.Fatal(err)
	}
	type acc struct {
		subject uuid.UUID
		name    string
	}
	var accs []acc
	for rows.Next() {
		var a acc
		if err := rows.Scan(&a.subject, &a.name); err != nil {
			t.Fatal(err)
		}
		accs = append(accs, a)
	}
	rows.Close()
	for _, a := range accs {
		if _, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{
			ID: a.subject, Audience: store.AudienceAdmin, LoginKey: a.name, PasswordHash: "fake-hash-for-tests", PasswordScheme: store.SchemeArgon2id, Now: e.clk.Now(),
		}); err != nil {
			t.Fatalf("insert admin identity: %v", err)
		}
	}
	prow, err := e.pool.Query(e.ctx, `SELECT a.auth_subject, c.email FROM player_accounts a JOIN player_private_contacts c ON c.player_id = a.player_id WHERE c.email IS NOT NULL`)
	if err != nil {
		t.Fatal(err)
	}
	var players []acc
	for prow.Next() {
		var a acc
		if err := prow.Scan(&a.subject, &a.name); err != nil {
			t.Fatal(err)
		}
		players = append(players, a)
	}
	prow.Close()
	for _, a := range players {
		if _, err := e.st.InsertIdentity(e.ctx, store.NewIdentity{
			ID: a.subject, Audience: store.AudiencePlayer, LoginKey: a.name, PasswordHash: "fake-hash-for-tests", PasswordScheme: store.SchemeArgon2id, Now: e.clk.Now(),
		}); err != nil {
			t.Fatalf("insert player identity: %v", err)
		}
	}
}

// adminPass signs the admin behind a subject in at the current fake time and returns the access pass. A subject
// that is a Player's gets a Player pass (the wrong audience for the Admin app).
func (e *env) adminPass(t *testing.T, subject string) string {
	t.Helper()
	id := uuid.MustParse(subject)
	ident, err := e.st.GetIdentityByID(e.ctx, id)
	if err != nil {
		return "" // no identity behind the subject: nothing to sign in with
	}
	var account uuid.UUID
	q := `SELECT id FROM admin_accounts WHERE auth_subject = $1`
	if ident.Audience == store.AudiencePlayer {
		q = `SELECT player_id FROM player_accounts WHERE auth_subject = $1`
	}
	if err := e.pool.QueryRow(e.ctx, q, id).Scan(&account); err != nil {
		t.Fatalf("account of %s: %v", subject, err)
	}
	iss, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: ident, AccountID: account, DeviceLabel: "Chrome on Android"})
	if err != nil {
		t.Fatal(err)
	}
	return iss.AccessPass
}
