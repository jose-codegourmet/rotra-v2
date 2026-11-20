package queuewrites

import (
	"crypto/sha256"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// derivedID is derivedId: a stable UUID derived from an operation id, for the extra rows one command writes (a waitlist
// entry, an admission, a saved player). It is the first 16 bytes of SHA-256 of "<commandID>:<part>", marked version 8
// (custom) with the RFC variant. The operation id is taken as the text it came in, not as a UUID.
func derivedID(commandID, part string) pgtype.UUID {
	sum := sha256.Sum256([]byte(commandID + ":" + part))
	var b [16]byte
	copy(b[:], sum[:16])
	b[6] = b[6]&0x0f | 0x80
	b[8] = b[8]&0x3f | 0x80
	return pgtype.UUID{Bytes: b, Valid: true}
}

// randomID is crypto.randomUUID(): a version 4 UUID for a row the TypeScript does not derive an id for.
func randomID() pgtype.UUID { return pgtype.UUID{Bytes: uuid.New(), Valid: true} }

// newestID is a version 7 UUID, as Prisma's uuid(7) default makes for a new notification.
func newestID() (pgtype.UUID, error) {
	id, err := uuid.NewV7()
	return pgtype.UUID{Bytes: id, Valid: err == nil}, err
}

// levels are the nine playing levels in skill_levels order: the ID is the display order is the index (PLAYING_LEVELS).
var levels = []string{
	"beginner_low", "beginner_mid", "beginner_high", "intermediate_low", "intermediate_mid", "intermediate_high",
	"advanced_low", "advanced_mid", "advanced_high",
}

// levelID is levelIdFor: the skill level ID of a level code, or `invalid` with the field level.
func levelID(level string) (pgtype.Int2, error) {
	for i, l := range levels {
		if l == level {
			return pgtype.Int2{Int16: int16(i), Valid: true}, nil
		}
	}
	return pgtype.Int2{}, failLevel()
}
