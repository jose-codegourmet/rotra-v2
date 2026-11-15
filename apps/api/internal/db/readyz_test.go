package db_test

import (
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func readyz(t *testing.T, p *db.Pool) int {
	t.Helper()
	h := httpapi.NewHandler(httpapi.Deps{
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)), Pinger: p,
		Readiness: httpapi.NewReadiness(), PingTimeout: 2 * time.Second, ProxySecret: "test-secret",
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	req.Header.Set(httpapi.ProxySecretHeader, "test-secret")
	h.ServeHTTP(rec, req)
	return rec.Code
}

func TestReadyzWithRealPool(t *testing.T) {
	dsn := testpg.NewDatabase(t)
	p, err := db.Open(context.Background(), dsn, db.Options{})
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	if got := readyz(t, p); got != http.StatusOK {
		t.Fatalf("real database: /readyz = %d, want 200", got)
	}
}

func TestReadyzNotReadyWhenDatabaseDown(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := l.Addr().String()
	_ = l.Close()
	p, err := db.Open(context.Background(), "postgres://u:p@"+addr+"/x?sslmode=disable", db.Options{})
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	if got := readyz(t, p); got != http.StatusServiceUnavailable {
		t.Fatalf("database down: /readyz = %d, want 503", got)
	}
}
