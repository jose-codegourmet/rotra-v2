package main

import (
	"context"
	"fmt"
	"io"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// Gap is an account that has no identity to sign in with.
type Gap struct {
	ID       uuid.UUID
	Provider string // supabase: not imported yet; rotra: it points at an identity that does not exist
}

// VerifyCounts compares one account type with its identities.
type VerifyCounts struct {
	Accounts      int // every account row
	Linked        int // on rotra and pointing at an identity of the same audience
	Pending       int // still on supabase (not imported)
	Unprovisioned int // club accounts with no auth subject yet: nothing to import, not a gap
	Without       []Gap
	Identities    int // identities of this audience
	Unlinked      int // identities no account of this type points at
}

// VerifyReport is the result of --verify.
type VerifyReport struct {
	Types map[store.Audience]*VerifyCounts
}

// Gaps is the number of accounts without an identity.
func (r *VerifyReport) Gaps() int {
	n := 0
	for _, c := range r.Types {
		n += len(c.Without)
	}
	return n
}

// Print writes the report. It holds counts and account ids only.
func (r *VerifyReport) Print(w io.Writer) error {
	p := &printer{w: w}
	p.f("mode=verify\n")
	for _, k := range kinds {
		c := r.Types[k]
		p.f("%s accounts=%d linked=%d pending=%d unprovisioned=%d without_identity=%d identities=%d unlinked_identities=%d\n",
			k, c.Accounts, c.Linked, c.Pending, c.Unprovisioned, len(c.Without), c.Identities, c.Unlinked)
	}
	for _, k := range kinds {
		for _, g := range r.Types[k].Without {
			p.f("without_identity %s %s provider=%s\n", k, g.ID, g.Provider)
		}
	}
	if r.Gaps() == 0 {
		p.f("verify=ok\n")
	} else {
		p.f("verify=failed\n")
	}
	return p.err
}

// Verify compares every account type with the identities it should have. It only reads.
func (im *Importer) Verify(ctx context.Context) (*VerifyReport, error) {
	rep := &VerifyReport{Types: map[store.Audience]*VerifyCounts{}}
	for _, k := range kinds {
		q := verifyQueries[k]
		c := &VerifyCounts{}
		rows, err := im.Target.Query(ctx, q.accounts)
		if err != nil {
			return nil, fmt.Errorf("verifying %s accounts: %w", k, err)
		}
		for rows.Next() {
			var (
				id            uuid.UUID
				provider      string
				unprovisioned bool
				linked        bool
			)
			if err := rows.Scan(&id, &provider, &unprovisioned, &linked); err != nil {
				rows.Close()
				return nil, fmt.Errorf("verifying %s accounts: %w", k, err)
			}
			c.Accounts++
			switch {
			case unprovisioned:
				c.Unprovisioned++
			case linked:
				c.Linked++
			default:
				if provider == "supabase" {
					c.Pending++
				}
				c.Without = append(c.Without, Gap{ID: id, Provider: provider})
			}
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("verifying %s accounts: %w", k, err)
		}
		if err := im.Target.QueryRow(ctx, `SELECT count(*) FROM auth_identities WHERE audience = $1`, string(k)).Scan(&c.Identities); err != nil {
			return nil, fmt.Errorf("counting %s identities: %w", k, err)
		}
		if err := im.Target.QueryRow(ctx, q.unlinked, string(k)).Scan(&c.Unlinked); err != nil {
			return nil, fmt.Errorf("counting unlinked %s identities: %w", k, err)
		}
		rep.Types[k] = c
	}
	return rep, nil
}

// verifyQueries are one pair per account type: every account with whether it is unprovisioned (club only)
// and linked to an identity of its audience, and the identities of the audience no account points at.
var verifyQueries = map[store.Audience]struct{ accounts, unlinked string }{
	store.AudienceClub: {
		`SELECT a.club_id, a.auth_provider, a.auth_subject IS NULL, i.id IS NOT NULL FROM club_accounts a
		  LEFT JOIN auth_identities i ON a.auth_provider = 'rotra' AND i.id = a.auth_subject AND i.audience = 'club' ORDER BY a.club_id`,
		`SELECT count(*) FROM auth_identities i WHERE i.audience = $1 AND NOT EXISTS (
		  SELECT 1 FROM club_accounts a WHERE a.auth_provider = 'rotra' AND a.auth_subject = i.id)`,
	},
	store.AudiencePlayer: {
		`SELECT a.player_id, a.auth_provider, false, i.id IS NOT NULL FROM player_accounts a
		  LEFT JOIN auth_identities i ON a.auth_provider = 'rotra' AND i.id = a.auth_subject AND i.audience = 'player' ORDER BY a.player_id`,
		`SELECT count(*) FROM auth_identities i WHERE i.audience = $1 AND NOT EXISTS (
		  SELECT 1 FROM player_accounts a WHERE a.auth_provider = 'rotra' AND a.auth_subject = i.id)`,
	},
	store.AudienceAdmin: {
		`SELECT a.id, a.auth_provider, false, i.id IS NOT NULL FROM admin_accounts a
		  LEFT JOIN auth_identities i ON a.auth_provider = 'rotra' AND i.id = a.auth_subject AND i.audience = 'admin' ORDER BY a.id`,
		`SELECT count(*) FROM auth_identities i WHERE i.audience = $1 AND NOT EXISTS (
		  SELECT 1 FROM admin_accounts a WHERE a.auth_provider = 'rotra' AND a.auth_subject = i.id)`,
	},
}
