// Package testpg gives tests a real Postgres. It uses DATABASE_URL_TEST when set (CI service container);
// otherwise Main starts a throwaway container with `docker run` on a random localhost port and removes it
// afterwards. When neither is possible, Main prints why and exits 0 so the package's tests are skipped,
// never failed. Each test gets its own empty database from NewDatabase.
package testpg

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const image = "postgres:16-alpine"

var adminURL string

// Main is the body of TestMain: `func TestMain(m *testing.M) { testpg.Main(m) }`.
func Main(m *testing.M) {
	os.Exit(run(m))
}

func run(m *testing.M) int {
	if u := os.Getenv("DATABASE_URL_TEST"); u != "" {
		adminURL = u
		return m.Run()
	}
	u, stop, err := startContainer()
	if err != nil {
		fmt.Fprintln(os.Stderr, "SKIP: no Postgres for tests (set DATABASE_URL_TEST or install docker):", err)
		return 0
	}
	defer stop()
	adminURL = u
	return m.Run()
}

// Available reports whether Main found a database.
func Available() bool { return adminURL != "" }

func startContainer() (string, func(), error) {
	if _, err := exec.LookPath("docker"); err != nil {
		return "", nil, fmt.Errorf("docker not found")
	}
	if out, err := exec.Command("docker", "info", "--format", "{{.ServerVersion}}").CombinedOutput(); err != nil {
		return "", nil, fmt.Errorf("docker daemon unavailable: %s", strings.TrimSpace(string(out)))
	}
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	name := "rotra-api-test-" + hex.EncodeToString(b)
	out, err := exec.Command("docker", "run", "-d", "--rm", "--name", name,
		"-e", "POSTGRES_PASSWORD=test", "-p", "127.0.0.1::5432", image).CombinedOutput()
	if err != nil {
		return "", nil, fmt.Errorf("docker run %s: %s", image, strings.TrimSpace(string(out)))
	}
	stop := func() { _ = exec.Command("docker", "rm", "-f", name).Run() }
	portOut, err := exec.Command("docker", "port", name, "5432/tcp").Output()
	if err != nil {
		stop()
		return "", nil, fmt.Errorf("docker port: %w", err)
	}
	line := strings.Fields(string(portOut))[0] // 127.0.0.1:49153
	u := "postgres://postgres:test@" + line + "/postgres?sslmode=disable"
	deadline := time.Now().Add(60 * time.Second)
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		c, err := pgx.Connect(ctx, u)
		cancel()
		if err == nil {
			// The image restarts once during init; require two good pings in a row.
			ok := c.Ping(context.Background()) == nil
			_ = c.Close(context.Background())
			if ok {
				time.Sleep(500 * time.Millisecond)
				c2, err := pgx.Connect(context.Background(), u)
				if err == nil {
					_ = c2.Close(context.Background())
					return u, stop, nil
				}
			}
		}
		if time.Now().After(deadline) {
			stop()
			return "", nil, fmt.Errorf("postgres did not become ready")
		}
		time.Sleep(300 * time.Millisecond)
	}
}

// NewDatabase creates an empty database and returns its URL; it is dropped when the test ends.
func NewDatabase(t testing.TB) string {
	t.Helper()
	if adminURL == "" {
		t.Skip("no Postgres available")
	}
	ctx := context.Background()
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	name := "t_" + hex.EncodeToString(b)
	admin, err := pgx.Connect(ctx, adminURL)
	if err != nil {
		t.Fatalf("connect admin: %v", err)
	}
	defer admin.Close(ctx)
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name); err != nil {
		t.Fatalf("create database: %v", err)
	}
	t.Cleanup(func() {
		c, err := pgx.Connect(context.Background(), adminURL)
		if err != nil {
			return
		}
		defer c.Close(context.Background())
		_, _ = c.Exec(context.Background(), "DROP DATABASE IF EXISTS "+name+" WITH (FORCE)")
	})
	u, err := url.Parse(adminURL)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	u.Path = "/" + name
	return u.String()
}

// MigrationFiles lists the Prisma migration.sql files in apply order.
func MigrationFiles() ([]string, error) {
	_, file, _, _ := runtime.Caller(0)
	root := filepath.Join(filepath.Dir(file), "..", "..", "..", "..", "packages", "db", "prisma", "migrations")
	files, err := filepath.Glob(filepath.Join(root, "*", "migration.sql"))
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	return files, nil
}

// ApplyMigrations runs every Prisma migration, in order, on the (throwaway) database at dsn.
func ApplyMigrations(t testing.TB, dsn string) {
	t.Helper()
	files, err := MigrationFiles()
	if err != nil || len(files) == 0 {
		t.Fatalf("no migrations found: %v", err)
	}
	ctx := context.Background()
	c, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer c.Close(ctx)
	// Supabase provides these roles; the migrations revoke from and grant to them. Roles are cluster-wide,
	// so another package's test may have created them already.
	for _, role := range []string{"anon", "authenticated", "service_role"} {
		var pgErr *pgconn.PgError
		if _, err := c.Exec(ctx, "CREATE ROLE "+role+" NOLOGIN"); err != nil &&
			!(errors.As(err, &pgErr) && (pgErr.Code == "42710" || pgErr.Code == "23505")) {
			t.Fatalf("create role %s: %v", role, err)
		}
	}
	for _, f := range files {
		sql, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		// No arguments: pgx uses the simple protocol, which allows many statements per call.
		if _, err := c.Exec(ctx, string(sql)); err != nil {
			t.Fatalf("migration %s: %v", filepath.Base(filepath.Dir(f)), err)
		}
	}
}
