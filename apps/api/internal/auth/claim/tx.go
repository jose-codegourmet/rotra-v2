package claim

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/identity"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
)

// claimed is a committed claim: the identity to sign in and the player it belongs to.
type claimed struct {
	ident    store.Identity
	playerID uuid.UUID
}

// outcome is what the claim transaction ended with. Exactly one of its fields is set.
type outcome struct {
	done    *claimed
	problem *problem
	// retry is the player of a link that was used while this request waited for the lock.
	retry uuid.UUID
}

// errNoWrite ends the transaction without committing anything: the outcome carries the reason.
var errNoWrite = errors.New("claim: nothing to write")

// claim is the one transaction that replaces the provider staging of the TypeScript. The password is already
// hashed (hash), so no hashing runs while the link row is held.
//
// Lock order, the same for every claim, so two claims can never wait on each other: the link row; then the
// player row (a player's link) or the new player and its contact (a record's link), whose unique phone and email
// keys make claims for the same phone or email queue up; then the club record; then the RTR counter row; then the
// rest. A second claim of the same link waits on the link row and finds it consumed.
func (h *handlers) claim(ctx context.Context, digest []byte, s submission, d profile.Details, hash string, now time.Time) (outcome, error) {
	var out outcome
	err := h.st.InTxWith(ctx, func(tx pgx.Tx, sq *store.Queries) error {
		q := sqlcgen.New(tx)
		if _, err := q.LockPlayerClaimLink(ctx, digest); errors.Is(err, pgx.ErrNoRows) {
			if _, err = q.LockClubPlayerClaimLink(ctx, digest); errors.Is(err, pgx.ErrNoRows) {
				out.problem = refuse(httpapi.ErrForbidden, "link", msgExpired)
				return errNoWrite
			} else if err != nil {
				return err
			}
		} else if err != nil {
			return err
		}
		l, err := findLink(ctx, q, digest)
		if err != nil {
			return err
		}
		dec, err := decide(ctx, q, l, s, now)
		if err != nil {
			return err
		}
		if !dec.proceeds() {
			out.problem, out.retry = dec.problem, dec.retry
			return errNoWrite
		}
		w := writer{ctx: ctx, tx: tx, q: q, sq: sq, s: s, d: d, hash: hash, now: now}
		if l.record != nil {
			out, err = w.record(l.record, dec.phone)
		} else {
			out, err = w.player(l.player, dec.phone)
		}
		if err != nil || out.done == nil {
			return firstErr(err, errNoWrite)
		}
		return nil
	})
	if errors.Is(err, errNoWrite) {
		return out, nil
	}
	if err != nil {
		return outcome{}, err
	}
	return out, nil
}

func firstErr(a, b error) error {
	if a != nil {
		return a
	}
	return b
}

// writer carries what the writes of one claim share.
type writer struct {
	ctx  context.Context
	tx   pgx.Tx
	q    *sqlcgen.Queries
	sq   *store.Queries
	s    submission
	d    profile.Details
	hash string
	now  time.Time
}

// stalePlayer re-runs the branch checks once the player row is locked (before anything is written): a change since
// the pre-check, or since the link was locked, ends the claim with that change's answer.
func (w *writer) stalePlayer(l *playerLink, phone string) (outcome, bool, error) {
	fresh, err := findLink(w.ctx, w.q, l.digest)
	if err != nil {
		return outcome{}, false, err
	}
	if fresh == nil {
		return outcome{problem: refuse(httpapi.ErrForbidden, "link", msgExpired)}, true, nil
	}
	dec, err := decide(w.ctx, w.q, fresh, w.s, w.now)
	if err != nil {
		return outcome{}, false, err
	}
	switch {
	case dec.problem != nil || dec.retry != uuid.Nil:
		return outcome{problem: dec.problem, retry: dec.retry}, true, nil
	case dec.phone != phone:
		return outcome{problem: &problem{code: httpapi.ErrConflict}}, true, nil
	}
	return outcome{}, false, nil
}

// staleRecord re-reads a club record's link once the club record is locked. The contact is already written, so the
// phone and email ownership checks cannot be repeated (they would find our own row): only what a club or another
// claim can change is compared.
func (w *writer) staleRecord(l *recordLink, phone string) (outcome, bool, error) {
	fresh, err := findLink(w.ctx, w.q, l.digest)
	if err != nil {
		return outcome{}, false, err
	}
	if fresh == nil || fresh.record == nil {
		return outcome{problem: refuse(httpapi.ErrForbidden, "link", msgExpired)}, true, nil
	}
	r := fresh.record
	onFile := orEmpty(r.InputPhone)
	if onFile == "" {
		onFile = w.s.phone
	}
	switch {
	case r.RemovedAt.Valid, r.State != sqlcgen.PlayerClaimLinkStateActive && !r.PlayerID.Valid, !r.ExpiresAt.Time.After(w.now) && !r.PlayerID.Valid:
		return outcome{problem: refuse(httpapi.ErrForbidden, "link", msgExpired)}, true, nil
	case r.PlayerID.Valid && r.State == sqlcgen.PlayerClaimLinkStateConsumed:
		return outcome{retry: uuidOf(r.PlayerID)}, true, nil
	case r.PlayerID.Valid:
		return outcome{problem: refuse(httpapi.ErrForbidden, "link", msgRegistered)}, true, nil
	case onFile != phone:
		return outcome{problem: &problem{code: httpapi.ErrConflict}}, true, nil
	}
	return outcome{}, false, nil
}

// identity creates the sign-in and its account row for the player (the provider login of the TypeScript).
func (w *writer) identity(playerID uuid.UUID, contactRevision int64) (store.Identity, error) {
	ident, err := w.sq.InsertIdentity(w.ctx, store.NewIdentity{
		Audience: store.AudiencePlayer, LoginKey: w.s.email, PasswordHash: w.hash, PasswordScheme: store.SchemeArgon2id, Now: w.now,
	})
	if err != nil {
		return store.Identity{}, err
	}
	err = w.q.InsertPlayerAccount(w.ctx, sqlcgen.InsertPlayerAccountParams{
		PlayerID: pgUUID(playerID), AuthSubject: pgUUID(ident.ID), Now: pgTime(w.now), ContactSyncVersion: contactRevision,
	})
	if err != nil {
		return store.Identity{}, fmt.Errorf("claim: creating the player account: %w", err)
	}
	return ident, nil
}

// player is completeClaim's transaction for a link on a `players` row: the contact gets the player's email, the
// account maps to the existing player, the profile becomes claimed and the link is consumed. No RTR ID is
// allocated (the staged profile has one) and no other club's records are linked.
func (w *writer) player(l *playerLink, phone string) (outcome, error) {
	pid := uuidOf(l.PlayerID)
	if _, err := w.q.LockPlayerProfile(w.ctx, l.PlayerID); err != nil {
		return outcome{}, fmt.Errorf("claim: locking the player: %w", err)
	}
	if o, changed, err := w.stalePlayer(l, phone); err != nil || changed {
		return o, err
	}
	var rev int64
	var err error
	if l.ContactPhone.Valid {
		rev, err = w.q.SetPrivateContactEmail(w.ctx, sqlcgen.SetPrivateContactEmailParams{
			Email: pgtype.Text{String: w.s.email, Valid: true}, Now: pgTime(w.now), PlayerID: l.PlayerID,
		})
	} else {
		rev, err = w.q.InsertPrivateContact(w.ctx, sqlcgen.InsertPrivateContactParams{
			PlayerID: l.PlayerID, Phone: phone, Email: pgtype.Text{String: w.s.email, Valid: true}, Now: pgTime(w.now),
		})
	}
	if err != nil {
		return outcome{}, fmt.Errorf("claim: writing the contact: %w", err)
	}
	ident, err := w.identity(pid, rev)
	if err != nil {
		return outcome{}, err
	}
	if err := w.q.MarkPlayerClaimed(w.ctx, sqlcgen.MarkPlayerClaimedParams{Now: pgTime(w.now), ID: l.PlayerID}); err != nil {
		return outcome{}, fmt.Errorf("claim: marking the player claimed: %w", err)
	}
	if _, err := profile.Save(w.ctx, w.tx, pid, w.d, nil, w.now); err != nil {
		return outcome{}, fmt.Errorf("claim: saving the details: %w", err)
	}
	if err := w.q.ConsumePlayerClaimLink(w.ctx, sqlcgen.ConsumePlayerClaimLinkParams{Now: pgTime(w.now), ID: l.LinkID}); err != nil {
		return outcome{}, fmt.Errorf("claim: consuming the link: %w", err)
	}
	return outcome{done: &claimed{ident: ident, playerID: pid}}, nil
}

// record is completeRecordClaim's transaction for a link on a club's own record: it creates the claimed player and
// its contact, then the RTR ID of the inviting club's founding city, the account, links this record and every other
// club's record with the same phone, saves the details and consumes the link.
func (w *writer) record(l *recordLink, phone string) (outcome, error) {
	pid, err := uuid.NewV7()
	if err != nil {
		return outcome{}, fmt.Errorf("claim: new player id: %w", err)
	}
	if err := w.q.InsertClaimedPlayer(w.ctx, sqlcgen.InsertClaimedPlayerParams{
		ID: pgUUID(pid), FullName: l.DisplayName, Nickname: l.Nickname, Now: pgTime(w.now),
	}); err != nil {
		return outcome{}, fmt.Errorf("claim: creating the player: %w", err)
	}
	// The unique phone and email keys are where claims for the same number or address queue up.
	rev, err := w.q.InsertPrivateContact(w.ctx, sqlcgen.InsertPrivateContactParams{
		PlayerID: pgUUID(pid), Phone: phone, Email: pgtype.Text{String: w.s.email, Valid: true}, Now: pgTime(w.now),
	})
	if err != nil {
		return outcome{}, fmt.Errorf("claim: writing the contact: %w", err)
	}
	if _, err := w.q.LockClubPlayerRow(w.ctx, sqlcgen.LockClubPlayerRowParams{ClubID: l.ClubID, ID: l.ClubPlayerID}); err != nil {
		return outcome{}, fmt.Errorf("claim: locking the club record: %w", err)
	}
	if o, changed, err := w.staleRecord(l, phone); err != nil || changed {
		return o, err
	}
	_, err = identity.AllocateRTRID(w.ctx, w.tx, pid, uuidOf(l.ClubID), w.now)
	if err != nil {
		return outcome{}, err
	}
	ident, err := w.identity(pid, rev)
	if err != nil {
		return outcome{}, err
	}
	if err := w.q.LinkClubPlayer(w.ctx, sqlcgen.LinkClubPlayerParams{PlayerID: pgUUID(pid), Now: pgTime(w.now), ClubID: l.ClubID, ID: l.ClubPlayerID}); err != nil {
		return outcome{}, fmt.Errorf("claim: linking the club record: %w", err)
	}
	if l.HasInput {
		if err := w.q.ResolveClubPlayerInput(w.ctx, sqlcgen.ResolveClubPlayerInputParams{PlayerID: pgUUID(pid), Now: pgTime(w.now), ClubPlayerID: l.ClubPlayerID}); err != nil {
			return outcome{}, fmt.Errorf("claim: resolving the record's intake: %w", err)
		}
	}
	// Every other club's record with this phone joins the new account (no Queue Master tap).
	if _, err := identity.LinkClubRecordsByPhone(w.ctx, w.tx, pid, phone, w.now); err != nil {
		return outcome{}, err
	}
	if _, err := profile.Save(w.ctx, w.tx, pid, w.d, nil, w.now); err != nil {
		return outcome{}, fmt.Errorf("claim: saving the details: %w", err)
	}
	if err := w.q.ConsumeClubPlayerClaimLink(w.ctx, sqlcgen.ConsumeClubPlayerClaimLinkParams{Now: pgTime(w.now), ID: l.LinkID}); err != nil {
		return outcome{}, fmt.Errorf("claim: consuming the link: %w", err)
	}
	return outcome{done: &claimed{ident: ident, playerID: pid}}, nil
}

// asProblem turns the database errors that mean "someone else got there first" into the refusals the
// TypeScript gave for them, by constraint name; anything else is not a problem and stays an error.
func asProblem(err error) *problem {
	if errors.Is(err, store.ErrLoginKeyTaken) {
		return refuse(httpapi.ErrConflict, "email", msgEmailTaken)
	}
	var pg *pgconn.PgError
	if !errors.As(err, &pg) {
		return nil
	}
	switch {
	case pg.Code == "23505" && pg.ConstraintName == "player_private_contacts_phone_e164_key":
		return refuse(httpapi.ErrConflict, "phone", msgPhoneTaken)
	case pg.Code == "23505" && pg.ConstraintName == "player_private_contacts_email_key":
		return refuse(httpapi.ErrConflict, "email", msgEmailTaken)
	case pg.Code == "23514" && pg.ConstraintName == "player_private_contacts_email_check":
		return refuse(httpapi.ErrInvalid, "email", msgEmailInvalid)
	case pg.Code == "23505", pg.Code == "40P01", pg.Code == "40001":
		// another transaction changed the same rows: the plain conflict, a retry settles it
		return &problem{code: httpapi.ErrConflict}
	}
	return nil
}
