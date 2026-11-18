package store

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

func identityFrom(r sqlcgen.AuthIdentity) Identity {
	return Identity{
		ID: fromPgUUID(r.ID), Audience: Audience(r.Audience), LoginKey: r.LoginKey,
		PasswordHash: r.PasswordHash, PasswordScheme: r.PasswordScheme,
		PasswordChangedAt: fromPgTime(r.PasswordChangedAt), DisabledAt: fromPgTimep(r.DisabledAt),
		CreatedAt: fromPgTime(r.CreatedAt), UpdatedAt: fromPgTime(r.UpdatedAt), Revision: r.Revision,
	}
}

// GetIdentityByLogin finds the identity for a login key (club username, or normalized email).
func (q *Queries) GetIdentityByLogin(ctx context.Context, audience Audience, loginKey string) (Identity, error) {
	r, err := q.q.GetAuthIdentityByLogin(ctx, sqlcgen.GetAuthIdentityByLoginParams{Audience: string(audience), LoginKey: loginKey})
	if err != nil {
		return Identity{}, wrap("get identity by login", err)
	}
	return identityFrom(r), nil
}

// GetIdentityByID finds an identity by id.
func (q *Queries) GetIdentityByID(ctx context.Context, id uuid.UUID) (Identity, error) {
	r, err := q.q.GetAuthIdentityByID(ctx, pgUUID(id))
	if err != nil {
		return Identity{}, wrap("get identity", err)
	}
	return identityFrom(r), nil
}

// InsertIdentity creates an identity. ErrLoginKeyTaken when the (audience, login key) pair exists.
func (q *Queries) InsertIdentity(ctx context.Context, in NewIdentity) (Identity, error) {
	r, err := q.q.InsertAuthIdentity(ctx, sqlcgen.InsertAuthIdentityParams{
		ID: pgUUID(idOrNew(in.ID)), Audience: string(in.Audience), LoginKey: in.LoginKey,
		PasswordHash: in.PasswordHash, PasswordScheme: in.PasswordScheme, Now: pgTime(in.Now),
	})
	if err != nil {
		return Identity{}, wrap("insert identity", err)
	}
	return identityFrom(r), nil
}

// UpdatePassword stores a new hash and bumps password_changed_at, updated_at and revision.
func (q *Queries) UpdatePassword(ctx context.Context, id uuid.UUID, hash, scheme string, now time.Time) error {
	n, err := q.q.UpdateAuthIdentityPassword(ctx, sqlcgen.UpdateAuthIdentityPasswordParams{
		PasswordHash: hash, PasswordScheme: scheme, Now: pgTime(now), ID: pgUUID(id),
	})
	return rowsOrNotFound("update password", n, err)
}

// SetIdentityDisabled locks the sign-in (at) or unlocks it (nil). It does not touch the account tables.
func (q *Queries) SetIdentityDisabled(ctx context.Context, id uuid.UUID, at *time.Time, now time.Time) error {
	n, err := q.q.SetAuthIdentityDisabled(ctx, sqlcgen.SetAuthIdentityDisabledParams{
		DisabledAt: pgTimep(at), Now: pgTime(now), ID: pgUUID(id),
	})
	return rowsOrNotFound("set identity disabled", n, err)
}

// ChangeLoginKey moves an identity to a new login key (an approved email change). ErrLoginKeyTaken when
// another identity of the same audience has it.
func (q *Queries) ChangeLoginKey(ctx context.Context, id uuid.UUID, loginKey string, now time.Time) error {
	n, err := q.q.ChangeAuthIdentityLoginKey(ctx, sqlcgen.ChangeAuthIdentityLoginKeyParams{
		LoginKey: loginKey, Now: pgTime(now), ID: pgUUID(id),
	})
	return rowsOrNotFound("change login key", n, err)
}

// ClubAccountBySubject finds the club account linked to an identity (auth_provider 'rotra').
func (q *Queries) ClubAccountBySubject(ctx context.Context, subject uuid.UUID) (ClubAccount, error) {
	r, err := q.q.GetClubAccountBySubject(ctx, pgUUID(subject))
	if err != nil {
		return ClubAccount{}, wrap("club account by subject", err)
	}
	return ClubAccount{ClubID: fromPgUUID(r.ClubID), Username: r.Username,
		ProvisionedAt: fromPgTimep(r.ProvisionedAt), DisabledAt: fromPgTimep(r.DisabledAt)}, nil
}

// PlayerAccountBySubject finds the player account linked to an identity.
func (q *Queries) PlayerAccountBySubject(ctx context.Context, subject uuid.UUID) (PlayerAccount, error) {
	r, err := q.q.GetPlayerAccountBySubject(ctx, pgUUID(subject))
	if err != nil {
		return PlayerAccount{}, wrap("player account by subject", err)
	}
	return PlayerAccount{PlayerID: fromPgUUID(r.PlayerID), DisabledAt: fromPgTimep(r.DisabledAt)}, nil
}

// AdminAccountBySubject finds the Admin account linked to an identity.
func (q *Queries) AdminAccountBySubject(ctx context.Context, subject uuid.UUID) (AdminAccount, error) {
	r, err := q.q.GetAdminAccountBySubject(ctx, pgUUID(subject))
	if err != nil {
		return AdminAccount{}, wrap("admin account by subject", err)
	}
	return AdminAccount{ID: fromPgUUID(r.ID), DisplayName: r.DisplayName, Active: r.Active}, nil
}
