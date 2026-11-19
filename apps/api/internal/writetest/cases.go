package writetest

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// CaseFile is `<name>.cases.json`: hand-written, read by the capture and by Replay alike.
type CaseFile struct {
	// Now is the instant the clock is fixed to for every case (a case may override it).
	Now time.Time `json:"now"`
	// App is the X-Rotra-App value of every request: admin, player or club.
	App string `json:"app"`
	// Seed is the SQL file in testdata that every case starts from.
	Seed string `json:"seed"`
	// Scenarios are statements run after the seed, with foreign keys and triggers off, to start a case from a
	// changed state. The scenario "base" is the seed alone and must exist.
	Scenarios map[string][]string `json:"scenarios"`
	// Snapshot says what is read back after the steps of every case.
	Snapshot []SnapshotSpec `json:"snapshot"`
	Cases    []Case         `json:"cases"`
}

// SnapshotSpec is one table, or one query, whose rows are pinned after a case.
type SnapshotSpec struct {
	Name string `json:"name"`
	// SQL is a SELECT with a unique ORDER BY.
	SQL string `json:"sql"`
	// Redact lists the columns whose value is generated; each non-null value reads "<redacted>".
	Redact []string `json:"redact"`
}

// Case is one test: the steps run in order on the scenario's state.
type Case struct {
	Name     string     `json:"name"`
	Scenario string     `json:"scenario"`
	Now      *time.Time `json:"now"`
	Steps    []Step     `json:"steps"`
	// Redact adds columns to redact for this case, per snapshot name. It is for what shows who won a race, which is
	// not decided; say so next to the case.
	Redact map[string][]string `json:"redact"`
}

// Step is one request, or a set of requests sent together.
type Step struct {
	Method string `json:"method"`
	Path   string `json:"path"`
	// Who is the subject of the account that is signed in; nil is signed out.
	Who *string `json:"who"`
	// Body is the JSON body; RawBody is a body sent as is (not JSON, or JSON with odd bytes). Neither: no body.
	Body    json.RawMessage `json:"body"`
	RawBody *string         `json:"rawBody"`
	// Parallel sends these steps at the same moment; the other fields of this step are then not used.
	Parallel []Step `json:"parallel"`
	// Redact lists the dotted paths in the response body whose value is generated ("a.b", "list.*.id"). On a
	// parallel step it applies to every answer that has the path, and each path must be in at least one answer.
	Redact []string `json:"redact"`
	// GoExpects is where Go answers differently from the Route Handler on purpose.
	GoExpects *GoExpects `json:"goExpects"`
	// Allow500 lets the capture record a crash of the TypeScript (it fails on a 500 otherwise).
	Allow500 bool `json:"allow500"`
}

// GoExpects is the status and error code Go answers on purpose.
type GoExpects struct {
	Status int    `json:"status"`
	Code   string `json:"code"`
}

// Golden is `<name>.golden.json`: what the TypeScript answered and left behind, per case name.
type Golden map[string]GoldenCase

// GoldenCase is the recorded steps and the rows after them.
type GoldenCase struct {
	Steps []GoldenStep `json:"steps"`
	// DB is the snapshot: the spec's name, then its rows.
	DB map[string][]json.RawMessage `json:"db"`
}

// GoldenStep is one answer, or the answers of a parallel step (sorted: see Normalize).
type GoldenStep struct {
	Status   int               `json:"status,omitempty"`
	Headers  map[string]string `json:"headers,omitempty"`
	Body     json.RawMessage   `json:"body,omitempty"`
	Parallel []GoldenStep      `json:"parallel,omitempty"`
}

// ReadJSON reads a file of testdata into v.
func ReadJSON(t testing.TB, dir, name string, v any) {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(dir, name))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, v); err != nil {
		t.Fatalf("%s: %v", name, err)
	}
}

// decode reads JSON keeping numbers exact (a bigint stays its digits).
func decode(raw []byte) (any, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil, err
	}
	return v, nil
}

func readFile(dir, name string) ([]byte, error) { return os.ReadFile(filepath.Join(dir, name)) }
