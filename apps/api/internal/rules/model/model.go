// Package model holds the data shapes the bucket 1 rules read and return. It is a leaf: it imports
// nothing from the other rule packages, so match, courts, roster and courtfill can all use it.
//
// Every field mirrors the TypeScript type (packages/data/src/match/match.types.ts,
// session-roster/sessionRoster.types.ts, queue-session/queueSession.types.ts) and its JSON name.
// Times are epoch milliseconds (int64). A TypeScript `T | null` is a pointer (nil = null); a
// TypeScript optional field whose absent/null/value difference reaches an output is an [Opt].
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

// Format is a match format: singles, doubles, fun_1v2, fun_3v3, fun_4v4 or fun_5v5.
type Format string

// Match states: waiting, on_court, active, completed, invalid.
const (
	StateWaiting   = "waiting"
	StateOnCourt   = "on_court"
	StateActive    = "active"
	StateCompleted = "completed"
	StateInvalid   = "invalid"
)

// Substitution is an in-game substitution on a match.
type Substitution struct {
	OutID    string      `json:"outId"`
	InID     string      `json:"inId"`
	Team     string      `json:"team"`
	At       int64       `json:"at"`
	CreditTo Opt[string] `json:"creditTo,omitzero"`
}

// Decision is a confirmed result.
type Decision struct {
	Kind        string  `json:"kind"`
	WinningTeam *string `json:"winningTeam"`
	TeamAScore  *int64  `json:"teamAScore"`
	TeamBScore  *int64  `json:"teamBScore"`
	ConfirmedAt int64   `json:"confirmedAt"`
}

// Match is a queued, placed, running or finished match.
type Match struct {
	ID              string         `json:"id"`
	SessionID       string         `json:"sessionId"`
	MatchNo         int64          `json:"matchNo"`
	State           string         `json:"state"`
	Format          Format         `json:"format"`
	QueuePosition   int64          `json:"queuePosition"`
	Origin          string         `json:"origin"`
	ManualProtected bool           `json:"manualProtected"`
	TeamA           []string       `json:"teamA"`
	TeamB           []string       `json:"teamB"`
	CourtIDs        []string       `json:"courtIds"`
	PlacedAt        Opt[int64]     `json:"placedAt,omitzero"`
	StartedAt       *int64         `json:"startedAt"`
	EndedAt         *int64         `json:"endedAt"`
	Substitutions   []Substitution `json:"substitutions"`
	Decision        *Decision      `json:"decision"`
}

// HoldsCourt is true for On court (placed, not started) and Playing matches: they hold their courts
// and their players are busy.
func (m Match) HoldsCourt() bool { return m.State == StateOnCourt || m.State == StateActive }

// AllPlayers is team A then team B.
func (m Match) AllPlayers() []string {
	out := make([]string, 0, len(m.TeamA)+len(m.TeamB))
	return append(append(out, m.TeamA...), m.TeamB...)
}

// Lineup is the format and both teams of a match (TypeScript MatchLineup).
type Lineup struct {
	Format Format   `json:"format"`
	TeamA  []string `json:"teamA"`
	TeamB  []string `json:"teamB"`
}

// Player is a roster row (TypeScript SessionPlayer).
type Player struct {
	ID                    string     `json:"id"`
	SessionID             string     `json:"sessionId"`
	ClubPlayerID          string     `json:"clubPlayerId"`
	NameSnapshot          string     `json:"nameSnapshot"`
	NicknameSnapshot      *string    `json:"nicknameSnapshot"`
	Present               bool       `json:"present"`
	PresentChangedAt      *int64     `json:"presentChangedAt"`
	Level                 *string    `json:"level"`
	LevelLockedAt         *int64     `json:"levelLockedAt"`
	ConfirmedAt           int64      `json:"confirmedAt"`
	HasPlayedAtClubBefore Opt[bool]  `json:"hasPlayedAtClubBefore,omitzero"`
	SelfCheckedInAt       Opt[int64] `json:"selfCheckedInAt,omitzero"`
	LeftAt                Opt[int64] `json:"leftAt,omitzero"`
	GamesAdjustment       Opt[int64] `json:"gamesAdjustment,omitzero"`
}

// Court is a session court (TypeScript SessionCourt). StartsAt nil means the court has no planned start.
type Court struct {
	ID            string `json:"id"`
	SessionID     string `json:"sessionId"`
	Label         string `json:"label"`
	StartsAt      *int64 `json:"startsAt,omitempty"`
	OpenedEarlyAt *int64 `json:"openedEarlyAt,omitempty"`
	OpenUntil     *int64 `json:"openUntil"`
	RemovedAt     *int64 `json:"removedAt"`
}

// Removed is the TypeScript `!court.removedAt`: a removal time of 0 counts as not removed.
func (c Court) Removed() bool { return c.RemovedAt != nil && *c.RemovedAt != 0 }

// Context is what the match guards read: the roster, the matches, the courts and the clock (epoch ms).
type Context struct {
	Roster  []Player
	Matches []Match
	Courts  []Court
	Now     int64
}

// Session is the part of a Queue Session some rules read.
type Session struct {
	AllowSingles bool `json:"allowSingles"`
	AllowDoubles bool `json:"allowDoubles"`
}
