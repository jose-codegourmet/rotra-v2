package playerwrites

import (
	"context"
	"net/http"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/contactwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/contactchange"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// POST /api/account/contact-change: P-CONTACT-REQUEST › Send for review. Port of the Route Handler in
// apps/player/src/app/api/account/contact-change/route.ts and of submitOwnContactChange in packages/db/src/player/contact-change.ts.
// It creates a pending request only: the login contact changes after the Admin approves and applies it (the decision side is
// internal/adminwrites), never here. The `submit` is the one the Admin's own request shares (internal/contactwrites).
// Repeat-safe on `commandId`. The request is not audited and no notification is written until the Admin decides.

func (s *server) registerContactChange(rt *signedin.Router) {
	rt.Handle("POST /api/account/contact-change", store.AudiencePlayer, s.player(s.submitContactChange))
}

type contactAnswer struct {
	Request signedin.OwnContactChange `json:"request"`
}

func (s *server) submitContactChange(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	command, okCommand := parseUUID(body.Text("commandId"))
	field, _ := body["field"].(string)
	if !okCommand || (field != contactchange.FieldPhone && field != contactchange.FieldEmail) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	value := body.Text("value")
	var created sqlcgen.PlayerContactChangeRequest
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		request, err := contactwrites.Submit(ctx, q, s.stamp(), self(p), command, field, value, contactwrites.Source{})
		created = request
		return err
	})
	if err != nil {
		return writes.Result{}, contactwrites.MapOpen(err)
	}
	return writes.Result{Status: http.StatusCreated, Body: contactAnswer{signedin.OwnContactChangeOf(created)}}, nil
}
