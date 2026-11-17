package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// Importer copies Supabase Auth accounts into auth_identities. Source is read-only (auth.users); Target is
// the app database (the account tables and auth_identities).
type Importer struct {
	Source *pgxpool.Pool
	Target *pgxpool.Pool
	Now    func() time.Time
	Log    *slog.Logger
}

// account is one account row still on provider supabase.
type account struct {
	kind     store.Audience
	id       uuid.UUID // club id, player id or Admin id
	subject  uuid.UUID // the Supabase user id (auth_subject)
	username string    // club only
	contact  *string   // player only: player_private_contacts.email
}

// srcUser is the part of auth.users the import reads.
type srcUser struct {
	email       *string
	hash        *string
	bannedUntil *time.Time
	deletedAt   *time.Time
}

// Import moves every supabase account to rotra. It is safe to rerun: only accounts still on supabase are read.
// With dryRun every statement runs and rolls back, so the counts are the ones a real run would give.
func (im *Importer) Import(ctx context.Context, dryRun bool) (*Report, error) {
	rep := newReport(dryRun)
	accounts, err := im.pending(ctx, rep)
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(accounts))
	for _, a := range accounts {
		ids = append(ids, a.subject.String())
	}
	users, err := im.users(ctx, ids)
	if err != nil {
		return nil, err
	}
	now := im.Now().UTC()

	// First pass: resolve each account to a login key, and spot keys two users share.
	type plan struct {
		a        account
		key      string
		hash     string
		disabled bool
	}
	var plans []plan
	taken := map[loginRef]int{}
	for _, a := range accounts {
		c := rep.Types[a.kind]
		u, found := users[a.subject]
		if !found {
			c.skip(skipNoSourceUser, a.id)
			continue
		}
		key := a.username
		if a.kind != store.AudienceClub && u.email != nil {
			key = *u.email
		}
		key = strings.ToLower(strings.TrimSpace(key))
		if key == "" {
			c.skip(skipNoLoginKey, a.id)
			continue
		}
		taken[loginRef{a.kind, key}]++
		p := plan{a: a, key: key, disabled: u.disabled(now)}
		if u.hash != nil {
			p.hash = *u.hash
		}
		plans = append(plans, p)
	}

	for _, p := range plans {
		c := rep.Types[p.a.kind]
		switch {
		case taken[loginRef{p.a.kind, p.key}] > 1:
			c.skip(skipDuplicateKey, p.a.id) // never guess which of them owns the key
			continue
		case !isBcrypt(p.hash):
			c.skip(skipBadHash, p.a.id)
			continue
		}
		if p.a.kind == store.AudiencePlayer && (p.a.contact == nil || strings.ToLower(strings.TrimSpace(*p.a.contact)) != p.key) {
			c.Mismatch = append(c.Mismatch, p.a.id)
			im.Log.Warn("player contact email differs from the Supabase email; imported on the Supabase email", "player", p.a.id)
		}
		switch err := im.importOne(ctx, p.a, p.key, p.hash, p.disabled, now, dryRun); {
		case err == nil:
			c.Imported++
			if p.disabled {
				c.Disabled++
			}
		case errors.Is(err, store.ErrLoginKeyTaken):
			c.skip(skipKeyTaken, p.a.id)
		case errors.Is(err, errChanged):
			c.skip(skipChanged, p.a.id)
		default:
			// The error text can carry row data (a unique violation names the key), so log its class only.
			im.Log.Error("account not imported", "type", p.a.kind, "account", p.a.id, "error", errClass(err))
			c.skip(skipFailed, p.a.id)
		}
	}
	return rep, nil
}

type loginRef struct {
	kind store.Audience
	key  string
}

// disabled: a ban still running, or a soft-deleted user.
func (u srcUser) disabled(now time.Time) bool {
	return u.deletedAt != nil || (u.bannedUntil != nil && u.bannedUntil.After(now))
}

// bcryptRE matches what Supabase stores: $2a, $2b or $2y, a two digit cost, 53 characters of salt and hash.
// The cost range is the one the sign-in's verifier accepts.
var bcryptRE = regexp.MustCompile(`^\$2[aby]\$(0[4-9]|1[0-6])\$[./A-Za-z0-9]{53}$`)

func isBcrypt(h string) bool { return bcryptRE.MatchString(h) }

// errDryRun rolls a dry run's transaction back after every check has run.
var errDryRun = errors.New("dry run")

// errClass names an error without its text: the Postgres code and constraint, or "other".
func errClass(err error) string {
	var pg *pgconn.PgError
	if errors.As(err, &pg) {
		return "postgres " + pg.Code + " " + pg.ConstraintName
	}
	return "other"
}

// importOne is one account in one transaction: the identity and the re-point commit together or not at all.
// A dry run runs every statement and rolls back.
func (im *Importer) importOne(ctx context.Context, a account, key, hash string, disabled bool, now time.Time, dryRun bool) error {
	st := store.New(im.Target)
	err := st.InTxWith(ctx, func(tx pgx.Tx, q *store.Queries) error {
		ident, err := q.InsertIdentity(ctx, store.NewIdentity{ID: store.NewID(), Audience: a.kind, LoginKey: key,
			PasswordHash: hash, PasswordScheme: store.SchemeBcrypt, Now: now})
		if err != nil {
			return err
		}
		if disabled {
			if err := q.SetIdentityDisabled(ctx, ident.ID, &now, now); err != nil {
				return err
			}
		}
		if err := repoint(ctx, tx, a, ident.ID, now); err != nil {
			return err
		}
		if dryRun {
			return errDryRun
		}
		return nil
	})
	if errors.Is(err, errDryRun) {
		return nil
	}
	return err
}

var repointSQL = map[store.Audience]string{
	store.AudienceClub: `UPDATE club_accounts SET auth_provider = 'rotra', auth_subject = $1, updated_at = $2, revision = revision + 1
	  WHERE club_id = $3 AND auth_provider = 'supabase' AND auth_subject = $4`,
	store.AudiencePlayer: `UPDATE player_accounts SET auth_provider = 'rotra', auth_subject = $1, updated_at = $2, revision = revision + 1
	  WHERE player_id = $3 AND auth_provider = 'supabase' AND auth_subject = $4`,
	store.AudienceAdmin: `UPDATE admin_accounts SET auth_provider = 'rotra', auth_subject = $1, updated_at = $2, revision = revision + 1
	  WHERE id = $3 AND auth_provider = 'supabase' AND auth_subject = $4`,
}

func repoint(ctx context.Context, tx pgx.Tx, a account, identity uuid.UUID, now time.Time) error {
	tag, err := tx.Exec(ctx, repointSQL[a.kind], identity, now, a.id, a.subject)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return errChanged
	}
	return nil
}

var errChanged = errors.New("account changed during the import")

// pending lists the accounts still on provider supabase and counts them.
func (im *Importer) pending(ctx context.Context, rep *Report) ([]account, error) {
	var out []account
	queries := []struct {
		kind store.Audience
		sql  string
	}{
		{store.AudienceClub, `SELECT club_id, auth_subject, username, NULL::text FROM club_accounts WHERE auth_provider = 'supabase' AND auth_subject IS NOT NULL ORDER BY club_id`},
		{store.AudiencePlayer, `SELECT a.player_id, a.auth_subject, '', c.email FROM player_accounts a
		  LEFT JOIN player_private_contacts c ON c.player_id = a.player_id WHERE a.auth_provider = 'supabase' ORDER BY a.player_id`},
		{store.AudienceAdmin, `SELECT id, auth_subject, '', NULL::text FROM admin_accounts WHERE auth_provider = 'supabase' ORDER BY id`},
	}
	for _, q := range queries {
		rows, err := im.Target.Query(ctx, q.sql)
		if err != nil {
			return nil, fmt.Errorf("listing %s accounts: %w", q.kind, err)
		}
		for rows.Next() {
			a := account{kind: q.kind}
			if err := rows.Scan(&a.id, &a.subject, &a.username, &a.contact); err != nil {
				rows.Close()
				return nil, fmt.Errorf("reading %s accounts: %w", q.kind, err)
			}
			out = append(out, a)
			rep.Types[q.kind].Pending++
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("listing %s accounts: %w", q.kind, err)
		}
	}
	// Club accounts that were never provisioned have no Supabase user: nothing to import, reported by id.
	rows, err := im.Target.Query(ctx, `SELECT club_id FROM club_accounts WHERE auth_provider = 'supabase' AND auth_subject IS NULL ORDER BY club_id`)
	if err != nil {
		return nil, fmt.Errorf("listing club accounts: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("reading club accounts: %w", err)
		}
		rep.Types[store.AudienceClub].Pending++
		rep.Types[store.AudienceClub].skip(skipNoSubject, id)
	}
	return out, rows.Err()
}

// users reads the Supabase users for the given ids, in one read-only snapshot.
func (im *Importer) users(ctx context.Context, ids []string) (map[uuid.UUID]srcUser, error) {
	out := make(map[uuid.UUID]srcUser, len(ids))
	tx, err := im.Source.BeginTx(ctx, pgx.TxOptions{AccessMode: pgx.ReadOnly, IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return nil, fmt.Errorf("opening the source: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	rows, err := tx.Query(ctx, `SELECT id, email, encrypted_password, banned_until, deleted_at FROM auth.users WHERE id = ANY($1::uuid[])`, ids)
	if err != nil {
		return nil, fmt.Errorf("reading auth.users: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		var u srcUser
		if err := rows.Scan(&id, &u.email, &u.hash, &u.bannedUntil, &u.deletedAt); err != nil {
			return nil, fmt.Errorf("reading auth.users: %w", err)
		}
		out[id] = u
	}
	return out, rows.Err()
}
