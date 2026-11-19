package signedin

import (
	"net/http"
	"regexp"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The contact-change request views: GET /api/contact-change-requests and .../{requestId}. Ports of
// readAdminContactChangeRequests (packages/db/src/player/contact-change.ts) and checksFor
// (packages/data/src/contact-change-request/contactChangeRequest.rules.ts).

// contactCheck is one pre-approval check, in the order ContactChecksList shows them. Only the fields of its kind are set.
type contactCheck struct {
	Kind           string       `json:"kind"`
	OK             bool         `json:"ok"`
	OtherPlayer    *checkPlayer `json:"otherPlayer,omitempty"`
	NewerRequestID *string      `json:"newerRequestId,omitempty"`
	SentAt         *int64       `json:"sentAt,omitempty"`
	CurrentValue   *string      `json:"currentValue,omitempty"`
}

type checkPlayer struct {
	ID       string `json:"id"`
	FullName string `json:"fullName"`
	RtrID    string `json:"rtrId"`
}

// holder is a player identity with the contacts it signs in with now.
type holder struct {
	id, fullName, rtrID string
	phone, email        *string
}

func (h holder) contact(field sqlcgen.ContactChangeField) string {
	var v *string
	if field == sqlcgen.ContactChangeFieldPhone {
		v = h.phone
	} else {
		v = h.email
	}
	if v == nil {
		return ""
	}
	return *v
}

// checked is a request as the checks read it (CheckedRequest).
type checked struct {
	id, playerID string
	field        sqlcgen.ContactChangeField
	from, to     string
	status       sqlcgen.ContactChangeStatus
	requestedAt  int64
}

func inFlight(s sqlcgen.ContactChangeStatus) bool {
	return s == sqlcgen.ContactChangeStatusApproved || s == sqlcgen.ContactChangeStatusApplying
}

var (
	phoneChars   = regexp.MustCompile(`^\+?[0-9 -]+$`)
	phoneNumber  = regexp.MustCompile(`^(?:0|\+?63)9[0-9]{9}$`)
	phoneDisplay = regexp.MustCompile(`^(?:0[0-9]{0,10}|\+?63[0-9]{0,10})$`)
	spaceDash    = strings.NewReplacer(" ", "", "-", "")
)

// normalizeContact: phones compare as E.164 whatever their display form; emails ignore case. ” is not set.
func normalizeContact(field sqlcgen.ContactChangeField, value string) string {
	trimmed := publicreads.JSTrim(value)
	if trimmed == "" {
		return ""
	}
	if field == sqlcgen.ContactChangeFieldEmail {
		return publicreads.JSToLower(trimmed)
	}
	if phoneChars.MatchString(trimmed) {
		compact := spaceDash.Replace(trimmed)
		if phoneNumber.MatchString(compact) {
			if strings.HasPrefix(compact, "0") {
				return "+63" + compact[1:]
			}
			return "+" + strings.TrimPrefix(compact, "+")
		}
	}
	return spaceDash.Replace(trimmed)
}

// formatPhoneForDisplay groups complete or partially typed PH mobiles for display only; other input is unchanged.
func formatPhoneForDisplay(value string) string {
	compact := spaceDash.Replace(value)
	if !phoneDisplay.MatchString(compact) {
		return value
	}
	var groups []string
	if strings.HasPrefix(compact, "0") {
		groups = []string{cut(compact, 0, 4), cut(compact, 4, 7), cut(compact, 7, len(compact))}
	} else {
		digits := cut(strings.TrimPrefix(compact, "+"), 2, len(compact))
		groups = []string{"+63", cut(digits, 0, 3), cut(digits, 3, 6), cut(digits, 6, len(digits))}
	}
	out := groups[:0]
	for _, g := range groups {
		if g != "" {
			out = append(out, g)
		}
	}
	return strings.Join(out, " ")
}

// cut is s.slice(from, to) for ASCII text: out-of-range ends are clamped.
func cut(s string, from, to int) string {
	if from > len(s) {
		from = len(s)
	}
	if to > len(s) {
		to = len(s)
	}
	if from >= to {
		return ""
	}
	return s[from:to]
}

// checksFor are the four pre-approval checks: the requested contact is not another player's, no newer open request
// for the same field, the current contact still matches the request, and no other change for this player is being
// applied.
func checksFor(req checked, holders []holder, requests []checked) []contactCheck {
	field := req.field
	wanted := normalizeContact(field, req.to)
	var other *holder
	for i := range holders {
		if holders[i].id != req.playerID && normalizeContact(field, holders[i].contact(field)) == wanted {
			other = &holders[i]
			break
		}
	}
	var newer *checked
	var open []checked
	for _, e := range requests {
		if e.id != req.id && e.playerID == req.playerID && e.field == field && e.requestedAt > req.requestedAt &&
			(e.status == sqlcgen.ContactChangeStatusPending || inFlight(e.status)) {
			open = append(open, e)
		}
	}
	// Newest first; a stable sort keeps the stored order of requests sent at the same time.
	sort.SliceStable(open, func(i, j int) bool { return open[i].requestedAt > open[j].requestedAt })
	if len(open) > 0 {
		newer = &open[0]
	}
	current := ""
	for _, h := range holders {
		if h.id == req.playerID {
			current = h.contact(field)
			break
		}
	}
	unchanged := normalizeContact(field, current) == normalizeContact(field, req.from)
	busy := false
	for _, e := range requests {
		if e.id != req.id && e.playerID == req.playerID && inFlight(e.status) {
			busy = true
		}
	}
	checks := make([]contactCheck, 0, 4)
	if other != nil {
		checks = append(checks, contactCheck{Kind: "linked-elsewhere", OtherPlayer: &checkPlayer{ID: other.id, FullName: other.fullName, RtrID: other.rtrID}})
	} else {
		checks = append(checks, contactCheck{Kind: "linked-elsewhere", OK: true})
	}
	if newer != nil {
		checks = append(checks, contactCheck{Kind: "newer-request", NewerRequestID: addr(newer.id), SentAt: addr(newer.requestedAt)})
	} else {
		checks = append(checks, contactCheck{Kind: "newer-request", OK: true})
	}
	if unchanged {
		checks = append(checks, contactCheck{Kind: "original-changed", OK: true})
	} else {
		value := current
		if field == sqlcgen.ContactChangeFieldPhone && current != "" {
			value = formatPhoneForDisplay(current)
		}
		checks = append(checks, contactCheck{Kind: "original-changed", CurrentValue: addr(value)})
	}
	return append(checks, contactCheck{Kind: "in-progress", OK: !busy})
}

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
	RequestID    string           `json:"requestId"`
	PlayerID     string           `json:"playerId"`
	Field        string           `json:"field"`
	FromValue    string           `json:"fromValue"`
	ToValue      string           `json:"toValue"`
	Status       string           `json:"status"`
	Source       string           `json:"source"`
	RequestedAt  string           `json:"requestedAt"`
	ApprovedAt   *string          `json:"approvedAt"`
	AppliedAt    *string          `json:"appliedAt"`
	DecidedAt    *string          `json:"decidedAt"`
	SupersededAt *string          `json:"supersededAt"`
	FailureCode  *string          `json:"failureCode"`
	Player       contactPlayerDTO `json:"player"`
	Checks       []contactCheck   `json:"checks"`
}

func checkedOf(id, playerID pgtype.UUID, field sqlcgen.ContactChangeField, from pgtype.Text, to string, status sqlcgen.ContactChangeStatus, at pgtype.Timestamptz) checked {
	return checked{id: id.String(), playerID: playerID.String(), field: field, from: from.String, to: to, status: status, requestedAt: at.Time.UnixMilli()}
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
	var siblings []checked
	var others []holder
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
			others = append(others, holder{id: h.PlayerID.String(), fullName: h.FullName, rtrID: h.RtrID.String, phone: addr(h.PhoneE164), email: optText(h.Email)})
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
			holders := []holder{{id: d.Player.ID, fullName: row.FullName, rtrID: row.RtrID.String, phone: optText(row.PhoneE164), email: optText(row.Email)}}
			for _, h := range others {
				if h.id != d.PlayerID {
					holders = append(holders, h)
				}
			}
			d.Checks = checksFor(checkedOf(row.ID, row.PlayerID, row.Field, row.OriginalValue, row.ProposedValue, row.Status, row.RequestedAt), holders, siblings)
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
