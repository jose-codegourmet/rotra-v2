package adminwrites

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/contactwrites"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/contactchange"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Contact-change requests: POST /api/contact-change-requests (the owner enters a request for a player) and the four decisions
// POST /api/contact-change-requests/{requestId}/{approve|decline|check|retry}. Ports of the Route Handlers in
// apps/admin/src/app/api/contact-change-requests/** and of packages/db/src/player/contact-change.ts. The reads the decisions
// answer with are signedin's (GET /api/contact-change-requests/{requestId}).
//
// A decision is several steps, as in the TypeScript, each in its own transaction: the review (approve or decline), then for an
// approval the application (stage as applying, change the login at the provider, read it back, settle the contact, the
// account and the request). The provider is the sign-in identity here; see contacts_apply.go.

func (s *server) registerContacts(rt *signedin.Router) {
	rt.Handle("POST /api/contact-change-requests", store.AudienceAdmin, s.admin(s.createContactRequest))
	rt.Handle("POST /api/contact-change-requests/{requestId}/approve", store.AudienceAdmin, s.admin(s.approveContact))
	rt.Handle("POST /api/contact-change-requests/{requestId}/decline", store.AudienceAdmin, s.admin(s.declineContact))
	rt.Handle("POST /api/contact-change-requests/{requestId}/check", store.AudienceAdmin, s.admin(s.checkContact))
	rt.Handle("POST /api/contact-change-requests/{requestId}/retry", store.AudienceAdmin, s.admin(s.retryContact))
}

const (
	contactReviewTarget = "/profile/privacy-and-contact"
	contactSourceType   = "contact_change_request"
)

// requestDTO is adminRequestDto: the owner's view of a request that the owner just created.
type requestDTO struct {
	ID                  string  `json:"id"`
	PlayerID            string  `json:"playerId"`
	Field               string  `json:"field"`
	OriginalValue       *string `json:"originalValue"`
	ProposedValue       string  `json:"proposedValue"`
	Status              string  `json:"status"`
	RequestedAt         string  `json:"requestedAt"`
	AppliedAt           *string `json:"appliedAt"`
	RejectedAt          *string `json:"rejectedAt"`
	SupersededAt        *string `json:"supersededAt"`
	Source              string  `json:"source"`
	RawStatus           string  `json:"rawStatus"`
	ApplicationAttempts int32   `json:"applicationAttempts"`
	FailureCode         *string `json:"failureCode"`
	ReviewedAt          *string `json:"reviewedAt"`
}

// statusLabel is the status shown to the player and the owner: approved, applying and failed all read as "approved, not
// applied yet".
func statusLabel(status sqlcgen.ContactChangeStatus) string {
	switch status {
	case sqlcgen.ContactChangeStatusApproved, sqlcgen.ContactChangeStatusApplying, sqlcgen.ContactChangeStatusFailed:
		return "approved_pending"
	}
	return string(status)
}

func isoOrNil(t pgtype.Timestamptz) *string {
	if !t.Valid {
		return nil
	}
	s := httpapi.ToIso(t.Time)
	return &s
}

func textOrNil(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func toRequestDTO(r sqlcgen.PlayerContactChangeRequest) requestDTO {
	return requestDTO{
		ID: r.ID.String(), PlayerID: r.PlayerID.String(), Field: string(r.Field), OriginalValue: textOrNil(r.OriginalValue),
		ProposedValue: r.ProposedValue, Status: statusLabel(r.Status), RequestedAt: httpapi.ToIso(r.RequestedAt.Time),
		AppliedAt: isoOrNil(r.AppliedAt), RejectedAt: isoOrNil(r.RejectedAt), SupersededAt: isoOrNil(r.SupersededAt),
		Source: string(r.Source), RawStatus: string(r.Status), ApplicationAttempts: r.ApplicationAttempts,
		FailureCode: textOrNil(r.FailureCode), ReviewedAt: isoOrNil(r.ReviewedAt),
	}
}

// createContactRequest is POST /api/contact-change-requests: the owner enters a player's new email. It creates a pending
// owner-sourced request only; the email changes after review and application, never here. Repeat-safe on `commandId`; the
// reason goes to the audit event. The order is the TypeScript's: the JSON body; the two IDs and the field (`invalid` with no
// fields); the reason (`invalid` on `reason`: it is never absent, so a blank one is always refused, before a repeat of the
// command is looked for); then in one transaction the repeat of the command, the value, the player's contact, the checks, the
// request and its audit event.
func (s *server) createContactRequest(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	commandID, okCommand := strictUUID(body.Text("commandId"))
	playerID, okPlayer := strictUUID(body.Text("playerId"))
	if field, _ := body["field"].(string); !okCommand || !okPlayer || field != contactchange.FieldEmail {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	reason := fields.JSTrim(body.Text("reason"))
	if reason == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"reason": contactchange.MsgReason})
	}
	value := body.Text("value")
	var created sqlcgen.PlayerContactChangeRequest
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		request, err := s.submitOwnerRequest(ctx, q, p, playerID, commandID, value)
		if err != nil {
			return err
		}
		created = request
		return s.recordAudit(ctx, q, p.AccountID, auditEvent{
			Action: "player.contact_change_submitted", TargetType: "player", TargetID: request.PlayerID.String(),
			SourceCommandID: commandID,
			Metadata:        map[string]any{"requestId": request.ID.String(), "field": string(request.Field), "reason": reason},
		})
	})
	if err != nil {
		return writes.Result{}, contactwrites.MapOpen(err)
	}
	return writes.Result{Status: http.StatusCreated, Body: struct {
		Request requestDTO `json:"request"`
	}{toRequestDTO(created)}}, nil
}

// submitOwnerRequest is `submit` for the owner (the one the Player's own request shares: internal/contactwrites).
func (s *server) submitOwnerRequest(ctx context.Context, q *sqlcgen.Queries, p session.Principal, playerID, commandID pgtype.UUID, value string) (sqlcgen.PlayerContactChangeRequest, error) {
	return contactwrites.Submit(ctx, q, s.stamp(), playerID, commandID, contactchange.FieldEmail, value,
		contactwrites.Source{Owner: true, Admin: pgtype.UUID{Bytes: p.AccountID, Valid: true}})
}

// requestAnswer is `{ request }` of the four decisions: the request as it stands, read the way GET reads it.
type requestAnswer struct {
	Request *signedin.AdminContactRequest `json:"request"`
}

// readRequest is readOneAdminRequest: the request as it stands, `not_found` when there is none (or the ID is no UUID).
func (s *server) readRequest(ctx context.Context, idText string) (*requestAnswer, error) {
	id, ok := strictUUID(idText)
	if !ok {
		return nil, writes.Fail(httpapi.ErrNotFound, nil)
	}
	one, err := signedin.ReadAdminContactRequest(ctx, sqlcgen.New(s.pool), id)
	if err != nil {
		return nil, err
	}
	if one == nil {
		return nil, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return &requestAnswer{one}, nil
}

// lockRequest is lockRequest: the request locked for the decision (`not_found` for an ID that is no UUID or no request).
func lockRequest(ctx context.Context, q *sqlcgen.Queries, idText string) (pgtype.UUID, error) {
	id, ok := strictUUID(idText)
	if !ok {
		return id, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if _, err := q.LockContactRequest(ctx, id); errors.Is(err, pgx.ErrNoRows) {
		return id, writes.Fail(httpapi.ErrNotFound, nil)
	} else if err != nil {
		return id, err
	}
	return id, nil
}

// declineContact is POST .../decline: the player keeps the current contact. Repeat-safe; changes no contact.
func (s *server) declineContact(r *http.Request, p session.Principal) (writes.Result, error) {
	if _, err := s.reviewContact(r.Context(), p, r.PathValue("requestId"), false); err != nil {
		return writes.Result{}, err
	}
	answer, err := s.readRequest(r.Context(), r.PathValue("requestId"))
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: answer}, nil
}

// approveContact is POST .../approve: the review (rechecks the contact revision and collisions, reserves the value), then the
// application at the provider. A repeated approval of a change already being applied answers it unchanged.
func (s *server) approveContact(r *http.Request, p session.Principal) (writes.Result, error) {
	idText := r.PathValue("requestId")
	reviewed, err := s.reviewContact(r.Context(), p, idText, true)
	if err != nil {
		return writes.Result{}, err
	}
	if reviewed.Status == sqlcgen.ContactChangeStatusApproved {
		ctx, cancel := detached(r.Context())
		defer cancel()
		if err := s.applySaved(ctx, p, reviewed.ID); err != nil {
			return writes.Result{}, err
		}
	}
	answer, err := s.readRequest(r.Context(), idText)
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: answer}, nil
}

// retryContact is POST .../retry: only a failed application is retried; one already applying or applied is answered as it
// stands, and anything else is a `conflict`.
func (s *server) retryContact(r *http.Request, p session.Principal) (writes.Result, error) {
	idText := r.PathValue("requestId")
	current, err := s.readRequest(r.Context(), idText)
	if err != nil {
		return writes.Result{}, err
	}
	switch current.Request.Status {
	case string(sqlcgen.ContactChangeStatusFailed):
		ctx, cancel := detached(r.Context())
		defer cancel()
		if err := s.applySaved(ctx, p, pgIDOf(current.Request.RequestID)); err != nil {
			return writes.Result{}, err
		}
	case string(sqlcgen.ContactChangeStatusApplying), string(sqlcgen.ContactChangeStatusApplied):
	default:
		return writes.Result{}, writes.Fail(httpapi.ErrConflict, map[string]string{"request": contactchange.MsgNotWaiting})
	}
	answer, err := s.readRequest(r.Context(), idText)
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: answer}, nil
}

// checkContact is POST .../check: reads the provider back for an approved change and settles it (applied only when the login
// and the contact agree). Any other request is answered as it stands.
func (s *server) checkContact(r *http.Request, p session.Principal) (writes.Result, error) {
	idText := r.PathValue("requestId")
	current, err := s.readRequest(r.Context(), idText)
	if err != nil {
		return writes.Result{}, err
	}
	switch current.Request.Status {
	case string(sqlcgen.ContactChangeStatusApproved), string(sqlcgen.ContactChangeStatusApplying), string(sqlcgen.ContactChangeStatusFailed):
		ctx, cancel := detached(r.Context())
		defer cancel()
		if err := s.reconcile(ctx, p, pgIDOf(current.Request.RequestID)); err != nil {
			return writes.Result{}, err
		}
	}
	answer, err := s.readRequest(r.Context(), idText)
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: answer}, nil
}

// pgIDOf reads an ID the database itself printed.
func pgIDOf(id string) pgtype.UUID {
	out, _ := strictUUID(id)
	return out
}

// reviewContact is reviewContactChange: the owner's decision. Approval rechecks the contact revision and collisions and
// reserves the value (the partial unique indexes on the table); it does not change a contact. A decision on a request that is
// no longer pending answers it as it stands when it asks for what the request already is (or the request is applied), and is
// a `conflict` otherwise. It returns the request as the review left it.
func (s *server) reviewContact(ctx context.Context, p session.Principal, idText string, approve bool) (sqlcgen.PlayerContactChangeRequest, error) {
	var out sqlcgen.PlayerContactChangeRequest
	err := writes.InTx(ctx, s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		id, err := lockRequest(ctx, q, idText)
		if err != nil {
			return err
		}
		request, err := q.GetContactRequest(ctx, id)
		if err != nil {
			return err
		}
		target := sqlcgen.ContactChangeStatusRejected
		if approve {
			target = sqlcgen.ContactChangeStatusApproved
		}
		if request.Status != sqlcgen.ContactChangeStatusPending {
			if statusLabel(request.Status) == statusLabel(target) || request.Status == sqlcgen.ContactChangeStatusApplied {
				out = request
				return nil
			}
			return writes.Fail(httpapi.ErrConflict, map[string]string{"request": contactchange.MsgDecided})
		}
		now := s.stamp()
		admin := pgtype.UUID{Bytes: p.AccountID, Valid: true}
		if !approve {
			rejected, err := q.RejectContactRequest(ctx, sqlcgen.RejectContactRequestParams{AdminID: admin, Now: now, ID: request.ID})
			if err != nil {
				return err
			}
			if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
				Action: "player.contact_change_rejected", TargetType: "player", TargetID: request.PlayerID.String(),
				Metadata: map[string]any{"requestId": request.ID.String(), "field": string(request.Field)},
			}); err != nil {
				return err
			}
			out = rejected
			return notifyContactReview(ctx, q, rejected, "declined", now)
		}
		approved, err := s.approveRequest(ctx, q, p, request, now)
		if err != nil {
			return err
		}
		out = approved
		return nil
	})
	return out, contactwrites.MapOpen(err)
}

// approveRequest is the approval of a pending request, under the request's lock: serialized with an Admin email edit, it
// refuses an edit of the player's email waiting, a contact that changed since the request, an email another edit is waiting
// for and a value another player holds; then it reserves the value with a provider operation of its own.
func (s *server) approveRequest(ctx context.Context, q *sqlcgen.Queries, p session.Principal, request sqlcgen.PlayerContactChangeRequest, now pgtype.Timestamptz) (sqlcgen.PlayerContactChangeRequest, error) {
	fail := func(field, message string) error {
		return writes.Fail(httpapi.ErrConflict, map[string]string{field: message})
	}
	if err := q.LockPlayerForWrite(ctx, request.PlayerID); err != nil {
		return request, err
	}
	if _, err := q.GetPendingEmailEdit(ctx, request.PlayerID); err == nil {
		return request, fail("request", contactchange.MsgAdminEmail)
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return request, err
	}
	contact, err := q.GetPrivateContactOfPlayer(ctx, request.PlayerID)
	if err != nil {
		return request, err // findUniqueOrThrow: a request of a player with no contact row is unexpected
	}
	if contact.Revision != request.OriginalContactRevision {
		return request, fail("request", contactchange.MsgContacts)
	}
	if request.Field == sqlcgen.ContactChangeFieldEmail {
		if err := q.LockReservedEmail(ctx, "rotra-admin-email:"+publicreads.JSToLower(request.ProposedValue)); err != nil {
			return request, err
		}
		if _, err := q.FindReservedEmailEdit(ctx, sqlcgen.FindReservedEmailEditParams{Email: request.ProposedValue, PlayerID: request.PlayerID}); err == nil {
			return request, fail("value", contactchange.MsgUsed)
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return request, err
		}
	}
	taken, err := contactwrites.Collides(ctx, q, request.PlayerID, request.Field, request.ProposedValue)
	if err != nil {
		return request, err
	}
	if taken {
		return request, fail("value", contactchange.MsgUsed)
	}
	operation, err := newUUID()
	if err != nil {
		return request, err
	}
	approved, err := q.ApproveContactRequest(ctx, sqlcgen.ApproveContactRequestParams{
		AdminID: pgtype.UUID{Bytes: p.AccountID, Valid: true}, Now: now, OperationRef: operation, ID: request.ID,
	})
	if err != nil {
		return request, err
	}
	if err := s.recordAudit(ctx, q, p.AccountID, auditEvent{
		Action: "player.contact_change_approved", TargetType: "player", TargetID: request.PlayerID.String(),
		Metadata: map[string]any{"requestId": request.ID.String(), "field": string(request.Field)},
	}); err != nil {
		return request, err
	}
	return approved, notifyContactReview(ctx, q, approved, "approved", now)
}

// notifyContactReview is notifyContactReview (notification-events.ts): the player is told of the decision. A profile with no
// account has no inbox (the insert selects the account), and a repeat of the same request writes nothing.
func notifyContactReview(ctx context.Context, q *sqlcgen.Queries, request sqlcgen.PlayerContactChangeRequest, decision string, now pgtype.Timestamptz) error {
	id, err := newUUID()
	if err != nil {
		return err
	}
	return q.InsertAccountNotification(ctx, sqlcgen.InsertAccountNotificationParams{
		ID: id, PlayerID: request.PlayerID, Title: "Your " + contactchange.Word(string(request.Field)) + " change was " + decision,
		Body: "ROTRA Admin " + decision + " the change.", Target: contactReviewTarget,
		SourceType: pgtype.Text{String: contactSourceType, Valid: true}, SourceID: request.ID, Now: now,
	})
}
