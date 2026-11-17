package recovery_test

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

func issue() recovery.ReviewInput {
	return recovery.ReviewInput{Action: "issue", OwnershipVerified: true}
}

func decline() recovery.ReviewInput { return recovery.ReviewInput{Action: "decline"} }

func digest(token string) []byte {
	d := sha256.Sum256([]byte(token))
	return d[:]
}

// reviewPasswordResetRequest's checks run before anything is read (password-resets.ts:106-112).
func TestReviewValidatesFirst(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	id := e.asked(t, e.player(t, acctOpts{}))
	for _, bad := range []string{
		"", "not-a-uuid", "{" + id.String() + "}", "urn:uuid:" + id.String(), strings.ReplaceAll(id.String(), "-", ""),
		id.String() + " ", "  " + id.String(), id.String()[:35],
	} {
		_, err := e.rec.Review(e.ctx, admin, bad, issue())
		wantServiceErr(t, err, httpapi.ErrInvalid, nil)
	}
	for _, action := range []string{"", "approve", "ISSUE", "issue "} {
		_, err := e.rec.Review(e.ctx, admin, id.String(), recovery.ReviewInput{Action: action, OwnershipVerified: true})
		wantServiceErr(t, err, httpapi.ErrInvalid, nil)
	}
	_, err := e.rec.Review(e.ctx, admin, id.String(), recovery.ReviewInput{Action: "issue"})
	wantServiceErr(t, err, httpapi.ErrInvalid, map[string]string{"ownership": "Verify account ownership before generating a link."})
	// Unknown but well formed: not found. Ownership is not needed to decline.
	_, err = e.rec.Review(e.ctx, admin, uuid.NewString(), decline())
	wantServiceErr(t, err, httpapi.ErrNotFound, nil)
	if r := e.request(t, id); r.status != "pending" || r.revision != 1 {
		t.Fatalf("a refused review changed the request: %+v", r)
	}
	// An upper-case id is a valid UUID (the TypeScript's pattern is case-insensitive).
	if _, err := e.rec.Review(e.ctx, admin, strings.ToUpper(id.String()), issue()); err != nil {
		t.Fatalf("upper-case id: %v", err)
	}
}

func TestReviewIssue(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	a := e.player(t, acctOpts{})
	id := e.asked(t, a)
	before := e.request(t, id)
	e.clk.Advance(90 * time.Second)
	res, err := e.rec.Review(e.ctx, admin, id.String(), issue())
	if err != nil {
		t.Fatal(err)
	}
	if res.Token == nil {
		t.Fatal("no token")
	}
	raw, err := base64.RawURLEncoding.Strict().DecodeString(*res.Token)
	if err != nil || len(raw) != 32 {
		t.Fatalf("token %q is not 32 bytes of unpadded base64url (%d, %v)", *res.Token, len(raw), err)
	}
	r := e.request(t, id)
	if r.status != "issued" || r.reviewedBy == nil || *r.reviewedBy != admin || r.reviewedAt == nil || !r.reviewedAt.Equal(base.Add(90*time.Second)) {
		t.Fatalf("request %+v", r)
	}
	if r.subject == nil || *r.subject != a.identity {
		t.Fatalf("auth_subject %v, want the identity %s", r.subject, a.identity)
	}
	if !bytes.Equal(r.digest, digest(*res.Token)) {
		t.Fatal("only the SHA-256 of the token is stored")
	}
	if r.consumedAt != nil || r.issuance != nil || r.issuanceAt != nil || r.revision != before.revision+1 {
		t.Fatalf("request %+v", r)
	}
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE token_digest = $1`, []byte(*res.Token)); n != 0 {
		t.Fatal("the token itself is stored")
	}
	// The Admin audit trail (recordAudit) and the sign-in side's event.
	if n := e.count(t, `SELECT count(*) FROM admin_audit_events WHERE actor_admin_id = $1 AND action = 'player.password_reset_link_issued'
	  AND target_type = 'password_reset_request' AND target_id = $2 AND occurred_at = $3 AND metadata IS NULL`, admin, id.String(), base.Add(90*time.Second)); n != 1 {
		t.Fatalf("%d audit rows", n)
	}
	if n := e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'password_reset_issued' AND identity_id = $1 AND audience = 'player' AND session_id IS NULL`, a.identity); n != 1 {
		t.Fatalf("%d password_reset_issued events", n)
	}
	// The result is {"token": "..."}.
	if got := asJSON(t, res); got.(map[string]any)["token"] != *res.Token {
		t.Fatalf("%v", got)
	}
}

func TestReviewIssueNeedsAnEligibleAccount(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	msg := map[string]string{"account": "This account is unavailable or its email changed. Ask the player to submit a new request with their current email."}
	cases := map[string]func(a acct){
		"contact email changed": func(a acct) {
			e.exec(t, `UPDATE player_private_contacts SET email = 'new@example.test' WHERE player_id = $1`, a.player)
		},
		"account disabled": func(a acct) {
			e.exec(t, `UPDATE player_accounts SET disabled_at = now() WHERE player_id = $1`, a.player)
		},
		"contact sync failed": func(a acct) {
			e.exec(t, `UPDATE player_accounts SET contact_sync_status = 'failed' WHERE player_id = $1`, a.player)
		},
		"another provider": func(a acct) {
			e.exec(t, `UPDATE player_accounts SET auth_provider = 'supabase' WHERE player_id = $1`, a.player)
		},
		"identity disabled": func(a acct) { e.exec(t, `UPDATE auth_identities SET disabled_at = now() WHERE id = $1`, a.identity) },
		"identity gone": func(a acct) {
			e.exec(t, `UPDATE player_accounts SET auth_subject = $2 WHERE player_id = $1`, a.player, uuid.New())
		},
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			a := e.player(t, acctOpts{})
			id := e.asked(t, a)
			change(a)
			before := e.request(t, id)
			_, err := e.rec.Review(e.ctx, admin, id.String(), issue())
			wantServiceErr(t, err, httpapi.ErrConflict, msg)
			if after := e.request(t, id); after.revision != before.revision || after.status != "pending" || after.digest != nil {
				t.Fatalf("a refused issue wrote: %+v", after)
			}
			if n := e.count(t, `SELECT count(*) FROM admin_audit_events WHERE target_id = $1`, id.String()); n != 0 {
				t.Fatalf("%d audit rows for a refused issue", n)
			}
		})
	}
	t.Run("a request with no player", func(t *testing.T) {
		if err := e.rec.Submit(e.ctx, "stranger@example.test"); err != nil {
			t.Fatal(err)
		}
		_, err := e.rec.Review(e.ctx, admin, e.requestFor(t, "stranger@example.test").String(), issue())
		wantServiceErr(t, err, httpapi.ErrConflict, msg)
	})
	t.Run("the account may still be declined", func(t *testing.T) {
		a := e.player(t, acctOpts{disabled: true})
		id := e.asked(t, a)
		if _, err := e.rec.Review(e.ctx, admin, id.String(), decline()); err != nil {
			t.Fatal(err)
		}
	})
}

func TestReviewDecline(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	id := e.asked(t, e.player(t, acctOpts{}))
	e.clk.Advance(time.Minute)
	res, err := e.rec.Review(e.ctx, admin, id.String(), decline())
	if err != nil {
		t.Fatal(err)
	}
	if res.Token != nil {
		t.Fatal("a decline has no token")
	}
	if got := asJSON(t, res); got.(map[string]any)["token"] != nil {
		t.Fatalf("%v", got)
	}
	r := e.request(t, id)
	if r.status != "declined" || r.reviewedBy == nil || *r.reviewedBy != admin || r.reviewedAt == nil || !r.reviewedAt.Equal(base.Add(time.Minute)) || r.revision != 2 || r.digest != nil {
		t.Fatalf("request %+v", r)
	}
	if n := e.count(t, `SELECT count(*) FROM admin_audit_events WHERE actor_admin_id = $1 AND action = 'player.password_reset_declined' AND target_type = 'password_reset_request' AND target_id = $2`, admin, id.String()); n != 1 {
		t.Fatalf("%d audit rows", n)
	}
	if n := e.count(t, `SELECT count(*) FROM auth_events WHERE event = 'password_reset_issued'`); n != 0 {
		t.Fatal("a decline issued nothing")
	}
	// A declined request is final.
	for _, in := range []recovery.ReviewInput{issue(), decline()} {
		_, err := e.rec.Review(e.ctx, admin, id.String(), in)
		wantServiceErr(t, err, httpapi.ErrConflict, nil)
	}
}

// Only a pending request can be declined; an issued one stays issued (password-resets.ts:127-131).
func TestReviewCannotDeclineAnIssuedRequest(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	id, token := e.issued(t, admin, e.player(t, acctOpts{}))
	_, err := e.rec.Review(e.ctx, admin, id.String(), decline())
	wantServiceErr(t, err, httpapi.ErrConflict, nil)
	if r := e.request(t, id); r.status != "issued" || !bytes.Equal(r.digest, digest(token)) {
		t.Fatalf("the link was disturbed: %+v", r)
	}
}

// Issuing again replaces the link: the earlier token stops working, the new one starts a fresh lifetime.
func TestReviewIssueAgainReplacesTheLink(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	a := e.player(t, acctOpts{})
	id, first := e.issued(t, admin, a)
	e.clk.Advance(time.Hour)
	res, err := e.rec.Review(e.ctx, admin, id.String(), issue())
	if err != nil {
		t.Fatal(err)
	}
	if *res.Token == first {
		t.Fatal("the same token twice")
	}
	r := e.request(t, id)
	if !bytes.Equal(r.digest, digest(*res.Token)) || r.reviewedAt == nil || !r.reviewedAt.Equal(base.Add(time.Hour)) {
		t.Fatalf("%+v", r)
	}
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE token_digest = $1`, digest(first)); n != 0 {
		t.Fatal("the first link still works")
	}
}

// A second request of the same player (after the first was issued) revokes the first one's link.
func TestReviewASecondRequestRevokesTheEarlierLink(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	a := e.player(t, acctOpts{})
	firstID, firstToken := e.issued(t, admin, a)
	secondID, secondToken := e.issued(t, admin, a)
	if firstID == secondID {
		t.Fatal("expected two requests")
	}
	first, second := e.request(t, firstID), e.request(t, secondID)
	if first.digest != nil || first.status != "issued" {
		t.Fatalf("the earlier request: %+v", first)
	}
	if !bytes.Equal(second.digest, digest(secondToken)) || firstToken == secondToken {
		t.Fatalf("the later request: %+v", second)
	}
	// Another player's link is not touched.
	b := e.player(t, acctOpts{})
	otherID, otherToken := e.issued(t, admin, b)
	if _, err := e.rec.Review(e.ctx, admin, e.asked(t, a).String(), issue()); err != nil {
		t.Fatal(err)
	}
	if r := e.request(t, otherID); !bytes.Equal(r.digest, digest(otherToken)) {
		t.Fatal("another player's link was revoked")
	}
}

// A request whose link was used can be issued a new one: consumed_at is cleared with the new digest.
func TestReviewIssueAfterUseGivesAWorkingLink(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	id, _ := e.issued(t, admin, e.player(t, acctOpts{}))
	e.exec(t, `UPDATE player_password_reset_requests SET token_digest = NULL, consumed_at = $2 WHERE id = $1`, id, base)
	res, err := e.rec.Review(e.ctx, admin, id.String(), issue())
	if err != nil {
		t.Fatal(err)
	}
	if r := e.request(t, id); r.consumedAt != nil || !bytes.Equal(r.digest, digest(*res.Token)) {
		t.Fatalf("%+v", r)
	}
}

// A lease left behind by the TypeScript issuance does not block the Go issue and is cleared (the lease collapsed
// into the single transaction).
func TestReviewClearsALeftOverLease(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	a := e.player(t, acctOpts{})
	id := e.asked(t, a)
	e.exec(t, `UPDATE player_password_reset_requests SET issuance_id = $2, issuance_started_at = $3 WHERE id = $1`, id, uuid.New(), base)
	if _, err := e.rec.Review(e.ctx, admin, id.String(), issue()); err != nil {
		t.Fatalf("a fresh lease must not block: %v", err)
	}
	if r := e.request(t, id); r.issuance != nil || r.issuanceAt != nil {
		t.Fatalf("%+v", r)
	}
}

func TestReviewUnknownAdminIsNotAServiceError(t *testing.T) {
	e := newEnv(t)
	id := e.asked(t, e.player(t, acctOpts{}))
	_, err := e.rec.Review(e.ctx, uuid.New(), id.String(), issue())
	var re *recovery.Error
	if err == nil || errors.As(err, &re) {
		t.Fatalf("an unknown admin id (a foreign key failure) must be an unexpected error, got %v", err)
	}
	if r := e.request(t, id); r.status != "pending" {
		t.Fatal("rolled back")
	}
}

// Two Admins issue for one request at once: both succeed in turn, the later one wins and exactly one link works.
func TestReviewTwoAdminsIssueAtOnce(t *testing.T) {
	e := newEnv(t)
	a1, a2 := e.admin(t, "One"), e.admin(t, "Two")
	id := e.asked(t, e.player(t, acctOpts{}))
	tokens := make(chan string, 2)
	var wg sync.WaitGroup
	for _, admin := range []uuid.UUID{a1, a2} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res, err := e.rec.Review(e.ctx, admin, id.String(), issue())
			if err != nil {
				t.Error(err)
				return
			}
			tokens <- *res.Token
		}()
	}
	wg.Wait()
	close(tokens)
	live := 0
	for tok := range tokens {
		live += e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE token_digest = $1`, digest(tok))
	}
	if live != 1 {
		t.Fatalf("%d links work, want exactly 1", live)
	}
	if n := e.count(t, `SELECT count(*) FROM admin_audit_events WHERE action = 'player.password_reset_link_issued'`); n != 2 {
		t.Fatalf("%d audit rows, want one per issue", n)
	}
}

// Issue and decline race for one pending request: whoever locks first wins, the other is a conflict.
func TestReviewIssueAndDeclineRace(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	for range 5 {
		id := e.asked(t, e.player(t, acctOpts{}))
		var wg sync.WaitGroup
		results := make([]error, 2)
		for i, in := range []recovery.ReviewInput{issue(), decline()} {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, results[i] = e.rec.Review(e.ctx, admin, id.String(), in)
			}()
		}
		wg.Wait()
		r := e.request(t, id)
		switch r.status {
		case "issued": // issue first: the decline then finds it no longer pending
			wantServiceErr(t, results[1], httpapi.ErrConflict, nil)
			if results[0] != nil || r.digest == nil {
				t.Fatalf("issue: %v %+v", results[0], r)
			}
		case "declined":
			if results[1] != nil {
				t.Fatalf("decline: %v", results[1])
			}
			wantServiceErr(t, results[0], httpapi.ErrConflict, nil)
			if r.digest != nil {
				t.Fatal("a declined request holds a link")
			}
		default:
			t.Fatalf("status %s", r.status)
		}
	}
}

// Two requests of one player are issued at the same moment: still exactly one live link for the player.
func TestReviewTwoRequestsOfOnePlayerLeaveOneLink(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner")
	a := e.player(t, acctOpts{})
	firstID, _ := e.issued(t, admin, a)
	secondID := e.asked(t, a)
	var wg sync.WaitGroup
	for _, id := range []uuid.UUID{firstID, secondID} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := e.rec.Review(e.ctx, admin, id.String(), issue()); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if n := e.count(t, `SELECT count(*) FROM player_password_reset_requests WHERE player_id = $1 AND token_digest IS NOT NULL`, a.player); n != 1 {
		t.Fatalf("%d live links for one player, want 1", n)
	}
}
