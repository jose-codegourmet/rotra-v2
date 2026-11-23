package db_test

import (
	"context"
	"net"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

func TestOpenRejectsBadURL(t *testing.T) {
	if _, err := db.Open(context.Background(), "not a url", db.Options{}); err == nil {
		t.Fatal("expected error")
	}
}

func TestOpenRejectsNonPostgresURL(t *testing.T) {
	if _, err := db.Open(context.Background(), "http://example.com/x", db.Options{}); err == nil {
		t.Fatal("expected error")
	}
}

func TestPingFailsWhenDatabaseDown(t *testing.T) {
	// A port that was just free and has nothing listening.
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := l.Addr().String()
	_ = l.Close()

	p, err := db.Open(context.Background(), "postgres://u:p@"+addr+"/x?sslmode=disable", db.Options{})
	if err != nil {
		t.Fatalf("Open must not need the database to be up: %v", err)
	}
	defer p.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := p.Ping(ctx); err == nil {
		t.Fatal("Ping must fail with the database down")
	}
}

func TestPingAndGeneratedQueryAgainstRealPostgres(t *testing.T) {
	dsn := testpg.NewDatabase(t)
	testpg.ApplyMigrations(t, dsn)
	ctx := context.Background()
	p, err := db.Open(ctx, dsn, db.Options{MaxConns: 3})
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	if err := p.Ping(ctx); err != nil {
		t.Fatal(err)
	}
	rows, err := p.Queries().ListLocationCodes(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) < 6 {
		t.Fatalf("want the 6 founding cities, got %d", len(rows))
	}
	if rows[0].CityCode != "BCD" || rows[0].DisplayName != "Bacolod City" {
		t.Fatalf("unexpected first row (ORDER BY country, city): %+v", rows[0])
	}
}

func TestOptionsDefaults(t *testing.T) {
	dsn := testpg.NewDatabase(t)
	p, err := db.Open(context.Background(), dsn, db.Options{})
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	if got := p.Raw().Config().MaxConns; got != 10 {
		t.Fatalf("default MaxConns = %d, want 10", got)
	}
}

func TestIdleInTransactionTimeoutIsSetOnEveryConnectionTheOptionAsks(t *testing.T) {
	dsn := testpg.NewDatabase(t)
	ctx := context.Background()
	p, err := db.Open(ctx, dsn, db.Options{MaxConns: 2, IdleInTxTimeout: 1500 * time.Millisecond})
	if err != nil {
		t.Fatal(err)
	}
	defer p.Close()
	var got string
	if err := p.Raw().QueryRow(ctx, `SHOW idle_in_transaction_session_timeout`).Scan(&got); err != nil || got != "1500ms" {
		t.Fatalf("got %q (%v), want 1500ms", got, err)
	}
	// No option, no setting: the server's own default (off).
	plain, err := db.Open(ctx, dsn, db.Options{MaxConns: 1})
	if err != nil {
		t.Fatal(err)
	}
	defer plain.Close()
	if err := plain.Raw().QueryRow(ctx, `SHOW idle_in_transaction_session_timeout`).Scan(&got); err != nil || got != "0" {
		t.Fatalf("got %q (%v), want 0", got, err)
	}
}
