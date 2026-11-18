package session_test

import (
	"bytes"
	"errors"
	"net/netip"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/pass"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestIssueClubCreatesSessionDeviceAndEvents(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "smash-club")
	dev := uuid.New()
	ip := netip.MustParseAddr("203.0.113.9")
	iss, err := e.svc.Issue(e.ctx, session.IssueInput{
		Identity: club.ident, AccountID: club.accountID, DeviceID: &dev, DeviceLabel: "  Chrome on Android ", IP: &ip,
	})
	if err != nil {
		t.Fatal(err)
	}
	claims, err := e.verifier.Verify(iss.AccessPass, pass.AudienceClub, base)
	if err != nil {
		t.Fatalf("the access pass must verify: %v", err)
	}
	mustEqual(t, "sub", claims.Subject, club.ident.ID.String())
	mustEqual(t, "sid", claims.SessionID, iss.Session.ID.String())
	mustEqual(t, "acc", claims.AccountID, club.accountID.String())
	mustEqual(t, "club_id", claims.ClubID, club.accountID.String())
	mustEqual(t, "access expiry", iss.AccessExpiresAt, base.Add(15*time.Minute))
	if !claims.ExpiresAt.Equal(iss.AccessExpiresAt) {
		t.Fatalf("pass exp %v != reported %v", claims.ExpiresAt, iss.AccessExpiresAt)
	}
	mustEqual(t, "refresh expiry", iss.RefreshExpiresAt, base.Add(30*24*time.Hour))

	s := e.session(t, iss.Session.ID)
	if !bytes.Equal(s.RefreshDigest, digestOf(iss.RefreshPass)) {
		t.Fatal("only the SHA-256 digest of the refresh pass is stored")
	}
	mustEqual(t, "audience", s.Audience, store.AudienceClub)
	mustEqual(t, "club", *s.ClubID, club.accountID)
	mustEqual(t, "device", *s.DeviceID, dev)
	mustEqual(t, "label", s.DeviceLabel, "Chrome on Android")
	mustEqual(t, "created ip", *s.CreatedIP, ip)
	mustEqual(t, "expires", s.ExpiresAt, base.Add(30*24*time.Hour))
	if !iss.DeviceEnrolled {
		t.Fatal("a new device is enrolled")
	}
	d, err := e.st.GetDevice(e.ctx, club.accountID, dev)
	if err != nil || d.Label != "Chrome on Android" {
		t.Fatalf("device row: %+v %v", d, err)
	}
	mustEqual(t, "sign_in events", e.events(t, store.EventSignIn), 1)
	mustEqual(t, "device_enrolled events", e.events(t, store.EventDeviceEnrolled), 1)
	mustEqual(t, "events tied to the session", e.count(t, `SELECT count(*) FROM auth_events WHERE session_id = $1 AND identity_id = $2 AND ip = $3`,
		s.ID, club.ident.ID, ip.String()), 2)
}

func TestIssueRefreshPassShape(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "shape-club")
	a, b := e.issue(t, club), e.issue(t, club)
	if a.RefreshPass == b.RefreshPass || a.Session.ID == b.Session.ID {
		t.Fatal("each sign-in gets its own refresh pass and session")
	}
	if len(a.RefreshPass) != 43 || strings.Trim(a.RefreshPass, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_") != "" {
		t.Fatalf("a refresh pass is 32 random bytes as unpadded base64url, got %q", a.RefreshPass)
	}
	mustEqual(t, "rows holding the pass text", e.count(t, `SELECT count(*) FROM auth_sessions s WHERE s::text LIKE '%' || $1 || '%'`, a.RefreshPass), 0)
}

func TestIssueWithoutDeviceWritesOnlySignIn(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "nodev")
	iss, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: club.ident, AccountID: club.accountID})
	if err != nil {
		t.Fatal(err)
	}
	if iss.DeviceEnrolled || e.session(t, iss.Session.ID).DeviceID != nil {
		t.Fatal("no device id, no enrollment")
	}
	mustEqual(t, "label default", e.session(t, iss.Session.ID).DeviceLabel, store.DefaultDeviceLabel)
	mustEqual(t, "device_enrolled", e.events(t, store.EventDeviceEnrolled), 0)
	mustEqual(t, "sign_in", e.events(t, store.EventSignIn), 1)
}

func TestIssueSameDeviceTwiceEnrollsOnce(t *testing.T) {
	e := newEnv(t)
	club := e.newClub(t, "twice")
	dev := uuid.New()
	first := e.issueOn(t, club, &dev, "Phone")
	second := e.issueOn(t, club, &dev, "Phone")
	if !first.DeviceEnrolled || second.DeviceEnrolled {
		t.Fatalf("enrolled flags: %v %v", first.DeviceEnrolled, second.DeviceEnrolled)
	}
	mustEqual(t, "device_enrolled", e.events(t, store.EventDeviceEnrolled), 1)
	mustEqual(t, "sign_in", e.events(t, store.EventSignIn), 2)
}

func TestIssuePlayerAndAdminLifetimes(t *testing.T) {
	e := newEnv(t)
	for aud, want := range map[store.Audience]time.Duration{
		store.AudiencePlayer: 30 * 24 * time.Hour,
		store.AudienceAdmin:  12 * time.Hour,
	} {
		a := e.accountFor(t, aud, "who@example.test")
		iss := e.issue(t, a)
		mustEqual(t, string(aud)+" refresh expiry", iss.RefreshExpiresAt, base.Add(want))
		mustEqual(t, string(aud)+" stored expiry", e.session(t, iss.Session.ID).ExpiresAt, base.Add(want))
		claims, err := e.verifier.Verify(iss.AccessPass, pass.Audience(aud), base)
		if err != nil {
			t.Fatalf("%s: %v", aud, err)
		}
		mustEqual(t, string(aud)+" acc", claims.AccountID, a.accountID.String())
		mustEqual(t, string(aud)+" club_id", claims.ClubID, "")
		if s := e.session(t, iss.Session.ID); s.ClubID != nil || s.DeviceID != nil {
			t.Fatalf("%s sessions carry no club or device", aud)
		}
	}
}

func TestIssueDeviceRefusalRollsEverythingBack(t *testing.T) {
	e := newEnv(t)
	mine, other := e.newClub(t, "mine"), e.newClub(t, "other")
	foreign, revoked := uuid.New(), uuid.New()
	if _, _, err := e.st.EnrollDevice(e.ctx, other.accountID, foreign, "theirs", base); err != nil {
		t.Fatal(err)
	}
	if _, _, err := e.st.EnrollDevice(e.ctx, mine.accountID, revoked, "gone", base); err != nil {
		t.Fatal(err)
	}
	if _, err := e.st.RevokeDevice(e.ctx, mine.accountID, revoked, base); err != nil {
		t.Fatal(err)
	}
	for name, c := range map[string]struct {
		dev  uuid.UUID
		want error
	}{"another club's device": {foreign, store.ErrDeviceOtherClub}, "a revoked device": {revoked, store.ErrDeviceRevoked}} {
		_, err := e.svc.Issue(e.ctx, session.IssueInput{Identity: mine.ident, AccountID: mine.accountID, DeviceID: &c.dev})
		if !errors.Is(err, c.want) {
			t.Fatalf("%s: %v", name, err)
		}
	}
	mustEqual(t, "sessions", e.count(t, `SELECT count(*) FROM auth_sessions`), 0)
	mustEqual(t, "events", e.count(t, `SELECT count(*) FROM auth_events`), 0)
}

func TestIssueRejectsBadInput(t *testing.T) {
	e := newEnv(t)
	club, player := e.newClub(t, "c"), e.newPlayer(t, "p@example.test")
	dev := uuid.New()
	for name, in := range map[string]session.IssueInput{
		"no identity":          {AccountID: club.accountID},
		"no account":           {Identity: club.ident},
		"a device on a player": {Identity: player.ident, AccountID: player.accountID, DeviceID: &dev},
	} {
		if _, err := e.svc.Issue(e.ctx, in); err == nil {
			t.Errorf("%s: want an error", name)
		}
	}
	mustEqual(t, "sessions", e.count(t, `SELECT count(*) FROM auth_sessions`), 0)
}
