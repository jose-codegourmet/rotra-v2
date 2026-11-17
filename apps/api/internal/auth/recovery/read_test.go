package recovery_test

import (
	"encoding/json"
	"fmt"
	"reflect"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

func asJSON(t testing.TB, v any) any {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	var out any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func TestReadRequestsEmpty(t *testing.T) {
	e := newEnv(t)
	page, err := e.rec.ReadRequests(e.ctx, 1)
	if err != nil {
		t.Fatal(err)
	}
	if want := (obj{"total": 0, "page": 1, "rows": []any{}}); !reflect.DeepEqual(asJSON(t, page), asJSON(t, want)) {
		t.Fatalf("%+v", asJSON(t, page))
	}
}

// readPasswordResetRequests (password-resets.ts:60-95): the wire shape, newest first, and canIssue from eligible().
func TestReadRequestsShapeAndOrder(t *testing.T) {
	e := newEnv(t)
	admin := e.admin(t, "Owner Olive")
	ana := e.player(t, acctOpts{name: "Ana Reyes"})
	id := e.asked(t, ana)
	e.clk.Advance(time.Minute)
	if err := e.rec.Submit(e.ctx, "nobody@example.test"); err != nil {
		t.Fatal(err)
	}
	e.clk.Advance(time.Minute)
	noRTR := e.player(t, acctOpts{name: "Cara Lim", noRTR: true})
	e.asked(t, noRTR)
	e.clk.Advance(time.Minute)
	if _, err := e.rec.Review(e.ctx, admin, id.String(), recovery.ReviewInput{Action: "issue", OwnershipVerified: true}); err != nil {
		t.Fatal(err)
	}

	page, err := e.rec.ReadRequests(e.ctx, 1)
	if err != nil {
		t.Fatal(err)
	}
	var rtr string
	if err := e.pool.QueryRow(e.ctx, `SELECT rtr_id FROM player_id_allocations WHERE player_id = $1`, ana.player).Scan(&rtr); err != nil {
		t.Fatal(err)
	}
	// Ana was submitted first but reviewed last: the order is by when the request was made, not reviewed.
	want := obj{"total": 3, "page": 1, "rows": []any{
		obj{"id": e.requestFor(t, noRTR.email).String(), "email": noRTR.email, "status": "pending", "requestedAt": "2026-11-17T12:02:00.000Z",
			"reviewedAt": nil, "reviewedBy": nil, "playerId": noRTR.player.String(), "playerName": "Cara Lim", "rtrId": nil, "canIssue": true},
		obj{"id": e.requestFor(t, "nobody@example.test").String(), "email": "nobody@example.test", "status": "pending", "requestedAt": "2026-11-17T12:01:00.000Z",
			"reviewedAt": nil, "reviewedBy": nil, "playerId": nil, "playerName": nil, "rtrId": nil, "canIssue": false},
		obj{"id": id.String(), "email": ana.email, "status": "issued", "requestedAt": "2026-11-17T12:00:00.000Z",
			"reviewedAt": "2026-11-17T12:03:00.000Z", "reviewedBy": "Owner Olive", "playerId": ana.player.String(), "playerName": "Ana Reyes", "rtrId": rtr, "canIssue": true},
	}}
	if got, want := asJSON(t, page), asJSON(t, want); !reflect.DeepEqual(got, want) {
		gb, _ := json.MarshalIndent(got, "", "  ")
		wb, _ := json.MarshalIndent(want, "", "  ")
		t.Fatalf("got:\n%s\nwant:\n%s", gb, wb)
	}
}

// canIssue is recomputed from the account as it is now, not as it was when the request was made.
func TestReadRequestsCanIssueFollowsTheAccount(t *testing.T) {
	e := newEnv(t)
	cases := map[string]func(a acct){
		"contact email changed": func(a acct) {
			e.exec(t, `UPDATE player_private_contacts SET email = 'new-address@example.test' WHERE player_id = $1`, a.player)
		},
		"contact email removed": func(a acct) {
			e.exec(t, `UPDATE player_private_contacts SET email = NULL WHERE player_id = $1`, a.player)
		},
		"account disabled": func(a acct) {
			e.exec(t, `UPDATE player_accounts SET disabled_at = now() WHERE player_id = $1`, a.player)
		},
		"contact sync failed": func(a acct) {
			e.exec(t, `UPDATE player_accounts SET contact_sync_status = 'failed' WHERE player_id = $1`, a.player)
		},
		"identity disabled": func(a acct) {
			e.exec(t, `UPDATE auth_identities SET disabled_at = now() WHERE id = $1`, a.identity)
		},
		"provider changed": func(a acct) {
			e.exec(t, `UPDATE player_accounts SET auth_provider = 'supabase' WHERE player_id = $1`, a.player)
		},
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			a := e.player(t, acctOpts{})
			e.asked(t, a)
			change(a)
			page, err := e.rec.ReadRequests(e.ctx, 1)
			if err != nil {
				t.Fatal(err)
			}
			for _, row := range page.Rows {
				if row.Email == a.email && row.CanIssue {
					t.Fatalf("canIssue is still true after: %s", name)
				}
			}
		})
	}
}

func TestReadRequestsPaginates(t *testing.T) {
	e := newEnv(t)
	for i := range 27 {
		e.clk.Advance(time.Second)
		if err := e.rec.Submit(e.ctx, fmt.Sprintf("p%02d@example.test", i)); err != nil {
			t.Fatal(err)
		}
	}
	sizes := map[int]int{1: 25, 2: 2, 3: 0, 100000: 0}
	for page, n := range sizes {
		got, err := e.rec.ReadRequests(e.ctx, page)
		if err != nil {
			t.Fatalf("page %d: %v", page, err)
		}
		if got.Total != 27 || got.Page != page || len(got.Rows) != n {
			t.Fatalf("page %d: total %d page %d rows %d", page, got.Total, got.Page, len(got.Rows))
		}
	}
	first, _ := e.rec.ReadRequests(e.ctx, 1)
	second, _ := e.rec.ReadRequests(e.ctx, 2)
	if first.Rows[0].Email != "p26@example.test" || second.Rows[1].Email != "p00@example.test" {
		t.Fatalf("order: %s ... %s", first.Rows[0].Email, second.Rows[1].Email)
	}
}

func TestReadRequestsRefusesABadPage(t *testing.T) {
	e := newEnv(t)
	for _, page := range []int{0, -1, 100001} {
		_, err := e.rec.ReadRequests(e.ctx, page)
		wantServiceErr(t, err, httpapi.ErrInvalid, nil)
	}
	var _ recovery.Page
}
