package adminwrites

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// pgUUID reads a command id the way Postgres does: see writes.ParseUUID.
func pgUUID(s string) (pgtype.UUID, bool) { return writes.ParseUUID(s) }

// newUUID is a version 7 UUID, as Prisma's uuid(7) default makes for a new row.
func newUUID() (pgtype.UUID, error) {
	id, err := uuid.NewV7()
	return pgtype.UUID{Bytes: id, Valid: err == nil}, err
}

func isHex(c byte) bool {
	return c >= '0' && c <= '9' || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F'
}
