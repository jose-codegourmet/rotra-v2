// Package pgprobe is the stand-in readiness check until the pgx pool exists (task 2.5): it proves
// the Postgres host accepts TCP connections. It cannot tell that queries work; the pool's Ping replaces it.
package pgprobe

import (
	"context"
	"fmt"
	"net"
	"net/url"
)

// Probe pings a host:port.
type Probe struct{ Addr string }

// FromURL reads host and port (default 5432) from a postgres:// URL.
func FromURL(raw string) (Probe, error) {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") || u.Hostname() == "" {
		return Probe{}, fmt.Errorf("DATABASE_URL must be a postgres:// URL with a host")
	}
	port := u.Port()
	if port == "" {
		port = "5432"
	}
	return Probe{Addr: net.JoinHostPort(u.Hostname(), port)}, nil
}

// Ping dials the address and closes the connection.
func (p Probe) Ping(ctx context.Context) error {
	var d net.Dialer
	conn, err := d.DialContext(ctx, "tcp", p.Addr)
	if err != nil {
		return err
	}
	return conn.Close()
}
