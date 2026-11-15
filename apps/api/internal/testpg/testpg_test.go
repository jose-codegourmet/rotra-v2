package testpg_test

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/testpg"
)

func TestMain(m *testing.M) { testpg.Main(m) }

func TestNewDatabaseIsIsolated(t *testing.T) {
	a, b := testpg.NewDatabase(t), testpg.NewDatabase(t)
	if a == b {
		t.Fatal("databases must differ")
	}
	ctx := context.Background()
	ca, err := pgx.Connect(ctx, a)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = ca.Close(ctx) }()
	if _, err := ca.Exec(ctx, "CREATE TABLE only_in_a (id int)"); err != nil {
		t.Fatal(err)
	}
	cb, err := pgx.Connect(ctx, b)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = cb.Close(ctx) }()
	if _, err := cb.Exec(ctx, "SELECT 1 FROM only_in_a"); err == nil {
		t.Fatal("table leaked across databases")
	}
}

func TestApplyMigrations(t *testing.T) {
	dsn := testpg.NewDatabase(t)
	testpg.ApplyMigrations(t, dsn)
	ctx := context.Background()
	c, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = c.Close(ctx) }()
	var n int
	if err := c.QueryRow(ctx, "SELECT count(*) FROM location_codes").Scan(&n); err != nil || n < 6 {
		t.Fatalf("seeded locations: %d %v", n, err)
	}
}

func TestAvailable(t *testing.T) {
	if !testpg.Available() {
		t.Fatal("Main skips the package when no database; reaching a test means one exists")
	}
}
