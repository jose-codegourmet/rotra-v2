package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"testing"
	"time"
)

// The golden files are captured from the TypeScript Route Handler sources by
// apps/api/testdata/tools/capture-golden.mjs. Change a field on purpose, rerun that script, commit.

func readGolden(t *testing.T, name string, into any) {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, into); err != nil {
		t.Fatal(err)
	}
}

// decoded turns any JSON bytes into generic values so key order never matters.
func decoded(t *testing.T, raw []byte) any {
	t.Helper()
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("invalid JSON %q: %v", raw, err)
	}
	return v
}

type errorsGolden struct {
	PrivateHeaders map[string]string `json:"private_headers"`
	PublicHeaders  map[string]string `json:"public_headers"`
	Internal       struct {
		Status int             `json:"status"`
		Body   json.RawMessage `json:"body"`
	} `json:"internal"`
	Fields map[string]string `json:"fields"`
	Codes  map[string]struct {
		Status         int             `json:"status"`
		Body           json.RawMessage `json:"body"`
		BodyWithFields json.RawMessage `json:"bodyWithFields"`
	} `json:"codes"`
}

func TestErrorContractMatchesRouteHandlers(t *testing.T) {
	var g errorsGolden
	readGolden(t, "errors.golden.json", &g)

	// Same set of codes both ways: a new Go code, or one dropped, fails until the golden is updated.
	var goCodes, tsCodes []string
	for _, c := range ErrorCodes() {
		goCodes = append(goCodes, string(c))
	}
	for c := range g.Codes {
		tsCodes = append(tsCodes, c)
	}
	sort.Strings(goCodes)
	sort.Strings(tsCodes)
	if !reflect.DeepEqual(goCodes, tsCodes) {
		t.Fatalf("error codes differ: go %v, golden %v", goCodes, tsCodes)
	}

	for code, want := range g.Codes {
		t.Run(code, func(t *testing.T) {
			rec := httptest.NewRecorder()
			WriteError(rec, ErrorCode(code), nil)
			if rec.Code != want.Status {
				t.Errorf("status %d, want %d", rec.Code, want.Status)
			}
			if !reflect.DeepEqual(decoded(t, rec.Body.Bytes()), decoded(t, want.Body)) {
				t.Errorf("body %s, want %s", rec.Body.Bytes(), want.Body)
			}

			rec = httptest.NewRecorder()
			WriteError(rec, ErrorCode(code), g.Fields)
			if !reflect.DeepEqual(decoded(t, rec.Body.Bytes()), decoded(t, want.BodyWithFields)) {
				t.Errorf("body with fields %s, want %s", rec.Body.Bytes(), want.BodyWithFields)
			}
		})
	}
}

func TestEmptyFieldsAreOmitted(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, ErrInvalid, map[string]string{})
	var body struct {
		Error map[string]any `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if _, has := body.Error["fields"]; has {
		t.Fatal("empty fields must be left out, like the TypeScript errorBody")
	}
}

func TestPrivateAndPublicHeadersMatchHandlers(t *testing.T) {
	var g errorsGolden
	readGolden(t, "errors.golden.json", &g)

	rec := httptest.NewRecorder()
	WriteJSON(rec, http.StatusOK, map[string]string{"ok": "yes"}, Private)
	assertHeaders(t, rec.Header(), g.PrivateHeaders)

	rec = httptest.NewRecorder()
	WriteJSON(rec, http.StatusOK, map[string]string{"ok": "yes"}, Public)
	assertHeaders(t, rec.Header(), g.PublicHeaders)

	// Errors are always private, even on a public read (handlePublicRead calls failure with PRIVATE_HEADERS).
	rec = httptest.NewRecorder()
	WriteError(rec, ErrNotFound, nil)
	assertHeaders(t, rec.Header(), g.PrivateHeaders)
}

func assertHeaders(t *testing.T, got http.Header, want map[string]string) {
	t.Helper()
	for k, v := range want {
		if got.Get(k) != v {
			t.Errorf("header %s = %q, want %q", k, got.Get(k), v)
		}
	}
	if len(got) != len(want) {
		t.Errorf("headers %v, want exactly %v", got, want)
	}
}

func TestUnexpectedErrorBodyMatchesHandlers(t *testing.T) {
	var g errorsGolden
	readGolden(t, "errors.golden.json", &g)
	rec := httptest.NewRecorder()
	WriteInternal(rec)
	if rec.Code != g.Internal.Status {
		t.Errorf("status %d, want %d", rec.Code, g.Internal.Status)
	}
	if !reflect.DeepEqual(decoded(t, rec.Body.Bytes()), decoded(t, g.Internal.Body)) {
		t.Errorf("body %s, want %s", rec.Body.Bytes(), g.Internal.Body)
	}
}

func TestUnknownErrorCodeBecomesInternal(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, ErrorCode("nope"), nil)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status %d", rec.Code)
	}
}

type serializeGolden struct {
	Helpers  map[string]json.RawMessage `json:"helpers"`
	Document json.RawMessage            `json:"document"`
}

func TestSerializationHelpersMatchTypeScript(t *testing.T) {
	var g serializeGolden
	readGolden(t, "serialize.golden.json", &g)
	at := time.Date(2026, 3, 4, 5, 6, 7, 89_000_000, time.UTC)
	whole := time.Date(2026, 3, 4, 5, 6, 7, 0, time.UTC)
	late := time.Date(2026, 3, 4, 23, 59, 59, 999_000_000, time.UTC)
	manila := time.Date(2026, 3, 5, 7, 59, 59, 0, time.FixedZone("PHT", 8*3600)) // 2026-03-04T23:59:59Z

	got := map[string]any{
		"toIso":            ToIso(at),
		"toIsoWholeSecond": ToIso(whole),
		"toIsoOrNullNull":  ToIsoOrNull(nil),
		"toDecimalString":  ToDecimalString(9007199254740993),
		"toDateOnly":       ToDateOnly(late),
		"toMoney":          ToMoney(ptr(int64(15000)), "PHP"),
		"toMoneyNull":      ToMoney(nil, "PHP"),
		"toMoneyZero":      ToMoney(ptr(int64(0)), "PHP"),
	}
	for name, want := range g.Helpers {
		raw, err := json.Marshal(got[name])
		if err != nil {
			t.Fatal(err)
		}
		if !reflect.DeepEqual(decoded(t, raw), decoded(t, want)) {
			t.Errorf("%s = %s, want %s", name, raw, want)
		}
	}
	if len(got) != len(g.Helpers) {
		t.Errorf("helper sets differ: %d in Go test, %d in golden", len(got), len(g.Helpers))
	}
	// Non-UTC input is normalised to UTC, as JS Date.toISOString always is.
	if ToIso(manila) != "2026-03-04T23:59:59.000Z" || ToDateOnly(manila) != "2026-03-04" {
		t.Errorf("non-UTC time not normalised: %s / %s", ToIso(manila), ToDateOnly(manila))
	}
}

func ptr[T any](v T) *T { return &v }

type nested struct {
	At   Instant `json:"at"`
	Big  BigInt  `json:"big"`
	None *string `json:"none"`
}

type document struct {
	ID          string    `json:"id"`
	Revision    BigInt    `json:"revision"`
	Sequence    BigInt    `json:"sequence"`
	Negative    BigInt    `json:"negative"`
	CreatedAt   Instant   `json:"createdAt"`
	WholeSecond Instant   `json:"wholeSecond"`
	EndedAt     *Instant  `json:"endedAt"`
	SessionDate DateOnly  `json:"sessionDate"`
	Fee         *Money    `json:"fee"`
	NoFee       *Money    `json:"noFee"`
	ZeroFee     *Money    `json:"zeroFee"`
	Flag        bool      `json:"flag"`
	Count       int       `json:"count"`
	Tags        []*string `json:"tags"`
	Nested      nested    `json:"nested"`
}

func TestTypedDocumentMatchesToJson(t *testing.T) {
	var g serializeGolden
	readGolden(t, "serialize.golden.json", &g)

	doc := document{
		ID:          "club_1",
		Revision:    9007199254740993,
		Sequence:    0,
		Negative:    -42,
		CreatedAt:   Instant(time.Date(2026, 3, 4, 5, 6, 7, 89_000_000, time.UTC)),
		WholeSecond: Instant(time.Date(2026, 3, 4, 5, 6, 7, 0, time.UTC)),
		EndedAt:     nil,
		SessionDate: DateOnly(time.Date(2026, 3, 4, 23, 59, 59, 999_000_000, time.UTC)),
		Fee:         ToMoney(ptr(int64(15000)), "PHP"),
		NoFee:       ToMoney(nil, "PHP"),
		ZeroFee:     ToMoney(ptr(int64(0)), "PHP"),
		Count:       3,
		Tags:        []*string{ptr("a"), nil, ptr("b")},
		Nested:      nested{At: Instant(time.Date(2026, 12, 31, 16, 0, 0, 0, time.UTC)), Big: 123},
	}
	raw, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(decoded(t, raw), decoded(t, g.Document)) {
		t.Fatalf("serialized document differs from the Route Handler output.\n got %s\nwant %s", raw, g.Document)
	}
}

func TestBigIntIsAStringOnTheWire(t *testing.T) {
	raw, err := json.Marshal(struct {
		N BigInt `json:"n"`
	}{N: 9007199254740993})
	if err != nil || string(raw) != `{"n":"9007199254740993"}` {
		t.Fatalf("%s %v", raw, err)
	}
}

func TestSerializedTypesRoundTrip(t *testing.T) {
	var b BigInt
	if err := json.Unmarshal([]byte(`"77"`), &b); err != nil || b != 77 {
		t.Fatalf("%v %v", b, err)
	}
	if err := json.Unmarshal([]byte(`77`), &b); err == nil {
		t.Fatal("a bare number must be refused: bigint travels as a string")
	}
	if err := json.Unmarshal([]byte(`"x"`), &b); err == nil {
		t.Fatal("non-numeric string must be refused")
	}
	var i Instant
	if err := json.Unmarshal([]byte(`"2026-03-04T05:06:07.089Z"`), &i); err != nil || ToIso(time.Time(i)) != "2026-03-04T05:06:07.089Z" {
		t.Fatalf("%v %v", i, err)
	}
	if err := json.Unmarshal([]byte(`"yesterday"`), &i); err == nil {
		t.Fatal("bad instant must be refused")
	}
	if err := json.Unmarshal([]byte(`5`), &i); err == nil {
		t.Fatal("non-string instant must be refused")
	}
	var d DateOnly
	if err := json.Unmarshal([]byte(`"2026-03-04"`), &d); err != nil || ToDateOnly(time.Time(d)) != "2026-03-04" {
		t.Fatalf("%v %v", d, err)
	}
	if err := json.Unmarshal([]byte(`"03/04/2026"`), &d); err == nil {
		t.Fatal("bad date must be refused")
	}
	if err := json.Unmarshal([]byte(`5`), &d); err == nil {
		t.Fatal("non-string date must be refused")
	}
}
