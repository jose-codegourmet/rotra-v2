package player_test

import (
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/player"
)

// fixtures are the sessions of the Vitest cases (player.rules.test.ts), dumped from genSessions of
// packages/data/src/fixtures/playerGames.ts with the same edits each case makes; now is PLAYER_FIXTURE_NOW. They are the
// fixtures, not captured answers: the expected values below are the cases' own.
type fixtures struct {
	Now  time.Time `json:"now"`
	Sets map[string][]struct {
		FinishedAt string `json:"finishedAt"`
		Games      []struct {
			Format, Counting, Result string
		} `json:"games"`
	} `json:"sets"`
}

func load(t *testing.T) (fixtures, int64) {
	t.Helper()
	raw, err := os.ReadFile("testdata/fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var f fixtures
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatal(err)
	}
	return f, f.Now.UnixMilli()
}

func (f fixtures) sessions(name string) []player.Session {
	var out []player.Session
	for _, s := range f.Sets[name] {
		sess := player.Session{FinishedAt: s.FinishedAt}
		for _, g := range s.Games {
			sess.Games = append(sess.Games, player.Game{Format: g.Format, Counting: g.Counting, Result: g.Result})
		}
		out = append(out, sess)
	}
	return out
}

func (f fixtures) stats(name string) []player.StatSession {
	var out []player.StatSession
	for _, s := range f.Sets[name] {
		sess := player.StatSession{FinishedAt: s.FinishedAt}
		for _, g := range s.Games {
			sess.Games = append(sess.Games, player.StatGame{Result: g.Result})
		}
		out = append(out, sess)
	}
	return out
}

func intp(n int) *int { return &n }

// The seven cases of "skill-rank progress and status" of player.rules.test.ts.
func TestSkillRankProgressAndStatus(t *testing.T) {
	f, now := load(t)
	input := player.RankInput{Level: intp(5), State: "established", RecentCount: 9, MatchRequirement: 10}
	with := func(edit func(*player.RankInput)) player.RankInput {
		in := input
		edit(&in)
		return in
	}
	t.Run("nine standard plus twenty fun games cannot meet ten", func(t *testing.T) {
		if n := player.CountRecentStandardMatches(f.sessions("nine_plus_twenty_fun"), now, player.WindowDays); n != 9 {
			t.Errorf("counted %d, want 9", n)
		}
	})
	t.Run("old games do not count", func(t *testing.T) {
		if n := player.CountRecentStandardMatches(f.sessions("old_14_at_100_days"), now, player.WindowDays); n != 0 {
			t.Errorf("counted %d, want 0", n)
		}
	})
	t.Run("partial and fun never count even in standard formats", func(t *testing.T) {
		if n := player.CountRecentStandardMatches(f.sessions("partial_12_alternating"), now, player.WindowDays); n != 0 {
			t.Errorf("counted %d, want 0", n)
		}
	})
	t.Run("reassessment takes precedence on the skill card", func(t *testing.T) {
		got := player.RankDisplayStatus(with(func(in *player.RankInput) { in.State, in.Position = "needs_reassessment", intp(128) }))
		if got != "needs-reassessment" {
			t.Errorf("status %q", got)
		}
	})
	t.Run("missing level is not calculated, never Beginner", func(t *testing.T) {
		got := player.RankDisplayStatus(with(func(in *player.RankInput) { in.Level, in.Position = nil, intp(1) }))
		if got != "not-calculated" {
			t.Errorf("status %q", got)
		}
	})
	t.Run("preserves prototype status precedence", func(t *testing.T) {
		for _, c := range []struct {
			name string
			in   player.RankInput
			want string
		}{
			{"updating", with(func(in *player.RankInput) { in.Position, in.UpdatePending = intp(128), true }), "updating"},
			{"on-leaderboard", with(func(in *player.RankInput) { in.Position = intp(128) }), "on-leaderboard"},
			{"qualifies", with(func(in *player.RankInput) { in.RecentCount = 12 }), "qualifies"},
			{"provisional", input, "provisional"},
		} {
			if got := player.RankDisplayStatus(c.in); got != c.want {
				t.Errorf("%s: status %q", c.name, got)
			}
		}
	})
	t.Run("includes the reference boundary but excludes future results", func(t *testing.T) {
		if n := player.CountRecentStandardMatches(f.sessions("boundary_3_at_90_days"), now, player.WindowDays); n != 3 {
			t.Errorf("at 90 days: counted %d, want 3", n)
		}
		if n := player.CountRecentStandardMatches(f.sessions("boundary_3_in_the_future"), now, player.WindowDays); n != 0 {
			t.Errorf("in the future: counted %d, want 0", n)
		}
	})
}

// The two cases of "Stats · last 90 days (#731)".
func TestStatsLast90Days(t *testing.T) {
	f, now := load(t)
	t.Run("counts every game inside the rank window, wins and losses, and a whole-percent rate", func(t *testing.T) {
		sessions := f.stats("stats_12")
		stats := player.RecentGameStats(sessions, now, player.WindowDays)
		inside, wins := 0, 0
		for _, s := range sessions {
			at, _ := time.Parse(time.RFC3339Nano, s.FinishedAt)
			if at.UnixMilli() < now-90*86400000 {
				continue
			}
			for _, g := range s.Games {
				inside++
				if g.Result == "won" {
					wins++
				}
			}
		}
		if stats == nil || stats.Games != inside || stats.Wins != wins || stats.Wins+stats.Losses != stats.Games {
			t.Fatalf("stats %+v, want %d games, %d wins", stats, inside, wins)
		}
		if want := int(float64(wins)/float64(inside)*100 + 0.5); stats.WinRate != want {
			t.Errorf("rate %d, want %d", stats.WinRate, want)
		}
	})
	t.Run("is null without games in the window", func(t *testing.T) {
		if player.RecentGameStats(nil, now, player.WindowDays) != nil {
			t.Error("no sessions is no stats")
		}
		if player.RecentGameStats(f.stats("old_3_at_120_days"), now, player.WindowDays) != nil {
			t.Error("sessions older than the window are no stats")
		}
	})
}

// Go-only: what the Vitest cases do not reach.
func TestWindowEdges(t *testing.T) {
	_, now := load(t)
	at := func(ms int64) string { return time.UnixMilli(ms).UTC().Format(time.RFC3339Nano) }
	one := func(finished string) []player.Session {
		return []player.Session{{FinishedAt: finished, Games: []player.Game{{Format: "doubles", Counting: "counted", Result: "won"}, {Format: "singles", Counting: "counted", Result: "lost"}, {Format: "fun_3v3", Counting: "counted"}}}}
	}
	for _, c := range []struct {
		name     string
		finished string
		want     int
	}{
		{"exactly now", at(now), 2},
		{"a millisecond after now", at(now + 1), 0},
		{"exactly at the start", at(now - 90*86400000), 2},
		{"a millisecond before the start", at(now - 90*86400000 - 1), 0},
		{"not a date", "yesterday", 0},
		{"empty", "", 0},
	} {
		if got := player.CountRecentStandardMatches(one(c.finished), now, player.WindowDays); got != c.want {
			t.Errorf("%s: %d, want %d", c.name, got, c.want)
		}
	}
	rate := func(wins, games int) int {
		var s player.StatSession
		s.FinishedAt = at(now)
		for i := 0; i < games; i++ {
			g := player.StatGame{Result: "lost"}
			if i < wins {
				g.Result = "won"
			}
			s.Games = append(s.Games, g)
		}
		return player.RecentGameStats([]player.StatSession{s}, now, player.WindowDays).WinRate
	}
	// Math.round rounds a half up: 1 of 8 is 12.5 percent, 3 of 8 is 37.5, 1 of 3 is 33.33.
	if rate(1, 8) != 13 || rate(3, 8) != 38 || rate(1, 3) != 33 || rate(2, 3) != 67 || rate(0, 4) != 0 || rate(4, 4) != 100 {
		t.Errorf("rates %d %d %d %d %d %d", rate(1, 8), rate(3, 8), rate(1, 3), rate(2, 3), rate(0, 4), rate(4, 4))
	}
	if got := player.RankDisplayStatus(player.RankInput{Level: intp(1), RecentCount: 10, MatchRequirement: 10}); got != "qualifies" {
		t.Errorf("exactly the requirement qualifies: %q", got)
	}
}

// The three cases of "Profile visibility › name masking (D-2026-11-12-01)".
func TestNameMasking(t *testing.T) {
	visitor := player.NameViewer{}
	signedIn := player.NameViewer{SignedIn: true}
	self := player.NameViewer{SignedIn: true, IsSelf: true}
	queueMaster := player.NameViewer{QueueMaster: true}
	t.Run("never masks a public profile", func(t *testing.T) {
		if player.IsNameMasked("public", visitor) || player.IsNameMasked("public", signedIn) {
			t.Error("a public profile is never masked")
		}
	})
	t.Run("masks a private profile for visitors only", func(t *testing.T) {
		if !player.IsNameMasked("private", visitor) || player.IsNameMasked("private", signedIn) || player.IsNameMasked("private", self) {
			t.Error("a private profile is masked for a visitor only")
		}
	})
	t.Run("masks an always-private profile for everyone but the player and their Queue Master", func(t *testing.T) {
		if !player.IsNameMasked("always_private", visitor) || !player.IsNameMasked("always_private", signedIn) ||
			player.IsNameMasked("always_private", self) || player.IsNameMasked("always_private", queueMaster) {
			t.Error("an always-private profile is masked for everyone but the player and the Queue Master")
		}
	})
	t.Run("an unknown level is never masked", func(t *testing.T) {
		if player.IsNameMasked("friends", visitor) {
			t.Error("only the three levels mask")
		}
	})
}

// The case of "Hide me from Player Information".
func TestListedInDirectory(t *testing.T) {
	if !player.IsListedInDirectory(nil) || !player.IsListedInDirectory(&player.DirectoryProfile{}) ||
		!player.IsListedInDirectory(&player.DirectoryProfile{HiddenFromDirectory: false}) {
		t.Error("a profile is listed unless the switch is on, including a missing one")
	}
	if player.IsListedInDirectory(&player.DirectoryProfile{HiddenFromDirectory: true}) {
		t.Error("a profile with the switch on is not listed")
	}
}
