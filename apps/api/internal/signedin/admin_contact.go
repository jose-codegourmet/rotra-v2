package signedin

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/contactchange"
)

// The contact-change request views: GET /api/contact-change-requests and .../{requestId}. Ports of
// readAdminContactChangeRequests (packages/db/src/player/contact-change.ts) and checksFor
// (packages/data/src/contact-change-request/contactChangeRequest.rules.ts), which is rules/contactchange.

type contactPlayerDTO struct {
	ID       string  `json:"id"`
	FullName string  `json:"fullName"`
	RtrID    string  `json:"rtrId"`
	Nickname *string `json:"nickname"`
	Claimed  bool    `json:"claimed"`
	Phone    *string `json:"phone,omitempty"`
	Email    *string `json:"email,omitempty"`
}

type contactRequestDTO struct {
	RequestID    string                `json:"requestId"`
	PlayerID     string                `json:"playerId"`
	Field        string                `json:"field"`
	FromValue    string                `json:"fromValue"`
	ToValue      string                `json:"toValue"`
	Status       string                `json:"status"`
	Source       string                `json:"source"`
	RequestedAt  string                `json:"requestedAt"`
	ApprovedAt   *string               `json:"approvedAt"`
	AppliedAt    *string               `json:"appliedAt"`
	DecidedAt    *string               `json:"decidedAt"`
	SupersededAt *string               `json:"supersededAt"`
	FailureCode  *string               `json:"failureCode"`
	Player       contactPlayerDTO      `json:"player"`
	Checks       []contactchange.Check `json:"checks"`
}

func checkedOf(id, playerID pgtype.UUID, field sqlcgen.ContactChangeField, from pgtype.Text, to string, status sqlcgen.ContactChangeStatus, at pgtype.Timestamptz) contactchange.Request {
	return contactchange.Request{ID: id.String(), PlayerID: playerID.String(), Field: string(field), From: from.String, To: to, Status: string(status), RequestedAt: at.Time.UnixMilli()}
}

func holderOf(id, fullName, rtrID string, phone, email *string) contactchange.Holder {
	h := contactchange.Holder{ID: id, FullName: fullName, RtrID: rtrID}
	if phone != nil {
		h.Phone = *phone
	}
	if email != nil {
		h.Email = *email
	}
	return h
}

// contactRequests is readAdminContactChangeRequests: every request (or the one), newest first, each with its player
// and current contacts. Checks exist only while a request waits for review.
func contactRequests(r *http.Request, q *sqlcgen.Queries, one pgtype.UUID) ([]contactRequestDTO, error) {
	ctx := r.Context()
	rows, err := q.ListAdminContactRequests(ctx, one)
	if err != nil {
		return nil, err
	}
	playerIDs := make([]pgtype.UUID, 0, len(rows))
	seen := map[pgtype.UUID]bool{}
	var phones, emails []string
	for _, row := range rows {
		if !seen[row.PlayerID] {
			seen[row.PlayerID] = true
			playerIDs = append(playerIDs, row.PlayerID)
		}
		if row.Status != sqlcgen.ContactChangeStatusPending {
			continue
		}
		if row.Field == sqlcgen.ContactChangeFieldPhone {
			phones = append(phones, row.ProposedValue)
		} else {
			emails = append(emails, row.ProposedValue)
		}
	}
	nicknames := map[pgtype.UUID]pgtype.Text{}
	firsts, err := q.ListFirstClubNicknames(ctx, playerIDs)
	if err != nil {
		return nil, err
	}
	for _, f := range firsts {
		nicknames[f.PlayerID] = f.Nickname
	}
	var siblings []contactchange.Request
	var others []contactchange.Holder
	if phones != nil || emails != nil {
		pendingPlayers := make([]pgtype.UUID, 0)
		pendingSeen := map[pgtype.UUID]bool{}
		for _, row := range rows {
			if row.Status == sqlcgen.ContactChangeStatusPending && !pendingSeen[row.PlayerID] {
				pendingSeen[row.PlayerID] = true
				pendingPlayers = append(pendingPlayers, row.PlayerID)
			}
		}
		sib, err := q.ListContactRequestSiblings(ctx, pendingPlayers)
		if err != nil {
			return nil, err
		}
		for _, e := range sib {
			siblings = append(siblings, checkedOf(e.ID, e.PlayerID, e.Field, e.OriginalValue, e.ProposedValue, e.Status, e.RequestedAt))
		}
		held, err := q.ListContactHolders(ctx, sqlcgen.ListContactHoldersParams{Phones: stringsOrEmpty(phones), Emails: stringsOrEmpty(emails)})
		if err != nil {
			return nil, err
		}
		for _, h := range held {
			others = append(others, holderOf(h.PlayerID.String(), h.FullName, h.RtrID.String, addr(h.PhoneE164), optText(h.Email)))
		}
	}
	out := make([]contactRequestDTO, 0, len(rows))
	for _, row := range rows {
		nickname := textPtr(row.Nickname)
		if !row.Nickname.Valid {
			if n, ok := nicknames[row.PlayerID]; ok {
				nickname = textPtr(n)
			}
		}
		d := contactRequestDTO{
			RequestID: row.ID.String(), PlayerID: row.PlayerID.String(), Field: string(row.Field), FromValue: row.OriginalValue.String,
			ToValue: row.ProposedValue, Status: string(row.Status), Source: string(row.Source),
			RequestedAt: httpapi.ToIso(row.RequestedAt.Time), ApprovedAt: isoPtr(row.ApprovedAt), AppliedAt: isoPtr(row.AppliedAt),
			DecidedAt: isoPtr(row.RejectedAt), SupersededAt: isoPtr(row.SupersededAt), FailureCode: textPtr(row.FailureCode),
			Player: contactPlayerDTO{
				ID: row.PlayerID.String(), FullName: row.FullName, RtrID: row.RtrID.String, Nickname: nickname, Claimed: row.Claimed,
				Phone: optText(row.PhoneE164), Email: optText(row.Email),
			},
		}
		if row.Status == sqlcgen.ContactChangeStatusPending {
			holders := []contactchange.Holder{holderOf(d.Player.ID, row.FullName, row.RtrID.String, optText(row.PhoneE164), optText(row.Email))}
			for _, h := range others {
				if h.ID != d.PlayerID {
					holders = append(holders, h)
				}
			}
			d.Checks = contactchange.ChecksFor(checkedOf(row.ID, row.PlayerID, row.Field, row.OriginalValue, row.ProposedValue, row.Status, row.RequestedAt), holders, siblings)
		}
		out = append(out, d)
	}
	return out, nil
}

func (s *server) adminContactRequests(r *http.Request, q *sqlcgen.Queries) (any, error) {
	requests, err := contactRequests(r, q, pgtype.UUID{})
	if err != nil {
		return nil, err
	}
	return struct {
		Requests []contactRequestDTO `json:"requests"`
	}{requests}, nil
}

func (s *server) adminContactRequest(r *http.Request, q *sqlcgen.Queries) (any, error) {
	id, ok := uuidKey(r.PathValue("requestId"))
	if !ok {
		return nil, errNotFound
	}
	requests, err := contactRequests(r, q, id)
	if err != nil {
		return nil, err
	}
	if len(requests) == 0 {
		return nil, errNotFound
	}
	return struct {
		Request contactRequestDTO `json:"request"`
	}{requests[0]}, nil
}
