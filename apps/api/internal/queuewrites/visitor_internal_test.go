package queuewrites

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReceiptIsAnHMACOfTheRequestID(t *testing.T) {
	s := &server{visitorSecret: "capture-visitor-receipt-secret"}
	got, err := s.receiptFor("a3400000-0000-4000-8000-000000000101")
	// The value the real TypeScript made for this id and secret (visitor.golden.json, join_a_slot, Set-Cookie).
	if err != nil || got != "_96hGElYf2D7Y_Da1yrBe4dLxttXqoRbD1JKlQNFuQE" {
		t.Fatalf("receipt %q %v", got, err)
	}
	for receipt, want := range map[string]bool{got: true, got + "x": false, got[:len(got)-1]: false, "": false, strings.ToUpper(got): false} {
		if ok, err := s.receiptMatches("a3400000-0000-4000-8000-000000000101", receipt); err != nil || ok != want {
			t.Errorf("receipt %q matches %v (%v), want %v", receipt, ok, err, want)
		}
	}
	if _, err := (&server{}).receiptFor("x"); err == nil {
		t.Error("no secret: want unavailable")
	}
}

func TestReceiptCookieIsSecureOverHTTPS(t *testing.T) {
	plain := httptest.NewRequest(http.MethodPost, "/", nil)
	if got := receiptCookie(plain, "prep-open", "id", "r"); got != "rotra_join_request=id.r; Path=/api/public-sessions/prep-open; HttpOnly; SameSite=lax" {
		t.Errorf("plain: %s", got)
	}
	secure := httptest.NewRequest(http.MethodPost, "/", nil)
	secure.Header.Set("X-Forwarded-Proto", "https")
	if got := receiptCookie(secure, "prep-open", "id", "r"); got != "rotra_join_request=id.r; Path=/api/public-sessions/prep-open; Secure; HttpOnly; SameSite=lax" {
		t.Errorf("secure: %s", got)
	}
}

// cookieValue reads a cookie the way Next's RequestCookies does.
func TestCookieValue(t *testing.T) {
	for _, c := range []struct {
		header, want string
		found        bool
	}{
		{"", "", false},
		{"other=1", "", false},
		{"rotra_join_request=a.b", "a.b", true},
		{"x=1; rotra_join_request=a.b; y=2", "a.b", true},
		{"x=1;rotra_join_request=a.b", "a.b", true},
		{"rotra_join_request=a%2Eb", "a.b", true},
		{"rotra_join_request=first; rotra_join_request=second", "second", true},
		{"rotra_join_request=first; rotra_join_request=%E0%A4%A", "first", true},
		{"rotra_join_request", "true", true},
		{"rotra_join_request=", "", true},
	} {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		if c.header != "" {
			r.Header.Set("Cookie", c.header)
		}
		got, found := cookieValue(r, receiptCookieName)
		if got != c.want || found != c.found {
			t.Errorf("%q: got %q %v, want %q %v", c.header, got, found, c.want, c.found)
		}
	}
}
