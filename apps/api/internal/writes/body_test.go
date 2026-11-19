package writes_test

import (
	"math"
	"net/http/httptest"
	"strings"
	"testing"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

func read(body string) (writes.Body, error) {
	return writes.ReadBody(httptest.NewRequest("POST", "/", strings.NewReader(body)))
}

func TestReadBodyAcceptsAnObjectAndIgnoresWhatItDoesNotKnow(t *testing.T) {
	b, err := read(`{"name":"x","on":true,"n":5,"extra":{"a":1}}`)
	if err != nil {
		t.Fatal(err)
	}
	if b.Text("name") != "x" || b.Text("n") != "" || b.Text("missing") != "" || b.Text("extra") != "" {
		t.Errorf("text reads: %v", b)
	}
	if v, ok := b.Bool("on"); !v || !ok {
		t.Error("on is the boolean true")
	}
	if _, ok := b.Bool("name"); ok {
		t.Error("a string is not a boolean")
	}
	if v, ok := b.Bool("missing"); v || ok {
		t.Error("a missing field is not a boolean")
	}
}

func TestReadBodyKeepsTheLastDuplicateAndDropsABOM(t *testing.T) {
	b, err := read("\xef\xbb\xbf" + `{"a":"first","a":"last"}`)
	if err != nil || b.Text("a") != "last" {
		t.Errorf("body %v err %v", b, err)
	}
}

func TestReadBodyRefusesEverythingThatIsNotAnObject(t *testing.T) {
	for _, body := range []string{"", "null", "[]", `[{"a":1}]`, `"x"`, "5", "true", "{", `{"a":1} x`, `{"a":1}{"b":2}`, "not json", strings.Repeat("a", 2<<20)} {
		_, err := read(body)
		var se *writes.Error
		if err == nil || !asError(err, &se) || se.Code != httpapi.ErrInvalid || se.Fields != nil {
			t.Errorf("%.20q: err %v", body, err)
		}
	}
}

func asError(err error, into **writes.Error) bool {
	e, ok := err.(*writes.Error)
	*into = e
	return ok
}

func TestNumberReadsADoubleLikeJavaScript(t *testing.T) {
	b, err := read(`{"i":7000,"f":7000.5,"e":7e3,"big":1e999,"neg":-1e999,"tiny":1e-999,"s":"5","n":null,"t":true,"ulp":7000.0000000000001}`)
	if err != nil {
		t.Fatal(err)
	}
	for key, want := range map[string]float64{"i": 7000, "f": 7000.5, "e": 7000, "big": math.Inf(1), "neg": math.Inf(-1), "tiny": 0, "ulp": 7000} {
		if got := b.Number(key); got != want {
			t.Errorf("%s: %v, want %v", key, got, want)
		}
	}
	for _, key := range []string{"s", "n", "t", "missing"} {
		if got := b.Number(key); !math.IsNaN(got) {
			t.Errorf("%s: %v, want NaN", key, got)
		}
	}
	if v, ok := b.NumberOrNull("n"); ok || v != 0 {
		t.Error("null is no value")
	}
	if v, ok := b.NumberOrNull("missing"); ok || v != 0 {
		t.Error("missing is no value")
	}
	if v, ok := b.NumberOrNull("i"); !ok || v != 7000 {
		t.Error("7000")
	}
	if v, ok := b.NumberOrNull("s"); !ok || !math.IsNaN(v) {
		t.Error("a string is a value that is NaN")
	}
	if !b.Has("n") || b.Has("missing") {
		t.Error("Has is `in`: null counts")
	}
}

func TestObjectIsOnlyAJSONObject(t *testing.T) {
	b, err := read(`{"o":{"a":"x"},"arr":[],"s":"free","n":null}`)
	if err != nil {
		t.Fatal(err)
	}
	if b.Object("o").Text("a") != "x" {
		t.Error("an object")
	}
	for _, k := range []string{"arr", "s", "n", "missing"} {
		if b.Object(k) != nil {
			t.Errorf("%s is no object", k)
		}
	}
}
