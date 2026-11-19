package adminwrites

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/recovery"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Password-reset review: POST /api/password-reset-requests/{requestId} (issue a one-time link, or decline). Port of
// apps/admin/src/app/api/password-reset-requests/[requestId]/route.ts. The logic is the recovery service's Review, which
// go-sign-in ported with its deviations (no provider: the token is made here, one transaction instead of the issuance lease,
// and an extra sign-in event); this file is the route: the pass check, the body, the answer.

// PasswordResetReviewer is the recovery service's review of a request (recovery.Recovery).
type PasswordResetReviewer interface {
	Review(ctx context.Context, adminID uuid.UUID, id string, in recovery.ReviewInput) (recovery.ReviewResult, error)
}

func (s *server) registerResets(rt *signedin.Router) {
	if s.resets == nil {
		return
	}
	rt.Handle("POST /api/password-reset-requests/{requestId}", store.AudienceAdmin, s.admin(s.reviewReset))
}

// reviewReset runs after the pass check. The order is the TypeScript's: the JSON body (`invalid`), then the review, whose own
// checks come first (the ID, the action, the ownership of an issue). `ownershipVerified` counts only as the boolean true.
func (s *server) reviewReset(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	owned, isBool := body.Bool("ownershipVerified")
	res, err := s.resets.Review(r.Context(), p.AccountID, r.PathValue("requestId"), recovery.ReviewInput{
		Action: body.Text("action"), OwnershipVerified: owned && isBool,
	})
	if err != nil {
		var refusal *recovery.Error
		if errors.As(err, &refusal) {
			return writes.Result{}, writes.Fail(refusal.Code, refusal.Fields)
		}
		return writes.Result{}, err
	}
	return writes.Result{Body: res}, nil
}
