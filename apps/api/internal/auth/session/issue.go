package session

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// Issue creates the session of an already verified sign-in and its two passes. In one transaction it enrolls
// the Queue device (club, when a device id came with the sign-in), inserts the auth_sessions row and writes the
// sign_in event (and device_enrolled when this call created the device), so a refused device (another club's or
// a revoked one: store.ErrDeviceOtherClub, store.ErrDeviceRevoked) leaves nothing behind.
//
// The refresh pass is returned once and never stored: only its SHA-256 digest is.
func (s *Service) Issue(ctx context.Context, in IssueInput) (Issued, error) {
	aud := in.Identity.Audience
	switch {
	case in.Identity.ID == uuid.Nil:
		return Issued{}, errors.New("session: issuing needs a verified identity")
	case aud != store.AudienceClub && aud != store.AudiencePlayer && aud != store.AudienceAdmin:
		return Issued{}, errors.New("session: the identity has no valid audience")
	case in.AccountID == uuid.Nil:
		return Issued{}, errors.New("session: issuing needs the account id")
	case in.DeviceID != nil && aud != store.AudienceClub:
		return Issued{}, errors.New("session: only a club sign-in carries a device")
	}
	label := strings.TrimSpace(in.DeviceLabel)
	if label == "" {
		label = store.DefaultDeviceLabel
	}
	now := s.clock()
	refresh, digest, err := newRefreshPass()
	if err != nil {
		return Issued{}, err
	}
	ns := store.NewSession{
		IdentityID: in.Identity.ID, Audience: aud, DeviceID: in.DeviceID, DeviceLabel: label,
		RefreshDigest: digest, CreatedIP: in.IP, Now: now, ExpiresAt: now.Add(RefreshLifetime(aud)),
	}
	if aud == store.AudienceClub {
		clubID := in.AccountID
		ns.ClubID = &clubID
	}
	var sess store.Session
	var enrolled bool
	err = s.st.InTx(ctx, func(q *store.Queries) error {
		if in.DeviceID != nil {
			_, created, err := q.EnrollDevice(ctx, in.AccountID, *in.DeviceID, label, now)
			if err != nil {
				return err
			}
			enrolled = created
		}
		if sess, err = q.InsertSession(ctx, ns); err != nil {
			return err
		}
		ev := store.NewEvent{IdentityID: &in.Identity.ID, SessionID: &sess.ID, Audience: aud, IP: in.IP, DeviceID: in.DeviceID, At: now}
		ev.Event = store.EventSignIn
		if err := q.InsertEvent(ctx, ev); err != nil {
			return err
		}
		if enrolled {
			ev.Event = store.EventDeviceEnrolled
			return q.InsertEvent(ctx, ev)
		}
		return nil
	})
	if err != nil {
		return Issued{}, err
	}
	access, accessExp, err := s.accessFor(sess, in.AccountID, now)
	if err != nil {
		return Issued{}, err
	}
	return Issued{
		Session: sess, AccessPass: access, AccessExpiresAt: accessExp,
		RefreshPass: refresh, RefreshExpiresAt: sess.ExpiresAt, DeviceEnrolled: enrolled,
	}, nil
}
