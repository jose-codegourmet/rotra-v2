// Package store is the query layer for the sign-in tables (auth_identities, auth_sessions,
// auth_rate_limits, auth_events) plus the pieces of devices and the account tables the sign-in needs.
// It is thin on purpose: each method is one statement or one small, well-named building block. There is no
// HTTP, hashing or pass logic here; the sign-in, refresh and enrollment code composes these inside
// Store.InTx. Callers pass every timestamp in (never now() in SQL), so tests and the grace window (B-29)
// stay deterministic.
package store

import (
	"errors"
	"net/netip"
	"time"

	"github.com/google/uuid"
)

// Audience is who a session or identity is for.
type Audience string

// The three audiences (CHECK on every sign-in table).
const (
	AudienceClub   Audience = "club"
	AudiencePlayer Audience = "player"
	AudienceAdmin  Audience = "admin"
)

// Password schemes stored on an identity.
const (
	SchemeArgon2id = "argon2id"
	SchemeBcrypt   = "bcrypt"
)

// RevokeReason is why a session ended (CHECK on auth_sessions.revoke_reason).
type RevokeReason string

// The allowed revoke reasons.
const (
	ReasonSignOut          RevokeReason = "sign_out"
	ReasonSignedOutByOwner RevokeReason = "signed_out_by_owner"
	ReasonSignedOutByAdmin RevokeReason = "signed_out_by_admin"
	ReasonPasswordChanged  RevokeReason = "password_changed"
	ReasonAccountDisabled  RevokeReason = "account_disabled"
	ReasonDeviceRevoked    RevokeReason = "device_revoked"
	ReasonRefreshReused    RevokeReason = "refresh_reused"
	ReasonExpired          RevokeReason = "expired"
)

// EventType is an auth_events.event (CHECK on the column). Routine refreshes are never logged (B-34).
type EventType string

// The allowed events.
const (
	EventSignIn              EventType = "sign_in"
	EventSignInFailed        EventType = "sign_in_failed"
	EventRateLimited         EventType = "rate_limited"
	EventRefreshReused       EventType = "refresh_reused"
	EventSignOut             EventType = "sign_out"
	EventSessionRevoked      EventType = "session_revoked"
	EventPasswordChanged     EventType = "password_changed"
	EventPasswordResetIssued EventType = "password_reset_issued"
	EventPasswordResetUsed   EventType = "password_reset_used"
	EventDeviceEnrolled      EventType = "device_enrolled"
	EventDeviceRevoked       EventType = "device_revoked"
)

// RateScope is what a rate-limit counter is about.
type RateScope string

// The allowed scopes.
const (
	ScopeIP     RateScope = "ip"
	ScopeLogin  RateScope = "login"
	ScopeDevice RateScope = "device"
)

// RateAction is the kind of attempt being counted.
type RateAction string

// The allowed actions.
const (
	ActionSignIn       RateAction = "sign_in"
	ActionResetRequest RateAction = "reset_request"
	ActionClaim        RateAction = "claim"
	ActionRefresh      RateAction = "refresh"
)

// TouchInterval is how often last_seen_at is written at most (design: once a minute keeps churn low).
const TouchInterval = time.Minute

// Typed errors callers branch on. Anything else is returned wrapped from pgx unchanged.
var (
	// ErrNotFound: no such row (for revokes and rotations: no such active row).
	ErrNotFound = errors.New("auth store: not found")
	// ErrLoginKeyTaken: the (audience, login_key) pair already belongs to another identity.
	ErrLoginKeyTaken = errors.New("auth store: login key already taken")
	// ErrDeviceOtherClub: the device id belongs to another club (registerDevice: not_found).
	ErrDeviceOtherClub = errors.New("auth store: device belongs to another club")
	// ErrDeviceRevoked: the device was removed (registerDevice: forbidden).
	ErrDeviceRevoked = errors.New("auth store: device was revoked")
)

// Identity is one auth_identities row.
type Identity struct {
	ID                uuid.UUID
	Audience          Audience
	LoginKey          string
	PasswordHash      string
	PasswordScheme    string
	PasswordChangedAt time.Time
	DisabledAt        *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
	Revision          int64
}

// NewIdentity is what InsertIdentity takes. A zero ID is replaced by a fresh UUIDv7.
type NewIdentity struct {
	ID             uuid.UUID
	Audience       Audience
	LoginKey       string
	PasswordHash   string
	PasswordScheme string
	Now            time.Time
}

// ClubAccount is what the sign-in needs from club_accounts. The account's primary key is the club id.
type ClubAccount struct {
	ClubID        uuid.UUID
	Username      string
	ProvisionedAt *time.Time
	DisabledAt    *time.Time
}

// CanSignIn is true when the account is provisioned and not disabled.
func (a ClubAccount) CanSignIn() bool { return a.ProvisionedAt != nil && a.DisabledAt == nil }

// PlayerAccount is what the sign-in needs from player_accounts. The account's primary key is the player id.
type PlayerAccount struct {
	PlayerID   uuid.UUID
	DisabledAt *time.Time
}

// CanSignIn is true when the account is not disabled.
func (a PlayerAccount) CanSignIn() bool { return a.DisabledAt == nil }

// AdminAccount is what the sign-in needs from admin_accounts.
type AdminAccount struct {
	ID          uuid.UUID
	DisplayName string
	Active      bool
}

// CanSignIn is true when the admin is active.
func (a AdminAccount) CanSignIn() bool { return a.Active }

// Session is one auth_sessions row. Nil pointers and a nil slice mean NULL.
type Session struct {
	ID                    uuid.UUID
	IdentityID            uuid.UUID
	Audience              Audience
	ClubID                *uuid.UUID
	DeviceID              *uuid.UUID
	DeviceLabel           string
	RefreshDigest         []byte
	PreviousRefreshDigest []byte
	RefreshedAt           *time.Time
	CreatedIP             *netip.Addr
	LastIP                *netip.Addr
	LastSeenAt            time.Time
	ExpiresAt             time.Time
	RevokedAt             *time.Time
	RevokeReason          RevokeReason
	CreatedAt             time.Time
}

// Revoked reports whether the session was ended explicitly.
func (s Session) Revoked() bool { return s.RevokedAt != nil }

// NewSession is what InsertSession takes. A zero ID is replaced by a fresh UUIDv7. Now becomes created_at
// and last_seen_at; CreatedIP also becomes last_ip.
type NewSession struct {
	ID            uuid.UUID
	IdentityID    uuid.UUID
	Audience      Audience
	ClubID        *uuid.UUID
	DeviceID      *uuid.UUID
	DeviceLabel   string
	RefreshDigest []byte
	CreatedIP     *netip.Addr
	Now           time.Time
	ExpiresAt     time.Time
}

// Rotation is what RotateRefresh takes. The current digest always becomes the previous one.
type Rotation struct {
	ID        uuid.UUID
	NewDigest []byte
	Now       time.Time  // refreshed_at and last_seen_at
	ExpiresAt *time.Time // nil keeps the current expiry (Admin: not extended)
	IP        *netip.Addr
}

// ClubSession is an active club session joined with its device, for the owner's and Admin's device list.
type ClubSession struct {
	Session
	DeviceLabelCurrent *string // devices.label; nil when the session has no device
	DeviceRevokedAt    *time.Time
}

// NewEvent is what InsertEvent takes. Never put an email, username or password in an event.
type NewEvent struct {
	IdentityID *uuid.UUID
	SessionID  *uuid.UUID
	Audience   Audience
	Event      EventType
	IP         *netip.Addr
	DeviceID   *uuid.UUID
	At         time.Time
}

// Device is one devices row.
type Device struct {
	ID           uuid.UUID
	ClubID       uuid.UUID
	Label        string
	RegisteredAt time.Time
	RevokedAt    *time.Time
	RevokeReason *string
	Revision     int64
}
