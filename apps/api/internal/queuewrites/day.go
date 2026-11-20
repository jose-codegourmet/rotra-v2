package queuewrites

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// parseDay reads a YYYY-MM-DD sync day as a date.
func parseDay(day string) (pgtype.Date, error) {
	t, err := time.Parse("2006-01-02", day)
	return pgtype.Date{Time: t, Valid: err == nil}, err
}
