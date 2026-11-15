package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"
)

// What goes on the wire, as serialize.ts does it: bigint as a decimal string, instants as
// toISOString() (always UTC, three fractional digits), dates as YYYY-MM-DD, null stays null.

const (
	isoLayout  = "2006-01-02T15:04:05.000Z"
	dateLayout = "2006-01-02"
)

// ToIso is Date.toISOString().
func ToIso(t time.Time) string { return t.UTC().Format(isoLayout) }

// ToIsoOrNull is toIsoOrNull: a nil time stays null.
func ToIsoOrNull(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := ToIso(*t)
	return &s
}

// ToDecimalString is toDecimalString for revisions and sequences.
func ToDecimalString(v int64) string { return strconv.FormatInt(v, 10) }

// ToDateOnly is toDateOnly: a @db.Date column as YYYY-MM-DD (UTC).
func ToDateOnly(t time.Time) string { return t.UTC().Format(dateLayout) }

// Money is integer minor units and an ISO 4217 currency.
type Money struct {
	AmountMinor int64  `json:"amountMinor"`
	Currency    string `json:"currency"`
}

// maxSafeInteger is Number.MAX_SAFE_INTEGER (2^53-1).
const maxSafeInteger = 1<<53 - 1

// ToMoney is toMoney: nil stays null, never 0, and an amount outside JavaScript's safe integer
// range (±(2^53-1)) is an error, as the TypeScript side throws.
func ToMoney(amountMinor *int64, currency string) (*Money, error) {
	if amountMinor == nil {
		return nil, nil
	}
	if *amountMinor > maxSafeInteger || *amountMinor < -maxSafeInteger {
		return nil, errors.New("money must be integer minor units within the safe integer range")
	}
	return &Money{AmountMinor: *amountMinor, Currency: currency}, nil
}

// BigInt is a 64-bit integer that travels as a decimal string.
type BigInt int64

func (b BigInt) MarshalJSON() ([]byte, error) { return json.Marshal(ToDecimalString(int64(b))) }

func (b *BigInt) UnmarshalJSON(raw []byte) error {
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return fmt.Errorf("bigint must be a decimal string: %w", err)
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return fmt.Errorf("bigint must be a decimal string: %w", err)
	}
	*b = BigInt(n)
	return nil
}

// Instant is a point in time that travels as an ISO 8601 UTC string with milliseconds.
type Instant time.Time

func (i Instant) MarshalJSON() ([]byte, error) { return json.Marshal(ToIso(time.Time(i))) }

func (i *Instant) UnmarshalJSON(raw []byte) error {
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return fmt.Errorf("instant must be a string: %w", err)
	}
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		return fmt.Errorf("instant: %w", err)
	}
	*i = Instant(t.UTC())
	return nil
}

// DateOnly is a calendar date that travels as YYYY-MM-DD.
type DateOnly time.Time

func (d DateOnly) MarshalJSON() ([]byte, error) { return json.Marshal(ToDateOnly(time.Time(d))) }

func (d *DateOnly) UnmarshalJSON(raw []byte) error {
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return fmt.Errorf("date must be a string: %w", err)
	}
	t, err := time.Parse(dateLayout, s)
	if err != nil {
		return fmt.Errorf("date: %w", err)
	}
	*d = DateOnly(t)
	return nil
}
