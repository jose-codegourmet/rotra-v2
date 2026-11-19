package adminwrites

import "github.com/jackc/pgx/v5/pgtype"

// pgUUID reads a UUID the way Postgres does, which is how the TypeScript services accept a command id (Prisma hands
// the text on): optional braces around it, 32 hexadecimal digits in either case, and hyphens only after a group of
// four digits (so after the 4th, 8th, ... 28th digit, never after the last). Anything else, including a "urn:uuid:"
// prefix and spaces, is refused: Prisma crashes on it.
func pgUUID(s string) (pgtype.UUID, bool) {
	braces := len(s) > 0 && s[0] == '{'
	if braces {
		s = s[1:]
	}
	var out pgtype.UUID
	for i := range out.Bytes {
		if len(s) < 2 || !isHex(s[0]) || !isHex(s[1]) {
			return pgtype.UUID{}, false
		}
		out.Bytes[i] = hexVal(s[0])<<4 | hexVal(s[1])
		s = s[2:]
		if len(s) > 0 && s[0] == '-' && i%2 == 1 && i < len(out.Bytes)-1 {
			s = s[1:]
		}
	}
	if braces {
		if len(s) == 0 || s[0] != '}' {
			return pgtype.UUID{}, false
		}
		s = s[1:]
	}
	if s != "" {
		return pgtype.UUID{}, false
	}
	out.Valid = true
	return out, true
}

func isHex(c byte) bool {
	return c >= '0' && c <= '9' || c >= 'a' && c <= 'f' || c >= 'A' && c <= 'F'
}

func hexVal(c byte) byte {
	switch {
	case c >= '0' && c <= '9':
		return c - '0'
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10
	}
	return c - 'A' + 10
}
