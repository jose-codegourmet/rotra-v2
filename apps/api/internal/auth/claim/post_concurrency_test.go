package claim_test

import (
	"fmt"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/claim"
	"net/http"
	"net/http/httptest"
	"sort"
	"sync"
	"sync/atomic"
	"testing"
)

// parallel runs the calls at the same moment and returns their responses in order.
func parallel(n int, call func(i int) *httptest.ResponseRecorder) []*httptest.ResponseRecorder {
	out := make([]*httptest.ResponseRecorder, n)
	var wg sync.WaitGroup
	start := make(chan struct{})
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			out[i] = call(i)
		}()
	}
	close(start)
	wg.Wait()
	return out
}

// Many identical submissions of one link (a double tap, retries, two tabs): exactly one player, identity and
// account; every answer is the same 200, because the later ones find the link consumed and sign in with the same
// password, the TypeScript's retry branch.
func TestConcurrentIdenticalClaimsCreateOne(t *testing.T) {
	for name, mk := range map[string]func(e *env) string{
		"record": func(e *env) string {
			tok, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
			return tok
		},
		"player": func(e *env) string {
			tok, _ := e.playerLink(t, e.club(t, "Club"), playerOpts{phone: phoneA})
			return tok
		},
	} {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			token := mk(e)
			const n = 8
			players := e.count(t, `SELECT count(*) FROM players`)
			res := parallel(n, func(int) *httptest.ResponseRecorder { return e.post(token, claimBody(nil)) })
			var ids, rtrs = map[string]bool{}, map[string]bool{}
			for i, w := range res {
				if w.Code != http.StatusOK {
					t.Fatalf("#%d: %d %s", i, w.Code, w.Body.String())
				}
				m := decode(t, w).(map[string]any)
				ids[m["playerId"].(string)], rtrs[m["rtrId"].(string)] = true, true
			}
			if len(ids) != 1 || len(rtrs) != 1 {
				t.Fatalf("different results: %v %v", ids, rtrs)
			}
			wantPlayers := players
			if name == "record" {
				wantPlayers++
			}
			if e.count(t, `SELECT count(*) FROM players`) != wantPlayers || e.count(t, `SELECT count(*) FROM auth_identities`) != 1 ||
				e.count(t, `SELECT count(*) FROM player_accounts`) != 1 || e.count(t, `SELECT count(*) FROM player_id_allocations`) != 1 {
				t.Fatal("exactly one player, identity, account and RTR ID")
			}
			if e.count(t, `SELECT count(*) FROM auth_sessions`) != n {
				t.Fatalf("each answer signed in: %d sessions", e.count(t, `SELECT count(*) FROM auth_sessions`))
			}
		})
	}
}

// Submissions of one link with different emails: one wins; the others find a consumed link and cannot prove they own
// the account, so they get the generic refusal, never a session.
func TestConcurrentDifferentEmailsOneWins(t *testing.T) {
	e := newEnv(t)
	token, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
	const n = 6
	res := parallel(n, func(i int) *httptest.ResponseRecorder {
		return e.post(token, claimBody(obj{"email": fmt.Sprintf("person%d@example.com", i)}))
	})
	var ok, refused int
	for i, w := range res {
		switch w.Code {
		case http.StatusOK:
			ok++
		case http.StatusUnprocessableEntity:
			wantErr(t, w, http.StatusUnprocessableEntity, "invalid", fields1("email", msgCredentials))
			if len(w.Result().Cookies()) != 0 {
				t.Errorf("#%d got cookies", i)
			}
			refused++
		default:
			t.Fatalf("#%d: %d %s", i, w.Code, w.Body.String())
		}
	}
	if ok != 1 || refused != n-1 {
		t.Fatalf("ok %d refused %d", ok, refused)
	}
	if e.count(t, `SELECT count(*) FROM auth_identities`) != 1 || e.count(t, `SELECT count(*) FROM player_accounts`) != 1 || e.count(t, `SELECT count(*) FROM auth_sessions`) != 1 {
		t.Fatal("one identity, one account, one session")
	}
}

// Two clubs founded in the same city, each with a link, claimed at the same moment: the RTR IDs are distinct
// (the counter row serializes them) and the sequence has no hole.
func TestConcurrentClaimsOfTwoClubsGetDistinctRTRIDs(t *testing.T) {
	e := newEnv(t)
	clubA, clubB := e.club(t, "Club A"), e.club(t, "Club B")
	tokens := []string{}
	for i := 0; i < 4; i++ {
		club := clubA
		if i%2 == 1 {
			club = clubB
		}
		tok, _ := e.recordLink(t, club, recordOpts{phone: fmt.Sprintf("+63917555010%d", i)})
		tokens = append(tokens, tok)
	}
	res := parallel(len(tokens), func(i int) *httptest.ResponseRecorder {
		return e.post(tokens[i], claimBody(obj{"email": fmt.Sprintf("p%d@example.com", i)}))
	})
	var got []string
	for i, w := range res {
		if w.Code != http.StatusOK {
			t.Fatalf("#%d: %d %s", i, w.Code, w.Body.String())
		}
		got = append(got, decode(t, w).(map[string]any)["rtrId"].(string))
	}
	sort.Strings(got)
	want := []string{"RTR-PH-CEB-111726-0001", "RTR-PH-CEB-111726-0002", "RTR-PH-CEB-111726-0003", "RTR-PH-CEB-111726-0004"}
	if fmt.Sprint(got) != fmt.Sprint(want) {
		t.Fatalf("%v", got)
	}
}

// Two different people's links, the same email: one account; the other claim is the 409 on the email.
func TestConcurrentSameEmailOneWins(t *testing.T) {
	e := newEnv(t)
	club := e.club(t, "Club")
	a, _ := e.recordLink(t, club, recordOpts{phone: "+639175550101"})
	b, _ := e.recordLink(t, club, recordOpts{phone: "+639175550102"})
	toks := []string{a, b}
	res := parallel(2, func(i int) *httptest.ResponseRecorder { return e.post(toks[i], claimBody(nil)) })
	var ok, conflict int
	for _, w := range res {
		switch w.Code {
		case http.StatusOK:
			ok++
		case http.StatusConflict:
			wantErr(t, w, http.StatusConflict, "conflict", fields1("email", msgEmailTaken))
			conflict++
		default:
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
	}
	if ok != 1 || conflict != 1 {
		t.Fatalf("ok %d conflict %d", ok, conflict)
	}
	if e.count(t, `SELECT count(*) FROM player_accounts`) != 1 || e.count(t, `SELECT count(*) FROM auth_identities`) != 1 {
		t.Fatal("one account")
	}
}

// Two clubs hold a record for the same phone, and both people claim at once (different emails): the phone is one
// ROTRA profile. One wins; the other is refused (the phone is taken, or its record was already joined to the
// winner), and neither deadlocks.
func TestConcurrentSamePhoneAcrossClubsDoesNotDeadlock(t *testing.T) {
	for i := 0; i < 3; i++ {
		e := newEnv(t)
		a, _ := e.recordLink(t, e.club(t, "Club A"), recordOpts{phone: phoneA})
		b, _ := e.recordLink(t, e.club(t, "Club B"), recordOpts{phone: phoneA})
		toks := []string{a, b}
		res := parallel(2, func(i int) *httptest.ResponseRecorder {
			return e.post(toks[i], claimBody(obj{"email": fmt.Sprintf("p%d@example.com", i)}))
		})
		var ok int
		for _, w := range res {
			switch w.Code {
			case http.StatusOK:
				ok++
			case http.StatusConflict, http.StatusForbidden:
			default:
				t.Fatalf("%d %s", w.Code, w.Body.String())
			}
		}
		if ok != 1 || e.count(t, `SELECT count(*) FROM player_accounts`) != 1 {
			t.Fatalf("ok %d", ok)
		}
		if e.count(t, `SELECT count(*) FROM club_players WHERE player_id IS NOT NULL`) != 2 {
			t.Fatal("both clubs' records join the one player")
		}
	}
}

// A competing identical claim that commits while this one is between its reads (the link read, then the email
// checks) or between its checks and its transaction must not turn this one into the field conflict a different
// claimant gets: it is re-run from the link lookup, finds the consumed link and answers the same 200.
// Forced here by running the winner at the exact moment, so no timing is involved.
func TestIdenticalClaimWinningMidRequestIsStillOK(t *testing.T) {
	for _, stage := range []string{"link", "transaction"} {
		for name, mk := range map[string]func(e *env) string{
			"record": func(e *env) string {
				tok, _ := e.recordLink(t, e.club(t, "Club"), recordOpts{phone: phoneA})
				return tok
			},
			"player": func(e *env) string {
				tok, _ := e.playerLink(t, e.club(t, "Club"), playerOpts{phone: phoneA})
				return tok
			},
		} {
			t.Run(stage+"/"+name, func(t *testing.T) {
				e := newEnv(t)
				token := mk(e)
				var fired atomic.Bool
				var winner *httptest.ResponseRecorder
				reset := claim.SetAfterLinkRead(func(at string) {
					if at == stage && fired.CompareAndSwap(false, true) {
						winner = e.post(token, claimBody(nil))
					}
				})
				defer reset()
				w := e.post(token, claimBody(nil))
				if winner == nil || winner.Code != http.StatusOK {
					t.Fatalf("the competing claim did not win: %v", winner)
				}
				if w.Code != http.StatusOK {
					t.Fatalf("%d %s", w.Code, w.Body.String())
				}
				if e.count(t, `SELECT count(*) FROM auth_identities`) != 1 || e.count(t, `SELECT count(*) FROM auth_sessions`) != 2 {
					t.Fatal("one identity, a session for each answer")
				}
			})
		}
	}
}

// The same interleaving with a different email stays the conflict or generic refusal: a different claimant.
func TestDifferentClaimantWinningMidRequestIsRefused(t *testing.T) {
	e := newEnv(t)
	token, _ := e.playerLink(t, e.club(t, "Club"), playerOpts{phone: phoneA})
	var fired atomic.Bool
	reset := claim.SetAfterLinkRead(func(at string) {
		if at == "link" && fired.CompareAndSwap(false, true) {
			e.post(token, claimBody(obj{"email": "other@example.com"}))
		}
	})
	defer reset()
	w := e.post(token, claimBody(nil))
	if w.Code == http.StatusOK || len(w.Result().Cookies()) != 0 {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
}
