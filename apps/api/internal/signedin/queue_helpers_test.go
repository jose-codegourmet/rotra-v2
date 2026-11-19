package signedin_test

import (
	"testing"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// relinkClubs turns the capture's 'supabase' club accounts into Go sign-in identities: one identity per account, with
// the account's subject as its ID and the username as its login. The seed puts the 'supabase' provider back each time
// it is loaded, so every reload relinks. Identities are inserted once: they survive the seed (it never touches them).
func (e *env) relinkClubs(t *testing.T) {
	t.Helper()
	e.setup(t, []string{`UPDATE club_accounts SET auth_provider = 'rotra'`, `UPDATE admin_accounts SET auth_provider = 'rotra'`})
	if e.clubIdentities {
		return
	}
	e.clubIdentities = true
	rows, err := e.pool.Query(e.ctx, `SELECT auth_subject, username FROM club_accounts WHERE auth_subject IS NOT NULL`)
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
			ID: a.subject, Audience: store.AudienceClub, LoginKey: a.name, PasswordHash: "fake-hash-for-tests", PasswordScheme: store.SchemeArgon2id, Now: e.clk.Now(),
		}); err != nil {
			t.Fatalf("insert club identity: %v", err)
		}
	}
}

// clubPass signs the club behind a subject in at the current fake time and returns the access pass. A subject with
// no identity has no pass.
func (e *env) clubPass(t *testing.T, subject string) string {
	t.Helper()
	id := uuid.MustParse(subject)
	ident, err := e.st.GetIdentityByID(e.ctx, id)
	if err != nil {
		return ""
	}
	var club uuid.UUID
	if err := e.pool.QueryRow(e.ctx, `SELECT club_id FROM club_accounts WHERE auth_subject = $1`, id).Scan(&club); err != nil {
		return "" // the account row is gone (a scenario deleted it): the pass would name no club
	}
	iss, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: ident, AccountID: club, DeviceLabel: "Chrome on Android"})
	if err != nil {
		t.Fatal(err)
	}
	return iss.AccessPass
}
