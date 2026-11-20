package sessionresult_test

import (
	"encoding/json"
	"math"
	"os"
	"reflect"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessionresult"
)

// snapshot.golden.json is captured from the real TypeScript (testdata/tools/capture-sessionresult.test.mjs): createResultSnapshot and
// awardBaseline run over a seeded grid of sessions. The answer is compared as decoded JSON, so every score and rate must be the same
// double the TypeScript computed, and every list in the same order.
type goldenFile struct {
	Snapshots []struct {
		SessionID string                             `json:"sessionId"`
		Roster    []model.Player                     `json:"roster"`
		Matches   []model.Match                      `json:"matches"`
		History   []sessionresult.PlayerAwardHistory `json:"history"`
		Players   []struct {
			ID       string  `json:"id"`
			PlayerID *string `json:"playerId"`
		} `json:"players"`
		GeneratedAt int64           `json:"generatedAt"`
		Out         json.RawMessage `json:"out"`
	} `json:"snapshots"`
	Baselines []struct {
		ClubPlayerIDs []string `json:"clubPlayerIds"`
		PriorSessions []struct {
			ClubPlayerID string `json:"clubPlayerId"`
			SessionID    string `json:"sessionId"`
		} `json:"priorSessions"`
		PriorFacts []struct {
			ClubPlayerID      string `json:"clubPlayerId"`
			SessionID         string `json:"sessionId"`
			FullParticipation bool   `json:"fullParticipation"`
			Team              string `json:"team"`
			WinningTeam       string `json:"winningTeam"`
		} `json:"priorFacts"`
		Out json.RawMessage `json:"out"`
	} `json:"baselines"`
}

func readGolden(t *testing.T) goldenFile {
	t.Helper()
	raw, err := os.ReadFile("testdata/snapshot.golden.json")
	if err != nil {
		t.Fatal(err)
	}
	var g goldenFile
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	return g
}

// asJSON turns a value into decoded JSON, the form both sides are compared in.
func asJSON(t *testing.T, v any) any {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return decode(t, raw)
}

func decode(t *testing.T, raw []byte) any {
	t.Helper()
	var out any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func TestResultSnapshotGolden(t *testing.T) {
	g := readGolden(t)
	var mvp, improved, offDay, credited int
	for _, c := range g.Snapshots {
		var refs []sessionresult.ClubPlayerRef
		for _, p := range c.Players {
			refs = append(refs, sessionresult.ClubPlayerRef{ID: p.ID, PlayerID: p.PlayerID})
		}
		got := sessionresult.CreateResultSnapshot(c.SessionID, c.Roster, c.Matches, c.History, refs, c.GeneratedAt)
		wire := map[string]any{
			"sessionId": got.SessionID, "standings": got.Standings, "awards": got.Awards, "calculationVersion": got.CalculationVersion,
			"priorSessionCounts": got.PriorSessionCounts, "generatedAt": got.GeneratedAt,
		}
		if !reflect.DeepEqual(asJSON(t, wire), decode(t, c.Out)) {
			t.Errorf("session %s differs:\n got  %s\n want %s", c.SessionID, mustJSON(t, wire), c.Out)
		}
		if got.Awards.MVP != nil {
			mvp++
		}
		if got.Awards.MostImproved != nil {
			improved++
		}
		if len(got.Awards.OffDay) > 0 {
			offDay++
		}
		for _, m := range c.Matches {
			for _, s := range m.Substitutions {
				if !s.CreditTo.IsZero() {
					credited++
				}
			}
		}
	}
	// The grid must reach each award and each credit choice, or it pins nothing.
	if len(g.Snapshots) < 100 || mvp < 50 || improved < 20 || offDay < 20 || credited < 20 {
		t.Errorf("the grid is too thin: %d sessions, %d mvp, %d most improved, %d off day, %d credited substitutions", len(g.Snapshots), mvp, improved, offDay, credited)
	}
}

func mustJSON(t *testing.T, v any) string {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return string(raw)
}

func TestAwardBaselineGolden(t *testing.T) {
	g := readGolden(t)
	for i, c := range g.Baselines {
		var sessions []sessionresult.PriorSession
		for _, s := range c.PriorSessions {
			sessions = append(sessions, sessionresult.PriorSession{ClubPlayerID: s.ClubPlayerID, SessionID: s.SessionID})
		}
		var facts []sessionresult.PriorFact
		for _, f := range c.PriorFacts {
			facts = append(facts, sessionresult.PriorFact{ClubPlayerID: f.ClubPlayerID, SessionID: f.SessionID, FullParticipation: f.FullParticipation, Team: f.Team, WinningTeam: f.WinningTeam})
		}
		got := sessionresult.AwardBaseline(c.ClubPlayerIDs, sessions, facts)
		if !reflect.DeepEqual(asJSON(t, got), decode(t, c.Out)) {
			t.Errorf("baseline %d differs:\n got  %s\n want %s", i, mustJSON(t, got), c.Out)
		}
	}
}

// Every exponent the awards can reach is in the table, so the math.Pow fallback is never used.
func TestPow10TableCoversEveryReachableExponent(t *testing.T) {
	averages := map[float64]bool{4: true}
	for size := 1; size <= 5; size++ {
		for sum := 0; sum <= 8*size; sum++ {
			averages[float64(sum)/float64(size)] = true
		}
	}
	missing := 0
	for own := range averages {
		for other := range averages {
			y := (other - own) / 2
			if !sessionresult.InPow10Table(y) {
				missing++
			}
		}
	}
	if missing != 0 {
		t.Errorf("%d reachable exponents are not in the table", missing)
	}
	if math.IsNaN(sessionresult.Pow10(0)) {
		t.Error("10 ** 0 is NaN")
	}
}
