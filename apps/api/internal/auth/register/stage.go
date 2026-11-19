package register

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
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// claimLinkDays is CLAIM_LINK_DAYS: a staging link lasts as long as a club's registration link.
const claimLinkDays = 7

// stageInput is what stageRegistration reads: the attempt's token and where it came from, and the contact and name to stage.
type stageInput struct {
	token string
	// clubText is the club id as the visitor wrote it; the staging link remembers the club, and a retry must come from it.
	clubText string
	club     pgtype.UUID
	email    string
	phone    string
	name     string
	nickname string
}

// stage is stageRegistration, step 1 of registration: the unclaimed player, its private contact, its RTR ID and the staging
// link, in one transaction. It is false when the phone or email already belongs to an account (nothing is created). A
// unique violation is retried once, as the TypeScript does: claims and contact changes write outside these locks too.
func (h *handlers) stage(ctx context.Context, in stageInput) (bool, error) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
	defer cancel()
	for attempt := 0; ; attempt++ {
		ok, err := h.stageOnce(ctx, in)
		if err != nil && attempt == 0 && writes.IsUniqueViolation(err) {
			continue
		}
		return ok, err
	}
}

func (h *handlers) stageOnce(ctx context.Context, in stageInput) (bool, error) {
	digest := digestOf(in.token)
	prepared := false
	err := h.st.InTxWith(ctx, func(tx pgx.Tx, _ *store.Queries) error {
		q := sqlcgen.New(tx)
		if err := q.LockRegistrationKey(ctx, in.token); err != nil {
			return err
		}
		// An attempt that was staged before is resumed, as long as it is the same registration.
		prev, err := q.GetStagedRegistration(ctx, digest)
		if err == nil {
			if uuid.UUID(prev.IssuingClubID.Bytes).String() != in.clubText || !prev.ContactPhone.Valid || prev.ContactPhone.String != in.phone ||
				!prev.ContactEmail.Valid || prev.ContactEmail.String != in.email {
				return writes.Fail(httpapi.ErrInvalid, map[string]string{"registration": "Start a new registration with these details."})
			}
			prepared = true
			return nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err := q.LockRegistrationKey(ctx, "phone:"+in.phone); err != nil {
			return err
		}
		if err := q.LockRegistrationKey(ctx, "registration-email:"+in.email); err != nil {
			return err
		}
		held, err := q.ContactHoldsPhoneOrEmail(ctx, sqlcgen.ContactHoldsPhoneOrEmailParams{Phone: in.phone, Email: pgtype.Text{String: in.email, Valid: true}})
		if err != nil || held {
			return err
		}
		// Club and Admin logins reserve an email too, even without a Player account (the provider's auth.users check).
		reserved, err := q.LoginKeyReserved(ctx, in.email)
		if err != nil || reserved {
			return err
		}
		now := h.stamp()
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		pid := pgtype.UUID{Bytes: id, Valid: true}
		nick := pgtype.Text{}
		if in.nickname != "" {
			nick = pgtype.Text{String: in.nickname, Valid: true}
		}
		if err := q.InsertUnclaimedPlayer(ctx, sqlcgen.InsertUnclaimedPlayerParams{ID: pid, FullName: in.name, Nickname: nick, Now: pgtype.Timestamptz{Time: now, Valid: true}}); err != nil {
			return err
		}
		if _, err := q.InsertPrivateContact(ctx, sqlcgen.InsertPrivateContactParams{
			PlayerID: pid, Phone: in.phone, Email: pgtype.Text{String: in.email, Valid: true}, Now: pgtype.Timestamptz{Time: now, Valid: true},
		}); err != nil {
			return err
		}
		// An email clubs already saved keeps its RTR ID (D-2026-11-16-04).
		if _, err := identity.AllocateRTRIDFor(ctx, tx, id, uuid.UUID(in.club.Bytes), now, in.email); err != nil {
			return err
		}
		link, err := uuid.NewV7()
		if err != nil {
			return err
		}
		if err := q.InsertPlayerClaimLink(ctx, sqlcgen.InsertPlayerClaimLinkParams{
			ID: pgtype.UUID{Bytes: link, Valid: true}, PlayerID: pid, ClubID: in.club, TokenDigest: digest,
			Now: pgtype.Timestamptz{Time: now, Valid: true}, ExpiresAt: pgtype.Timestamptz{Time: now.Add(claimLinkDays * 24 * time.Hour), Valid: true},
		}); err != nil {
			return err
		}
		prepared = true
		return nil
	})
	return prepared, err
}
