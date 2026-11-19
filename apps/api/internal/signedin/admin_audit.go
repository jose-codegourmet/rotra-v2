package signedin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// GET /api/audit-events: a record's "Record of actions", newest first. A port of readAuditEvents and its summarizer
// in packages/db/src/admin/audit.ts. Summaries are rebuilt from the redacted metadata with the mock's copy; an event
// whose summary cannot be rebuilt from saved data is left out, never guessed. Contact-change events are stored on the
// player with metadata.requestId; they are read per request and never repeated on the player.

// uiAction maps a stored action code to the Admin UI action code. Actions with no prototype log line are left out.
var uiAction = map[string]string{
	"club.created":                         "club_created",
	"club.price_changed":                   "club_price_changed",
	"club.name_change_approved":            "club_name_change_approved",
	"club.name_change_rejected":            "club_name_change_rejected",
	"club.license_activated":               "license_activated",
	"club.license_renewed":                 "license_renewed",
	"player.contact_change_submitted":      "contact_change_submitted",
	"player.contact_change_approved":       "contact_change_approved",
	"player.contact_change_rejected":       "contact_change_declined",
	"player.contact_change_applied":        "contact_change_applied",
	"player.created":                       "player_created",
	"player.profile_updated":               "player_updated",
	"player.password_set":                  "player_updated",
	"player.verification_override_set":     "player_verification_override_set",
	"player.verification_override_cleared": "player_verification_override_cleared",
}

var contactActions = []string{
	"player.contact_change_submitted",
	"player.contact_change_approved",
	"player.contact_change_rejected",
	"player.contact_change_applied",
}

type auditEventDTO struct {
	ID         string `json:"id"`
	Action     string `json:"action"`
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
	At         string `json:"at"`
	Actor      string `json:"actor"`
	Summary    string `json:"summary"`
}

type meta map[string]any

// metadataOf is metadataOf: the object a stored value is, else an empty one (a list, a scalar and null are none).
func metadataOf(v any) meta {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return meta{}
}

// str is str: the string a value is, else nil.
func str(v any) *string {
	if s, ok := v.(string); ok {
		return &s
	}
	return nil
}

// truthy is the value of a string in an `a || b` or `if (a)`: present and not empty.
func truthy(s *string) bool { return s != nil && *s != "" }

func parseMeta(raw []byte) meta {
	if len(raw) == 0 {
		return meta{}
	}
	var v any
	if json.Unmarshal(raw, &v) != nil {
		return meta{}
	}
	return metadataOf(v)
}

// priceLineOf is priceLineOf: the price line of a stored price, or nil when it is not one.
func priceLineOf(v any) *string {
	price := metadataOf(v)
	pricing, _ := price["pricing"].(string)
	if pricing != "paid" && pricing != "free" {
		return nil
	}
	number := func(k string) int64 {
		// A free price line names no amounts; a paid one always stores both.
		if f, ok := price[k].(float64); ok {
			return int64(f)
		}
		return 0
	}
	line := priceLine(pricing == "free", number("monthlyMinor"), number("yearlyMinor"))
	return &line
}

type auditEvent struct {
	row  sqlcgen.ListAdminAuditEventsRow
	meta meta
}

func (e auditEvent) at() time.Time { return e.row.OccurredAt.Time }

func (s *server) adminAuditEvents(r *http.Request, q *sqlcgen.Queries) (any, error) {
	targetType, _ := publicreads.QueryValue(r.URL.RawQuery, "targetType")
	switch targetType {
	case "club", "player", "contact_change_request":
	default:
		return nil, &serviceError{code: httpapi.ErrInvalid}
	}
	targetID, _ := publicreads.QueryValue(r.URL.RawQuery, "targetId")
	events := []auditEventDTO{}
	if _, ok := uuidKey(targetID); !ok {
		return struct {
			Events []auditEventDTO `json:"events"`
		}{events}, nil
	}
	ctx := r.Context()
	kind := map[string]string{"club": "club", "player": "player", "contact_change_request": "request"}[targetType]
	rows, err := q.ListAdminAuditEvents(ctx, sqlcgen.ListAdminAuditEventsParams{Kind: kind, ContactActions: contactActions, TargetID: targetID})
	if err != nil {
		return nil, err
	}
	list := make([]auditEvent, len(rows))
	for i, row := range rows {
		list[i] = auditEvent{row: row, meta: parseMeta(row.Metadata)}
	}
	summarize, err := newSummarizer(ctx, q, list)
	if err != nil {
		return nil, err
	}
	emitted := map[string]bool{}
	for _, ev := range list {
		action, mapped := uiAction[ev.row.Action]
		operationID := str(ev.meta["operationId"])
		if truthy(operationID) && emitted[*operationID] {
			continue
		}
		var summary *string
		if mapped {
			summary = summarize(ev)
		}
		if truthy(operationID) {
			emitted[*operationID] = true
			if merged := mergedEdit(list, *operationID); merged != nil {
				summary = merged
			}
		}
		if !mapped || !truthy(summary) {
			continue
		}
		id := ev.row.TargetID
		if targetType == "contact_change_request" {
			id = targetID
		}
		events = append(events, auditEventDTO{
			ID: ev.row.ID.String(), Action: action, TargetType: targetType, TargetID: id,
			At: httpapi.ToIso(ev.at()), Actor: ev.row.ActorName, Summary: *summary,
		})
	}
	return struct {
		Events []auditEventDTO `json:"events"`
	}{events}, nil
}

// mergedEdit folds the events of one edit operation into one line: the changed fields of all of them, the name and the
// reason. It is nil unless the operation has a name, a reason and at least one field.
func mergedEdit(list []auditEvent, operationID string) *string {
	var parts []auditEvent
	for _, e := range list {
		if o := str(e.meta["operationId"]); o != nil && *o == operationID {
			parts = append(parts, e)
		}
	}
	var fields []string
	seen := map[string]bool{}
	for _, p := range parts {
		changed, _ := p.meta["changed"].([]any)
		for _, c := range changed {
			if f, ok := c.(string); ok && !seen[f] {
				seen[f] = true
				fields = append(fields, f)
			}
		}
	}
	var name *string
	for _, p := range parts {
		after := metadataOf(p.meta["after"])
		if truthy(str(after["name"])) || truthy(str(p.meta["name"])) {
			name = str(after["name"])
			if name == nil {
				name = str(p.meta["name"])
			}
			break
		}
	}
	var reason *string
	for _, p := range parts {
		if rs := str(p.meta["reason"]); truthy(rs) {
			reason = rs
			break
		}
	}
	if truthy(name) && truthy(reason) && len(fields) > 0 {
		out := "Edited " + *name + ": " + strings.Join(fields, ", ") + ". Reason: " + *reason
		return &out
	}
	return nil
}

type summarizer func(auditEvent) *string

func uuidSetOf(ids []string) []pgtype.UUID {
	out := make([]pgtype.UUID, 0, len(ids))
	for _, id := range ids {
		if u, ok := uuidKey(id); ok {
			out = append(out, u)
		}
	}
	return out
}

func unique(ids []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

// newSummarizer loads the current rows the summaries name (club, terms, name requests, players) in one pass.
func newSummarizer(ctx context.Context, q *sqlcgen.Queries, events []auditEvent) (summarizer, error) {
	var clubIDs, playerIDs, termIDs []string
	hasRejected, hasCreated := false, false
	for _, e := range events {
		switch {
		case strings.HasPrefix(e.row.Action, "club."):
			clubIDs = append(clubIDs, e.row.TargetID)
		case strings.HasPrefix(e.row.Action, "player."):
			playerIDs = append(playerIDs, e.row.TargetID)
		}
		if strings.HasPrefix(e.row.Action, "club.license_") {
			if t := str(e.meta["termId"]); t != nil {
				if _, ok := uuidKey(*t); ok {
					termIDs = append(termIDs, *t)
				}
			}
		}
		hasRejected = hasRejected || e.row.Action == "club.name_change_rejected"
		hasCreated = hasCreated || e.row.Action == "club.created"
	}
	clubIDs, playerIDs = unique(clubIDs), unique(playerIDs)
	clubUUIDs := uuidSetOf(clubIDs)
	clubs, err := q.ListAuditClubs(ctx, clubUUIDs)
	if err != nil {
		return nil, err
	}
	clubByID := map[string]sqlcgen.ListAuditClubsRow{}
	for _, c := range clubs {
		clubByID[c.ID.String()] = c
	}
	terms, err := q.ListAuditTerms(ctx, uuidSetOf(termIDs))
	if err != nil {
		return nil, err
	}
	termByID := map[string]sqlcgen.ListAuditTermsRow{}
	for _, t := range terms {
		termByID[t.ID.String()] = t
	}
	var rejected []sqlcgen.ListAuditRejectedNameRequestsRow
	if hasRejected {
		if rejected, err = q.ListAuditRejectedNameRequests(ctx, clubUUIDs); err != nil {
			return nil, err
		}
	}
	// The price a club was created with is the `before` of its first price change, else today's.
	createdPrice := map[string]any{}
	if hasCreated {
		changes, err := q.ListAuditPriceChanges(ctx, clubIDs)
		if err != nil {
			return nil, err
		}
		for _, c := range changes {
			if _, has := createdPrice[c.TargetID]; !has {
				createdPrice[c.TargetID] = parseMeta(c.Metadata)["before"]
			}
		}
	}
	players, err := q.ListAuditPlayerNames(ctx, uuidSetOf(playerIDs))
	if err != nil {
		return nil, err
	}
	nameOf := map[string]string{}
	for _, p := range players {
		nameOf[p.ID.String()] = p.FullName
	}
	return func(e auditEvent) *string {
		return summaryOf(e, clubByID, termByID, rejected, createdPrice, nameOf)
	}, nil
}

// contactFieldWord is CONTACT_FIELD_WORD.
var contactFieldWord = map[string]string{"phone": "phone number", "email": "email"}

func summaryOf(e auditEvent, clubByID map[string]sqlcgen.ListAuditClubsRow, termByID map[string]sqlcgen.ListAuditTermsRow,
	rejected []sqlcgen.ListAuditRejectedNameRequestsRow, createdPrice map[string]any, nameOf map[string]string) *string {
	m := e.meta
	say := func(s string) *string { return &s }
	switch e.row.Action {
	case "club.created":
		club, ok := clubByID[e.row.TargetID]
		if !ok || !club.Username.Valid || club.Username.String == "" {
			return nil
		}
		var price *string
		if before, has := createdPrice[e.row.TargetID]; has {
			price = priceLineOf(before)
		} else {
			price = say(priceLine(club.LicensePricing == sqlcgen.LicensePricingFree, int64(club.LicenseMonthlyMinor.Int32), int64(club.LicenseYearlyMinor.Int32)))
		}
		if !truthy(price) {
			return nil
		}
		return say("Set up the club account " + club.Username.String + ". Price: " + *price + ".")
	case "club.price_changed":
		before, after := priceLineOf(m["before"]), priceLineOf(m["after"])
		if !truthy(before) || !truthy(after) {
			return nil
		}
		return say("Changed price from " + *before + " to " + *after + ".")
	case "club.name_change_approved":
		before, after := str(m["before"]), str(m["after"])
		if !truthy(before) || !truthy(after) {
			return nil
		}
		return say("Approved name change: " + *before + " → " + *after + ".")
	case "club.name_change_rejected":
		kept := str(m["before"])
		// The event names no request: take the club's rejected request reviewed closest to it.
		var near []sqlcgen.ListAuditRejectedNameRequestsRow
		for _, r := range rejected {
			if r.ClubID.String() == e.row.TargetID && r.ReviewedAt.Valid {
				near = append(near, r)
			}
		}
		distance := func(t time.Time) time.Duration {
			d := t.Sub(e.at())
			if d < 0 {
				d = -d
			}
			return d
		}
		sort.SliceStable(near, func(i, j int) bool { return distance(near[i].ReviewedAt.Time) < distance(near[j].ReviewedAt.Time) })
		if !truthy(kept) || len(near) == 0 {
			return nil
		}
		return say("Rejected name change to " + near[0].RequestedName + ". Kept " + *kept + ".")
	case "club.license_activated", "club.license_renewed":
		id := ""
		if t := str(m["termId"]); t != nil {
			id = *t
		}
		term, ok := termByID[id]
		if !ok {
			return nil
		}
		verb := "Activated"
		if e.row.Action == "club.license_renewed" {
			verb = "Renewed"
		}
		// The mock's retention note is not stored, so it is never shown here.
		return say(licenseAuditSummary(verb, planLabel(string(term.Plan)), term.StartsAt.Time, term.EndsAt.Time, int64(term.AmountMinor), term.PaymentReference))
	case "player.contact_change_approved", "player.contact_change_rejected", "player.contact_change_applied":
		field, _ := m["field"].(string)
		word, ok := contactFieldWord[field]
		name := nameOf[e.row.TargetID]
		if !ok || name == "" {
			return nil
		}
		verb := map[string]string{
			"player.contact_change_approved": "Approved", "player.contact_change_rejected": "Declined", "player.contact_change_applied": "Applied",
		}[e.row.Action]
		return say(verb + " " + word + " change for " + name + ".")
	case "player.contact_change_submitted":
		// Same copy as the mock's line (#564); the reason is stored, the contact never is.
		name, reason := nameOf[e.row.TargetID], str(m["reason"])
		if field, _ := m["field"].(string); field != "email" || name == "" || !truthy(reason) {
			return nil
		}
		return say("Email change for " + name + " entered by ROTRA Admin. Reason: " + *reason)
	case "player.verification_override_set", "player.verification_override_cleared":
		name, reason := nameOf[e.row.TargetID], str(m["reason"])
		if name == "" || !truthy(reason) {
			return nil
		}
		if e.row.Action == "player.verification_override_set" {
			return say("Set " + name + " to Verified by Admin. Reason: " + *reason)
		}
		return say("Cleared Verified by Admin for " + name + ". Reason: " + *reason)
	case "player.created":
		name := str(m["name"])
		if !truthy(name) {
			return nil
		}
		return say("Created " + *name + " by ROTRA Admin.")
	case "player.password_set":
		reason := str(m["reason"])
		if !truthy(reason) {
			return nil
		}
		return say("Password set by ROTRA Admin. Reason: " + *reason)
	case "player.profile_updated":
		var fields []string
		if changed, ok := m["changed"].([]any); ok {
			for _, c := range changed {
				if f, ok := c.(string); ok {
					fields = append(fields, f)
				}
			}
		}
		name, editReason := str(metadataOf(m["after"])["name"]), str(m["reason"])
		if len(fields) > 0 && truthy(name) && truthy(editReason) {
			return say("Edited " + *name + ": " + strings.Join(fields, ", ") + ". Reason: " + *editReason)
		}
		// The mock's line, from the stored name/nickname pair (a photo link is never saved here).
		before, after := identityOf(m["before"]), identityOf(m["after"])
		if before == nil || after == nil || !truthy(editReason) {
			return nil
		}
		return say("Changed by ROTRA Admin: " + *before + " → " + *after + ". Reason: " + *editReason)
	}
	return nil
}

// identityOf is `identity(value)`: JSON.stringify({ name, nickname }) of a stored side, or nil with no name.
func identityOf(v any) *string {
	side := metadataOf(v)
	name := str(side["name"])
	if !truthy(name) {
		return nil
	}
	var nickname any
	if n := str(side["nickname"]); n != nil {
		nickname = *n
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	// A struct keeps the keys in the order JSON.stringify writes them.
	_ = enc.Encode(struct {
		Name     string `json:"name"`
		Nickname any    `json:"nickname"`
	}{*name, nickname})
	// JSON.stringify writes U+2028 and U+2029 as they are; Go escapes them.
	out := strings.NewReplacer(` `, " ", ` `, " ").Replace(strings.TrimSuffix(buf.String(), "\n"))
	return &out
}
