package claim

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// decision is what the branch checks of completeClaim and completeRecordClaim concluded about a link.
type decision struct {
	// problem is a refusal.
	problem *problem
	// retry is set when the link was already used: the claim is a sign-in retry for this player.
	retry uuid.UUID
	// phone is the number the contact will hold, when the claim may go on.
	phone string
}

func (d decision) proceeds() bool { return d.problem == nil && d.retry == uuid.Nil }

// decide runs the checks in the order each TypeScript branch ran them, on whatever q reads (the pool before the
// transaction, the transaction itself once the link is locked): the same function answers both, so the
// transaction cannot disagree with the pre-check except through a real change in between.
func decide(ctx context.Context, q *sqlcgen.Queries, l *link, s submission, now time.Time) (decision, error) {
	if l.state() == sqlcgen.PlayerClaimLinkStateRevoked {
		return decision{problem: refuse(httpapi.ErrForbidden, "link", msgExpired)}, nil
	}
	if l.record != nil {
		return decideRecord(ctx, q, l.record, s, now)
	}
	return decidePlayer(ctx, q, l.player, s, now)
}

// decidePlayer is completeClaim for a link on a `players` row.
func decidePlayer(ctx context.Context, q *sqlcgen.Queries, l *playerLink, s submission, now time.Time) (decision, error) {
	consumed := l.State == sqlcgen.PlayerClaimLinkStateConsumed
	if consumed || l.ProfileState == sqlcgen.PlayerProfileStateClaimed {
		if consumed {
			return decision{retry: uuidOf(l.PlayerID)}, nil
		}
		return decision{problem: refuse(httpapi.ErrForbidden, "link", msgRegistered)}, nil
	}
	if !l.ExpiresAt.Time.After(now) {
		return decision{problem: refuse(httpapi.ErrForbidden, "link", msgExpired)}, nil
	}
	if !l.RtrID.Valid {
		return decision{problem: refuse(httpapi.ErrInvalid, "link", msgExpired)}, nil
	}
	// A profile with no phone on file takes the player's own number; one on file never changes.
	phone := orEmpty(l.ContactPhone)
	if phone == "" {
		phone = s.phone
	}
	if phone == "" {
		return decision{problem: refuse(httpapi.ErrInvalid, "phone", msgNeedsPhone)}, nil
	}
	if !l.ContactPhone.Valid {
		if _, err := q.FindContactPlayerByPhone(ctx, phone); err == nil {
			return decision{problem: refuse(httpapi.ErrConflict, "phone", msgPhoneTaken)}, nil
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return decision{}, err
		}
	}
	owner, err := q.FindContactPlayerByEmail(ctx, pgtype.Text{String: s.email, Valid: true})
	switch {
	case err == nil && uuidOf(owner) != uuidOf(l.PlayerID):
		return decision{problem: refuse(httpapi.ErrConflict, "email", msgEmailTaken)}, nil
	case err != nil && !errors.Is(err, pgx.ErrNoRows):
		return decision{}, err
	}
	if taken, err := loginTaken(ctx, q, s.email); err != nil {
		return decision{}, err
	} else if taken {
		return decision{problem: refuse(httpapi.ErrConflict, "email", msgEmailTaken)}, nil
	}
	if l.HasAccount {
		// An account with no consumed link: not a state this flow creates. Refuse without guessing.
		return decision{problem: &problem{code: httpapi.ErrConflict}}, nil
	}
	return decision{phone: phone}, nil
}

// decideRecord is completeRecordClaim for a link on a club's own unclaimed record.
func decideRecord(ctx context.Context, q *sqlcgen.Queries, l *recordLink, s submission, now time.Time) (decision, error) {
	if l.RemovedAt.Valid {
		return decision{problem: refuse(httpapi.ErrForbidden, "link", msgExpired)}, nil
	}
	if l.PlayerID.Valid {
		// Registered meanwhile: through this link (a retry) or by registering with the same phone.
		if l.State == sqlcgen.PlayerClaimLinkStateConsumed {
			return decision{retry: uuidOf(l.PlayerID)}, nil
		}
		return decision{problem: refuse(httpapi.ErrForbidden, "link", msgRegistered)}, nil
	}
	if l.State != sqlcgen.PlayerClaimLinkStateActive || !l.ExpiresAt.Time.After(now) {
		return decision{problem: refuse(httpapi.ErrForbidden, "link", msgExpired)}, nil
	}
	// The club's phone on file wins; a record without one takes the player's own number.
	phone := orEmpty(l.InputPhone)
	if phone == "" {
		phone = s.phone
	}
	if phone == "" {
		return decision{problem: refuse(httpapi.ErrInvalid, "phone", msgNeedsPhone)}, nil
	}
	if _, err := q.FindContactPlayerByPhone(ctx, phone); err == nil {
		return decision{problem: refuse(httpapi.ErrConflict, "phone", msgPhoneTaken)}, nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return decision{}, err
	}
	if _, err := q.FindContactPlayerByEmail(ctx, pgtype.Text{String: s.email, Valid: true}); err == nil {
		return decision{problem: refuse(httpapi.ErrConflict, "email", msgEmailTaken)}, nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return decision{}, err
	}
	if taken, err := loginTaken(ctx, q, s.email); err != nil {
		return decision{}, err
	} else if taken {
		return decision{problem: refuse(httpapi.ErrConflict, "email", msgEmailTaken)}, nil
	}
	return decision{phone: phone}, nil
}

// loginTaken reports whether a player sign-in already uses the email. Identities are per audience, so only a
// player identity can conflict; the message is the contact one (the old EMAIL_HAS_LOGIN copy named club and Admin
// logins, which no longer share the namespace).
func loginTaken(ctx context.Context, q *sqlcgen.Queries, email string) (bool, error) {
	_, err := q.GetAuthIdentityByLogin(ctx, sqlcgen.GetAuthIdentityByLoginParams{Audience: string(store.AudiencePlayer), LoginKey: email})
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}
