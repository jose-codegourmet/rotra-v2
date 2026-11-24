package liveupdates_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/adminwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/playerwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/queuewrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
)

type noReviewer struct{}

func (noReviewer) Review(context.Context, uuid.UUID, string, recovery.ReviewInput) (recovery.ReviewResult, error) {
	return recovery.ReviewResult{}, nil
}

// writeRoutes is every write route the signed-in router carries, as "<app> <pattern>".
func writeRoutes(t *testing.T) []string {
	t.Helper()
	rt := signedin.NewRouter()
	pool, auth := &pgxpool.Pool{}, &session.Authenticator{}
	hasher, err := password.NewHasher(password.DefaultParams(), 1)
	if err != nil {
		t.Fatal(err)
	}
	q, err := queuewrites.Routes(queuewrites.Deps{Pool: pool, Auth: auth})
	if err != nil {
		t.Fatal(err)
	}
	a, err := adminwrites.Routes(adminwrites.Deps{Pool: pool, Auth: auth, Hasher: hasher, PasswordResets: noReviewer{}})
	if err != nil {
		t.Fatal(err)
	}
	p, err := playerwrites.Routes(playerwrites.Deps{Pool: pool, Auth: auth})
	if err != nil {
		t.Fatal(err)
	}
	q(rt)
	a(rt)
	p(rt)
	var out []string
	for pattern, auds := range rt.Patterns() {
		if !liveupdates.IsWrite(pattern) {
			continue
		}
		for _, aud := range auds {
			out = append(out, string(aud)+" "+pattern)
		}
	}
	sort.Strings(out)
	return out
}

// No write is missed: every write route of the signed-in router is classified, as adding an event or as one that needs none.
func TestEveryWriteRouteIsClassified(t *testing.T) {
	routes := writeRoutes(t)
	if len(routes) < 100 {
		t.Fatalf("only %d write routes found: the registration helpers changed", len(routes))
	}
	table := liveupdates.Classified()
	for _, r := range routes {
		route, ok := table[r]
		switch {
		case !ok:
			t.Errorf("write route %q has no live-update classification: add it to liveupdates/routes.go as a Kind, or as a Skip with its reason", r)
		case route.Kind == "" && route.Skip == "":
			t.Errorf("%q is classified with neither a kind nor a reason", r)
		case route.Kind != "" && route.Skip != "":
			t.Errorf("%q has both a kind and a reason to skip", r)
		}
	}
}

// And the other direction: the table lists no route that does not exist (a renamed route would leave its old line behind).
func TestTheClassificationListsNoRouteThatIsGone(t *testing.T) {
	have := map[string]bool{}
	for _, r := range writeRoutes(t) {
		have[r] = true
	}
	// Routes registered straight on the mux (sign-in, claim, registration, recovery) are found in the source.
	src := sourceWritePatterns(t)
	for key := range liveupdates.Classified() {
		app, pattern, _ := strings.Cut(key, " ")
		if app == "-" {
			if !src[pattern] {
				t.Errorf("%q is classified but no source registers it", key)
			}
			continue
		}
		if !have[key] {
			t.Errorf("%q is classified but no router registers it", key)
		}
	}
}

var writeLiteral = regexp.MustCompile(`"((?:POST|PUT|PATCH|DELETE) /[^"\s]*)"`)

// sourceWritePatterns finds every write pattern written as a plain string in the non-test source of the API.
func sourceWritePatterns(t *testing.T) map[string]bool {
	t.Helper()
	found := map[string]bool{}
	root := ".." // internal/
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() && (d.Name() == "sqlcgen" || d.Name() == "testdata") {
			return filepath.SkipDir
		}
		if d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") || strings.Contains(path, "liveupdates/") {
			return nil
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, line := range strings.Split(string(raw), "\n") {
			if strings.HasPrefix(strings.TrimSpace(line), "//") {
				continue // an example in a comment is not a route
			}
			for _, m := range writeLiteral.FindAllStringSubmatch(line, -1) {
				found[m[1]] = true
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return found
}

// A write pattern written as a plain string anywhere in the source must be classified under some app, so a route added outside the
// shared router (on the mux) is still caught.
func TestEveryWritePatternInTheSourceIsClassified(t *testing.T) {
	classified := map[string]bool{}
	for key := range liveupdates.Classified() {
		_, pattern, _ := strings.Cut(key, " ")
		classified[pattern] = true
	}
	src := sourceWritePatterns(t)
	if len(src) < 20 {
		t.Fatalf("found only %d write patterns in the source", len(src))
	}
	for pattern := range src {
		if !classified[pattern] && !strings.HasPrefix(pattern, "POST /api/stream/") {
			t.Errorf("write pattern %q is in the source but not classified for live updates", pattern)
		}
	}
}

func TestScopedWrapsOnlyRoutesThatAddEvents(t *testing.T) {
	sawScope := func(app, pattern string) (scoped bool) {
		h := liveupdates.Scoped(app, pattern, http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			liveupdates.Note(r.Context(), uid(clubSmash), uid(sessionPrep))
			scoped = liveupdates.Pending(r.Context()) == 1
		}))
		h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/", nil))
		return scoped
	}
	if !sawScope("club", "POST /api/sessions/{sessionId}/payments") {
		t.Error("a classified write runs with no scope")
	}
	if sawScope("player", "PATCH /api/me/profile") {
		t.Error("a route that adds no event got a scope")
	}
	if sawScope("club", "POST /api/not-a-route") {
		t.Error("an unknown route got a scope")
	}
	if !liveupdates.IsWrite("DELETE /x") || liveupdates.IsWrite("GET /x") || liveupdates.IsWrite("OPTIONS /x") {
		t.Error("IsWrite")
	}
}

func TestTheAuditHookSeesWhatARouteDid(t *testing.T) {
	var got []liveupdates.Observation
	liveupdates.Audit = func(o liveupdates.Observation) { got = append(got, o) }
	defer func() { liveupdates.Audit = nil }()
	h := liveupdates.Scoped("club", "POST /api/sessions/{sessionId}/payments", http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/", nil))
	if len(got) != 1 || got[0].Status != http.StatusCreated || got[0].Pattern != "POST /api/sessions/{sessionId}/payments" || got[0].App != "club" || got[0].Appended != 0 || got[0].Transactions != 0 {
		t.Fatalf("observed %+v", got)
	}
}
