package writes_test

import (
	"errors"
	"math"
	"testing"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// BigInt(string) as JavaScript answers it (each row is checked against Node by the capture of the flag routes, which
// sends the same texts as expectedRevision).
func TestParseBigInt(t *testing.T) {
	ok := map[string]string{
		"": "0", "   ": "0", "4": "4", " 4 ": "4", "+4": "4", "-1": "-1", "-0": "0", "007": "7",
		"0x4": "4", "0X1f": "31", "0o17": "15", "0b101": "5", "\ufeff9\u00a0": "9", "\n12\t": "12",
		"99999999999999999999": "99999999999999999999",
	}
	for in, want := range ok {
		got, valid := writes.ParseBigInt(in)
		if !valid || got.String() != want {
			t.Errorf("ParseBigInt(%q) = %v, %v; want %s", in, got, valid, want)
		}
	}
	for _, in := range []string{"abc", "4.0", "1e3", "1_0", "-0x4", "+0x4", "0x", "0b2", "0o8", "0xg", "--1", "+", "-", "4 4", "\u0085" + "4", "١٢"} {
		if got, valid := writes.ParseBigInt(in); valid {
			t.Errorf("ParseBigInt(%q) = %v, want a syntax error", in, got)
		}
	}
}

func TestRequireRevision(t *testing.T) {
	if err := writes.RequireRevision(4, " 4 "); err != nil {
		t.Errorf("same revision: %v", err)
	}
	if err := writes.RequireRevision(math.MaxInt64, "9223372036854775807"); err != nil {
		t.Errorf("the largest revision: %v", err)
	}
	for _, c := range []struct {
		stored   int64
		expected string
		code     httpapi.ErrorCode
		fields   map[string]string
	}{
		{4, "3", httpapi.ErrConflict, nil},
		{4, "", httpapi.ErrConflict, nil}, // BigInt('') is 0n, never equal to a stored revision
		{4, "99999999999999999999", httpapi.ErrConflict, nil},
		{4, "4.0", httpapi.ErrInvalid, map[string]string{"revision": writes.RevisionNotWhole}},
		{4, "abc", httpapi.ErrInvalid, map[string]string{"revision": writes.RevisionNotWhole}},
	} {
		err := writes.RequireRevision(c.stored, c.expected)
		var se *writes.Error
		if !errors.As(err, &se) || se.Code != c.code || len(se.Fields) != len(c.fields) || se.Fields["revision"] != c.fields["revision"] {
			t.Errorf("RequireRevision(%d, %q) = %v", c.stored, c.expected, err)
		}
	}
}
