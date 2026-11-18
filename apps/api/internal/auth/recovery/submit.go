package recovery

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf16"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// maxEmailUnits is the longest address submitPasswordResetRequest accepts, counted the way JavaScript counts
// (UTF-16 code units), as the table's CHECK allows it.
const maxEmailUnits = 254

// Submit saves a request for Admin review (submitPasswordResetRequest). The answer is the same for every address:
// nil, whether the address belongs to an account that can be helped or to nobody. An eligible account links its
// player to the request; anything else is saved with no player (an Admin sees it and cannot issue a link).
// One unresolved request per address: a repeat or a simultaneous request is a no-op (the partial unique index).
//
// A malformed address is the only refusal, and it carries no account information.
func (r *Recovery) Submit(ctx context.Context, email string) error {
	address := strings.ToLower(fields.JSTrim(email))
	if !validAddress(address) {
		return refuse(httpapi.ErrInvalid, "email", msgEmail)
	}
	q := sqlcgen.New(r.pool)
	var playerID pgtype.UUID
	row, err := q.GetResetAccountByEmail(ctx, pgtype.Text{String: address, Valid: true})
	switch {
	case errors.Is(err, pgx.ErrNoRows): // unknown address, or a contact with no account
	case err != nil:
		return fmt.Errorf("recovery: reading the account of a reset request: %w", err)
	default:
		a := accountFrom(row.Email, pgtype.Text{String: row.AuthProvider, Valid: true}, row.AuthSubject, row.AccountDisabledAt,
			sqlcgen.NullPlayerContactSyncStatus{PlayerContactSyncStatus: row.ContactSyncStatus, Valid: true}, row.IdentityUsable)
		if a.eligible(address) {
			playerID = row.PlayerID
		}
	}
	err = q.InsertResetRequest(ctx, sqlcgen.InsertResetRequestParams{
		ID: pgUUID(store.NewID()), Email: address, PlayerID: playerID, Now: pgtype.Timestamptz{Time: r.clock(), Valid: true},
	})
	if err != nil {
		return fmt.Errorf("recovery: saving a reset request: %w", err)
	}
	return nil
}

// validAddress is /^[^\s@]+@[^\s@]+\.[^\s@]+$/ with JavaScript's \s, at most 254 UTF-16 units. A NUL is refused
// too: the regex lets it through and Postgres would answer a database error (a 500).
func validAddress(s string) bool {
	if len(utf16.Encode([]rune(s))) > maxEmailUnits || strings.ContainsRune(s, 0) {
		return false
	}
	if strings.ContainsFunc(s, func(c rune) bool { return fields.IsJSSpace(c) || unicode.IsSpace(c) }) {
		return false
	}
	local, domain, ok := strings.Cut(s, "@")
	if !ok || local == "" || strings.Contains(domain, "@") {
		return false
	}
	// [^\s@]+\.[^\s@]+: some dot with a character before it and one after it.
	d := []rune(domain)
	for i := 1; i < len(d)-1; i++ {
		if d[i] == '.' {
			return true
		}
	}
	return false
}
