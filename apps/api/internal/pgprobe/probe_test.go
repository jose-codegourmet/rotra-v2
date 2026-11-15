package pgprobe

import (
	"context"
	"net"
	"testing"
	"time"
)

func TestFromURLDefaultsPort(t *testing.T) {
	p, err := FromURL("postgres://u:pw@db.internal/rotra")
	if err != nil || p.Addr != "db.internal:5432" {
		t.Fatalf("%+v %v", p, err)
	}
	p, err = FromURL("postgresql://u:pw@db.internal:6543/rotra?sslmode=require")
	if err != nil || p.Addr != "db.internal:6543" {
		t.Fatalf("%+v %v", p, err)
	}
}

func TestFromURLRejectsBadInput(t *testing.T) {
	for _, u := range []string{"", "not a url", "http://x/y", "postgres:///nohost"} {
		if _, err := FromURL(u); err == nil {
			t.Errorf("%q should be refused", u)
		}
	}
}

func TestPingUpAndDown(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	p := Probe{Addr: ln.Addr().String()}
	if err := p.Ping(context.Background()); err != nil {
		t.Fatalf("listener is up: %v", err)
	}
	_ = ln.Close()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := p.Ping(ctx); err == nil {
		t.Fatal("closed port must fail the ping")
	}
}
