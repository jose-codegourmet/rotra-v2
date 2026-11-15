package model

import "encoding/json"

// Opt is an optional JSON field that keeps three states apart: absent, null and a value. Use it where
// a whole object is copied to the output (substitutionCandidates, nextMatchCandidates, putOnCourt),
// so a field that was absent in the input stays absent. The zero value is absent.
type Opt[T any] struct {
	set  bool
	null bool
	v    T
}

// Some is a present value.
func Some[T any](v T) Opt[T] { return Opt[T]{set: true, v: v} }

// Null is an explicit JSON null.
func Null[T any]() Opt[T] { return Opt[T]{set: true, null: true} }

// IsZero reports an absent field; encoding/json's omitzero uses it to leave the key out.
func (o Opt[T]) IsZero() bool { return !o.set }

// Value returns the value and whether the field holds one (false when absent or null).
func (o Opt[T]) Value() (T, bool) { return o.v, o.set && !o.null }

// MarshalJSON writes null for an explicit null (an absent field is skipped by omitzero).
func (o Opt[T]) MarshalJSON() ([]byte, error) {
	if !o.set || o.null {
		return []byte("null"), nil
	}
	return json.Marshal(o.v)
}

// UnmarshalJSON reads null or a value; json only calls it for a key that is present.
func (o *Opt[T]) UnmarshalJSON(b []byte) error {
	o.set = true
	if string(b) == "null" {
		o.null, o.v = true, *new(T)
		return nil
	}
	o.null = false
	return json.Unmarshal(b, &o.v)
}
