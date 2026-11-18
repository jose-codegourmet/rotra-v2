package password

import (
	"errors"
	"unicode/utf8"
)

// The password policy every place that sets a password shares (claim now; reset and import later). It is what
// Supabase enforced (supabase/config.toml: minimum_password_length = 6, no other requirement) and nothing more.
// The upper bound is not a policy: it bounds the hashing cost of a hostile request.
const (
	MinLength = 6
	MaxLength = 1024

	// MessageTooShort is the field error shown for a password under MinLength characters.
	MessageTooShort = "Use at least 6 characters."
	// MessageTooLong is the field error shown for a password over MaxLength characters.
	MessageTooLong = "Use 1024 characters or fewer."
)

// Validate errors. Message gives the user-facing text of either.
var (
	ErrTooShort = errors.New("password: too short")
	ErrTooLong  = errors.New("password: too long")
)

// Message is the field error to show for an error from Validate ("" for nil or any other error).
func Message(err error) string {
	switch {
	case errors.Is(err, ErrTooShort):
		return MessageTooShort
	case errors.Is(err, ErrTooLong):
		return MessageTooLong
	}
	return ""
}

// Validate checks a new password. Length is counted in characters (code points), not bytes.
func Validate(pw string) error {
	switch n := utf8.RuneCountInString(pw); {
	case n < MinLength:
		return ErrTooShort
	case n > MaxLength:
		return ErrTooLong
	}
	return nil
}
