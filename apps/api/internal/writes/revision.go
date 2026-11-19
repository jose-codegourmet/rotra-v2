package writes

import (
	"math/big"
	"strings"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// RevisionNotWhole is the message of an expected revision that is not a whole number.
const RevisionNotWhole = "Expected a whole-number revision."

// RequireRevision is requireRevision in authorize.ts: the stored revision must equal the expected one. The
// expected text is read the way BigInt(text) reads it, so a blank value is 0 (a conflict, not an invalid answer)
// and "0x4" is 4. Something BigInt refuses is `invalid` with the field `revision`; a different number is `conflict`.
func RequireRevision(stored int64, expected string) error {
	want, ok := ParseBigInt(expected)
	if !ok {
		return Fail(httpapi.ErrInvalid, map[string]string{"revision": RevisionNotWhole})
	}
	if want.Cmp(big.NewInt(stored)) != 0 {
		return Fail(httpapi.ErrConflict, nil)
	}
	return nil
}

// ParseBigInt is BigInt(string) (StringToBigInt): JavaScript white space is trimmed, a blank string is 0n, a
// decimal may carry one + or - sign, and a 0x, 0o or 0b literal may not. A dot, an exponent, a separator or any
// other character is a syntax error.
func ParseBigInt(s string) (*big.Int, bool) {
	t := strings.TrimFunc(s, fields.IsJSSpace)
	if t == "" {
		return new(big.Int), true
	}
	if len(t) > 2 && t[0] == '0' {
		base := 0
		switch t[1] {
		case 'x', 'X':
			base = 16
		case 'o', 'O':
			base = 8
		case 'b', 'B':
			base = 2
		}
		if base != 0 {
			return digits(t[2:], base, false)
		}
	}
	return digits(t, 10, true)
}

// digits reads a run of digits of base (a sign first, when allowed). SetString alone would also take a sign and
// separators, so the characters are checked here.
func digits(s string, base int, signed bool) (*big.Int, bool) {
	body := s
	if signed && body != "" && (body[0] == '+' || body[0] == '-') {
		body = body[1:]
	}
	if body == "" {
		return nil, false
	}
	for i := 0; i < len(body); i++ {
		c := body[i]
		var d int
		switch {
		case c >= '0' && c <= '9':
			d = int(c - '0')
		case c >= 'a' && c <= 'f':
			d = int(c-'a') + 10
		case c >= 'A' && c <= 'F':
			d = int(c-'A') + 10
		default:
			return nil, false
		}
		if d >= base {
			return nil, false
		}
	}
	n, ok := new(big.Int).SetString(s, base)
	return n, ok
}
