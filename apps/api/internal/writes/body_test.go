package writes_test

import (
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
