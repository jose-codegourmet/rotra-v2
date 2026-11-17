package password_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/password"
)

// The policy is what Supabase enforced (supabase/config.toml minimum_password_length = 6) and nothing more;
// the upper bound only bounds the hashing cost. Counted in characters, as Supabase does.
func TestValidate(t *testing.T) {
	cases := []struct {
		name string
		pw   string
		want error
	}{
		{"empty", "", password.ErrTooShort},
		{"five", "abcde", password.ErrTooShort},
		{"six", "abcdef", nil},
		{"six spaces count", "      ", nil},
		{"five multi-byte characters", "éééée", password.ErrTooShort},
		{"six multi-byte characters", "éééééé", nil},
		{"1024 characters", strings.Repeat("a", 1024), nil},
		{"1025 characters", strings.Repeat("a", 1025), password.ErrTooLong},
		{"1024 multi-byte characters", strings.Repeat("é", 1024), nil},
	}
	for _, c := range cases {
		if got := password.Validate(c.pw); !errors.Is(got, c.want) {
			t.Errorf("%s: %v, want %v", c.name, got, c.want)
		}
	}
	if password.MessageTooShort != "Use at least 6 characters." {
		t.Fatalf("message: %q", password.MessageTooShort)
	}
	if got := password.Message(password.Validate("abcde")); got != "Use at least 6 characters." {
		t.Fatalf("short: %q", got)
	}
	if got := password.Message(password.Validate(strings.Repeat("a", 1025))); got != "Use 1024 characters or fewer." {
		t.Fatalf("long: %q", got)
	}
	if got := password.Message(nil); got != "" {
		t.Fatalf("nil: %q", got)
	}
	if got := password.Message(errors.New("other")); got != "" {
		t.Fatalf("other: %q", got)
	}
}
