package signedin

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// The Admin player reads the Admin player writes answer with and decide on: the same directory row, edit values and
// verification the GET routes send, shared here so a write can never disagree with a read about what a player looks
// like. The writes (internal/adminwrites) call these inside their own transaction.

// AdminPlayer is a row of the player directory (AdminPlayer on the wire).
type AdminPlayer = adminPlayerDTO

// AdminPlayerEdit is the directory row with the current edit values on top (what GET /api/players/{playerId} sends as
// `edit`).
type AdminPlayerEdit = adminPlayerEditDTO

// AdminVerification is the player's verification with the full phone and the revision (GET .../verification).
type AdminVerification = adminVerificationDTO

// ReadAdminPlayerDirectory is readAdminPlayerDirectory narrowed to one ID: the player, the open shared entry or the
// club's older record with that ID, or none.
func ReadAdminPlayerDirectory(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, now func() time.Time) ([]AdminPlayer, error) {
	return (&server{now: now}).adminPlayerDirectory(ctx, q, id)
}

// ReadAdminPlayerEdit is readAdminPlayerEdit. idText is the target as the caller typed it. found is false when there
// is no such row.
func ReadAdminPlayerEdit(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, idText string, now func() time.Time) (edit *AdminPlayerEdit, found bool, err error) {
	edit, err = (&server{now: now}).readAdminPlayerEdit(ctx, q, id, idText)
	if err == errNotFound {
		return nil, false, nil
	}
	return edit, err == nil, err
}

// ReadAdminVerification is readAdminAccountVerification for a valid ID: nil when the player is not claimed or has no
// account.
func ReadAdminVerification(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID) (*AdminVerification, error) {
	r, err := http.NewRequestWithContext(ctx, http.MethodGet, "/", nil)
	if err != nil {
		return nil, err
	}
	v, err := readVerification(r, q, id)
	if err != nil || v == nil {
		return nil, err
	}
	return v.admin(), nil
}

// admin is the verification as Admin reads it.
func (v *verification) admin() *adminVerificationDTO {
	out := &adminVerificationDTO{verificationDTO: v.dto, Revision: httpapi.ToDecimalString(v.revision)}
	if v.phone != "" {
		out.Phone = addr(v.phone)
	}
	return out
}
