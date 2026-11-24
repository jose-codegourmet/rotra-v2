package liveupdates_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
)

// R2: a screen receives events only for what it may read (club, session, own player, admin).
func TestAuthorizationPerAudience(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	club := func(login string) who { return who{app: "club", pass: h.pass("club", login)} }
	player := func(login string) who { return who{app: "player", pass: h.pass("player", login)} }
	admin := who{app: "admin", pass: h.pass("admin", adminLogin)}

	pub := "public-session:" + slugPrep
	cases := []struct {
		name   string
		who    who
		topics []string
		want   []string // accepted
		status int      // 0 or 200 when something is accepted
	}{
		// a visitor: only a published session page
		{"visitor public page", visitor(), []string{pub}, []string{pub}, 200},
		{"visitor club", visitor(), []string{"club:" + clubSmash}, nil, 401},
		{"visitor session", visitor(), []string{"session:" + sessionPrep}, nil, 401},
		{"visitor player", visitor(), []string{"player:" + playerAnn}, nil, 401},
		{"visitor admin", visitor(), []string{"admin"}, nil, 401},
		{"visitor page that does not exist", visitor(), []string{"public-session:no-such-page"}, nil, 404},
		{"visitor bad slug", visitor(), []string{"public-session:X"}, nil, 404},
		{"visitor mixed keeps only the public page", visitor(), []string{"club:" + clubSmash, pub}, []string{pub}, 200},

		// a club: its own club and sessions, never another club's
		{"club own club and session", club(smashLogin), []string{"club:" + clubSmash, "session:" + sessionPrep}, []string{"club:" + clubSmash, "session:" + sessionPrep}, 200},
		{"club other club", club(smashLogin), []string{"club:" + clubOther}, nil, 403},
		{"club session of another club", club(smashLogin), []string{"session:" + sessionLapse}, nil, 403},
		{"club unknown session", club(smashLogin), []string{"session:a3000000-0000-4000-8000-0000000000ff"}, nil, 403},
		{"club someone's player topic", club(smashLogin), []string{"player:" + playerAnn}, nil, 403},
		{"club admin topic", club(smashLogin), []string{"admin"}, nil, 403},
		{"club session of the other club asks its own", club(otherLogin), []string{"session:" + sessionPrep}, nil, 403},
		{"club mixed", club(smashLogin), []string{"club:" + clubSmash, "club:" + clubOther}, []string{"club:" + clubSmash}, 200},
		{"club public page", club(smashLogin), []string{pub}, []string{pub}, 200},

		// a player: their own topic and the published page
		{"player own", player(annLogin), []string{"player:" + playerAnn}, []string{"player:" + playerAnn}, 200},
		{"player another player", player(annLogin), []string{"player:" + playerBen}, nil, 403},
		{"player a club", player(annLogin), []string{"club:" + clubSmash}, nil, 403},
		{"player a session by id", player(annLogin), []string{"session:" + sessionPrep}, nil, 403},
		{"player admin", player(annLogin), []string{"admin"}, nil, 403},
		{"player public page", player(annLogin), []string{pub}, []string{pub}, 200},

		// an admin: everything
		{"admin everything", admin, []string{"admin", "club:" + clubOther, "session:" + sessionLapse, "player:" + playerBen}, []string{"admin", "club:" + clubOther, "session:" + sessionLapse, "player:" + playerBen}, 200},

		// a pass for another app is a visitor's
		{"club pass presented as the player app", who{app: "player", pass: h.pass("club", smashLogin)}, []string{"club:" + clubSmash}, nil, 401},
		{"player pass presented as the club app", who{app: "club", pass: h.pass("player", annLogin)}, []string{"player:" + playerAnn}, nil, 401},

		// malformed
		{"garbage topics", club(smashLogin), []string{"", "club", "club:", "club:not-a-uuid", "nope:1", "admin:1", "player:zzz", "session:zzz"}, nil, 403},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			tk, code := h.ticket(c.who, c.topics...)
			if code != c.status {
				t.Fatalf("status %d, want %d", code, c.status)
			}
			if len(tk.Topics) != len(c.want) {
				t.Fatalf("accepted %v, want %v", tk.Topics, c.want)
			}
			for i, w := range c.want {
				if tk.Topics[i] != w {
					t.Fatalf("accepted %v, want %v", tk.Topics, c.want)
				}
			}
		})
	}
}

func TestAPassSentWithoutTheProxySecretIsAVisitors(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	req, _ := http.NewRequest(http.MethodPost, h.srv.URL+"/api/stream/ticket", strings.NewReader(`{"topics":["club:`+clubSmash+`"]}`))
	req.Header.Set(session.AppHeader, "club") // set by a caller that is not an app's proxy: nothing says which app the pass is for
	req.Header.Set("Authorization", "Bearer "+h.pass("club", smashLogin))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status %d, want 401: without the proxy secret the header is not believed", resp.StatusCode)
	}
}

func TestAnExpiredPassIsAskedToRefreshNotTreatedAsAVisitor(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	pass := h.pass("club", smashLogin)
	h.env.Clock.Set(testNow.Add(24 * time.Hour)) // far past the pass's life
	resp, err := h.ticketRequest(who{app: "club", pass: pass}, "club:"+clubSmash)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = resp.Body.Close() }()
	var body strings.Builder
	buf := make([]byte, 512)
	n, _ := resp.Body.Read(buf)
	body.Write(buf[:n])
	if resp.StatusCode != http.StatusUnauthorized || !strings.Contains(body.String(), `"expired"`) {
		t.Fatalf("%d %s: an expired pass must answer the distinct 401 expired, so the client refreshes once", resp.StatusCode, body.String())
	}
}

func TestATicketBodyThatIsNotJSONOrIsTooBigIsInvalid(t *testing.T) {
	h := newHarness(t, harnessOpts{noRun: true})
	for _, body := range []string{`{"topics": 5}`, `not json`, `{"topics":["` + strings.Repeat("a", 9000) + `"]}`} {
		req, _ := http.NewRequest(http.MethodPost, h.srv.URL+"/api/stream/ticket", strings.NewReader(body))
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		_ = resp.Body.Close()
		if resp.StatusCode != http.StatusUnprocessableEntity {
			t.Errorf("body %.20q = %d, want 422", body, resp.StatusCode)
		}
	}
	// No body at all is a ticket with nothing to watch (the bare ticket the route always gave).
	resp, err := http.Post(h.srv.URL+"/api/stream/ticket", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("a bare ticket = %d", resp.StatusCode)
	}
}

// What each audience receives for one write.
func TestEachAudienceReceivesOnlyWhatItMayRead(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	pub := "public-session:" + slugPrep
	visitorStream, _ := h.watch(visitor(), pub)
	smashStream, _ := h.watch(smash(h), "club:"+clubSmash, "session:"+sessionPrep)
	otherStream, _ := h.watch(who{app: "club", pass: h.pass("club", otherLogin)}, "club:"+clubOther)
	annStream, _ := h.watch(who{app: "player", pass: h.pass("player", annLogin)}, "player:"+playerAnn)
	benStream, _ := h.watch(who{app: "player", pass: h.pass("player", benLogin)}, "player:"+playerBen)
	adminStream, _ := h.watch(who{app: "admin", pass: h.pass("admin", adminLogin)}, "admin")

	// Smash's session changes, with a private kind and Ann's own result: a match that finished.
	id := h.commit(liveupdates.Event{ClubID: uid(clubSmash), SessionID: uid(sessionPrep), PlayerIDs: []pgtype.UUID{uid(playerAnn)}, Kind: liveupdates.KindPayments})[0]

	// The masked visitor learns that the page moved and to which version, and nothing else: no kind, no player.
	e := visitorStream.expect("changed")
	if want := `{"topic":"public-session:prep-open","version":` + itoa(id) + `,"kind":"changed"}`; e.Data != want {
		t.Fatalf("visitor data %s, want %s", e.Data, want)
	}
	if strings.Contains(e.Data, playerAnn) || strings.Contains(e.Data, "payments") {
		t.Fatalf("a masked visitor got private data: %s", e.Data)
	}
	visitorStream.quiet(150 * time.Millisecond)

	// The club sees its own session, with the kind.
	seen := map[string]string{}
	for range 2 {
		d := smashStream.expect("changed").changed(t)
		seen[d.Topic] = d.Kind
	}
	if seen["club:"+clubSmash] != "payments" || seen["session:"+sessionPrep] != "payments" {
		t.Fatalf("club saw %v", seen)
	}
	// Ann, whose result it is, hears of it on her own topic; Ben, another club and the others do not.
	if d := annStream.expect("changed").changed(t); d.Topic != "player:"+playerAnn || *d.Version != id {
		t.Fatalf("Ann saw %+v", d)
	}
	// The admin hears everything.
	if d := adminStream.expect("changed").changed(t); d.Topic != "admin" || d.Kind != "payments" {
		t.Fatalf("admin saw %+v", d)
	}
	benStream.quiet(150 * time.Millisecond)
	otherStream.quiet(150 * time.Millisecond)
	smashStream.quiet(50 * time.Millisecond)

	// Another club's change goes to its own club and to the admin only.
	h.commit(liveupdates.Event{ClubID: uid(clubOther), Kind: liveupdates.KindClub})
	if d := otherStream.expect("changed").changed(t); d.Topic != "club:"+clubOther {
		t.Fatalf("other club saw %+v", d)
	}
	if d := adminStream.expect("changed").changed(t); d.Topic != "admin" {
		t.Fatalf("admin saw %+v", d)
	}
	smashStream.quiet(150 * time.Millisecond)
	visitorStream.quiet(50 * time.Millisecond)
}

func TestAStreamKeepsWhatItWasGrantedAndTheTicketWorksOnce(t *testing.T) {
	h := newHarness(t, harnessOpts{})
	tk, _ := h.ticket(smash(h), "club:"+clubSmash)
	if h.open(tk.Ticket, "").resp.StatusCode != 200 {
		t.Fatal("first use refused")
	}
	if code := h.open(tk.Ticket, "").resp.StatusCode; code != http.StatusUnauthorized {
		t.Fatalf("second use = %d", code)
	}
}
