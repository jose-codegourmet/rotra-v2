package session

import (
	"net/netip"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// Refresh lifetimes per audience (B-27): club and player 30 days, extended on use; Admin 12 hours, not.
const (
	ClubRefreshLifetime   = 30 * 24 * time.Hour
	PlayerRefreshLifetime = 30 * 24 * time.Hour
	AdminRefreshLifetime  = 12 * time.Hour
)

// RefreshLifetime is how long a session of aud lasts from sign-in (and, for club and player, from each use).
func RefreshLifetime(aud store.Audience) time.Duration {
	switch aud {
	case store.AudienceAdmin:
		return AdminRefreshLifetime
	case store.AudiencePlayer:
		return PlayerRefreshLifetime
	default:
		return ClubRefreshLifetime
	}
}

// ExtendsOnUse reports whether a refresh pushes the session's expiry out (club and player, not Admin).
func ExtendsOnUse(aud store.Audience) bool { return aud != store.AudienceAdmin }

// IssueInput is an already verified sign-in: the caller checked the password and the account.
type IssueInput struct {
	// Identity is the verified identity; its audience is the session's.
	Identity store.Identity
	// AccountID is the account's id for that audience: the club id, the player id or the Admin id. For a club
	// it is also the session's club_id.
	AccountID uuid.UUID
	// DeviceID is the Queue device id sent at club sign-in. It enrolls the device (B-28) in the same
	// transaction as the session. Club only.
	DeviceID *uuid.UUID
	// DeviceLabel is the label shown in the device list ("Chrome on Android"); blank becomes "This device".
	DeviceLabel string
	// IP is the trusted client IP, or nil.
	IP *netip.Addr
}

// Issued is a new session with its two passes.
type Issued struct {
	Session          store.Session
	AccessPass       string
	AccessExpiresAt  time.Time
	RefreshPass      string
	RefreshExpiresAt time.Time
	// DeviceEnrolled is true when this sign-in created the devices row.
	DeviceEnrolled bool
}

// Refreshed is what a refresh returns.
type Refreshed struct {
	Session         store.Session
	AccessPass      string
	AccessExpiresAt time.Time
	// RefreshPass is the new refresh pass. Empty when the previous pass was accepted inside the grace window
	// (B-29): then the refresh cookie must be left alone.
	RefreshPass      string
	RefreshExpiresAt time.Time
	// Rotated is true when the refresh pass was replaced.
	Rotated bool
}

// Principal is who a request is, after the pass and account checks.
type Principal struct {
	IdentityID uuid.UUID
	SessionID  uuid.UUID
	Audience   store.Audience
	// AccountID is the club id, the player id or the Admin id.
	AccountID uuid.UUID
	// ClubID is set for club principals only (equal to AccountID).
	ClubID *uuid.UUID
}

// Mode says how much a request needs checked. Reads trust the access pass for up to its lifetime; writes
// also check the session row is not revoked (through a short cache).
type Mode int

const (
	ModeRead Mode = iota
	ModeWrite
)

// Revoked names sessions a transaction revoked, for the caller to hand to Service.Forget after commit.
type Revoked struct {
	IdentityID uuid.UUID
	SessionIDs []uuid.UUID
}
