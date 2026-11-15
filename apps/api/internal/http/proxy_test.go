package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

const testSecret = "proxy-secret-for-tests"

func secretDeps() Deps {
	return Deps{Logger: discardLogger(), Pinger: fakePinger{}, Readiness: NewReadiness(), ProxySecret: testSecret}
}

func ipEcho(m *http.ServeMux) {
	m.HandleFunc("GET /api/ip", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(ClientIPFrom(r.Context())))
	})
}

func do(h http.Handler, method, path string, hdr map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	req.RemoteAddr = "203.0.113.9:4444"
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestWithoutSecretOnlyHealthzAndStreamRoutesAnswer(t *testing.T) {
	h := NewHandler(secretDeps(), ipEcho)
	if rec := do(h, "GET", "/healthz", nil); rec.Code != 200 {
		t.Fatalf("healthz %d", rec.Code)
	}
	for _, p := range []string{"/readyz", "/api/ip", "/anything", "/api/stream/ticket/x"} {
		if rec := do(h, "GET", p, nil); rec.Code != 404 {
			t.Errorf("%s without secret = %d, want 404", p, rec.Code)
		}
	}
	if rec := do(h, "POST", "/api/stream/ticket", nil); rec.Code != 200 {
		t.Fatalf("ticket route must be reachable without the secret, got %d", rec.Code)
	}
	if rec := do(h, "GET", "/stream", nil); rec.Code != 401 {
		t.Fatalf("stream route must reach the ticket check, got %d", rec.Code)
	}
}

func TestWrongSecretIsTreatedAsNoSecret(t *testing.T) {
	h := NewHandler(secretDeps(), ipEcho)
	for _, v := range []string{"wrong", "", testSecret + "x", testSecret[:5]} {
		if rec := do(h, "GET", "/api/ip", map[string]string{ProxySecretHeader: v}); rec.Code != 404 {
			t.Errorf("secret %q = %d, want 404", v, rec.Code)
		}
	}
}

func TestCorrectSecretOpensEverything(t *testing.T) {
	h := NewHandler(secretDeps(), ipEcho)
	rec := do(h, "GET", "/api/ip", map[string]string{ProxySecretHeader: testSecret})
	if rec.Code != 200 {
		t.Fatalf("%d", rec.Code)
	}
	if rec := do(h, "GET", "/readyz", map[string]string{ProxySecretHeader: testSecret}); rec.Code != 200 {
		t.Fatalf("readyz %d", rec.Code)
	}
}

func TestForwardedIPTrustedOnlyWithCorrectSecret(t *testing.T) {
	h := NewHandler(secretDeps(), ipEcho)
	ok := map[string]string{ProxySecretHeader: testSecret}

	ok["X-Forwarded-For"] = "198.51.100.7, 10.0.0.1"
	if got := do(h, "GET", "/api/ip", ok).Body.String(); got != "198.51.100.7" {
		t.Errorf("xff with secret = %q", got)
	}
	ok["X-Real-IP"] = "198.51.100.8"
	if got := do(h, "GET", "/api/ip", ok).Body.String(); got != "198.51.100.8" {
		t.Errorf("x-real-ip wins = %q", got)
	}
	ok["X-Real-IP"] = "not-an-ip"
	ok["X-Forwarded-For"] = "also bad"
	if got := do(h, "GET", "/api/ip", ok).Body.String(); got != "203.0.113.9" {
		t.Errorf("unparseable forwarded value falls back to the connection, got %q", got)
	}
}

func TestFakedForwardedIPIgnoredWithoutSecret(t *testing.T) {
	for _, secret := range []string{"", "wrong", "wrong-but-long-enough-to-matter"} {
		req := httptest.NewRequest("GET", "/x", nil)
		req.RemoteAddr = "203.0.113.9:4444"
		req.Header.Set("X-Forwarded-For", "1.2.3.4")
		req.Header.Set("X-Real-IP", "5.6.7.8")
		req.Header.Set(ProxySecretHeader, secret)
		if ip, trusted := resolveClient(req, testSecret); trusted || ip != "203.0.113.9" {
			t.Errorf("secret %q: ip %q trusted %v", secret, ip, trusted)
		}
	}
}

func TestNoConfiguredSecretMeansEveryRequestIsUntrusted(t *testing.T) {
	d := secretDeps()
	d.ProxySecret = ""
	h := NewHandler(d, ipEcho)
	for _, v := range []string{"", "anything"} {
		if rec := do(h, "GET", "/api/ip", map[string]string{ProxySecretHeader: v}); rec.Code != 404 {
			t.Errorf("header %q with no configured secret = %d, want 404", v, rec.Code)
		}
	}
	if rec := do(h, "GET", "/healthz", nil); rec.Code != 200 {
		t.Fatal("healthz must stay open")
	}
}

func TestRemoteAddrWithoutPortIsUsedAsIs(t *testing.T) {
	req := httptest.NewRequest("GET", "/healthz", nil)
	req.RemoteAddr = "203.0.113.50"
	if ip, _ := resolveClient(req, ""); ip != "203.0.113.50" {
		t.Fatal(ip)
	}
	if ClientIPFrom(req.Context()) != "" {
		t.Fatal("no IP outside a request")
	}
}
