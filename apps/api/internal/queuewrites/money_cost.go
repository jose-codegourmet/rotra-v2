package queuewrites

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessioncost"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the cost estimate of a Queue Session (saveSessionCost and estimateFor of packages/db/src/queue/financials.ts) and
// the way POST /api/sessions and PATCH /api/sessions/{id} save it beside the session. The estimate comes in the body of the session form
// and the TypeScript checks no shape: normalizeSessionCost reads it as JavaScript does, so a field of the wrong type is a TypeError (a 500)
// or is refused by a later check, and a field the body leaves out is undefined, which Prisma skips on an update (the stored value stays) and
// replaces by the column default on a create. costValues keeps that difference (jsValue.defined). The whole estimate saves in its own
// transaction after the session was committed, so a refused estimate leaves the session saved and answers the error.

// jsValue is a field of the estimate as JavaScript sees it: undefined (the body left it out), null, or a JSON value.
type jsValue struct {
	defined bool
	value   any // nil is null
}

func fieldOf(m map[string]any, key string) jsValue {
	v, ok := m[key]
	return jsValue{defined: ok, value: v}
}

// nullish is `value == null`: undefined or null.
func (v jsValue) nullish() bool { return !v.defined || v.value == nil }

// costLine is a shuttle plan line that survived the filter: it has an item and tubes above zero (as JavaScript compares them).
type costLine struct{ item, tubes any }

// costValues is what normalizeSessionCost returns for an estimate that is kept.
type costValues struct {
	court, entrance, mode, custom jsValue
	lines                         []costLine
	// tooBig is a fee beyond an Int column: Prisma refuses it where the row is written (a 500), after the checks that come first.
	tooBig bool
}

// normalizeCost is normalizeSessionCost on a body value. A falsy value is no estimate (nil). A value that is no object, or has no list of
// shuttles, is a TypeError (errTypeError). Lines with no item or no tubes above zero are dropped, and an estimate with no fee (null, not
// missing), no line and break-even mode is no estimate at all.
func normalizeCost(raw any) (*costValues, error) {
	if !truthy(raw) {
		return nil, nil
	}
	m, ok := raw.(map[string]any)
	if !ok {
		return nil, errTypeError
	}
	shuttles, ok := m["shuttles"].([]any)
	if !ok {
		return nil, errTypeError // `values.shuttles.filter` of a missing or wrong-typed list
	}
	var lines []costLine
	for _, el := range shuttles {
		if el == nil {
			return nil, errTypeError // `line.inventoryItemId` of null
		}
		line, isObject := el.(map[string]any)
		if !isObject {
			continue // a number, text, boolean or list has no such property: undefined, so the line is dropped
		}
		if truthy(line["inventoryItemId"]) && jsToNumber(line["tubes"]) > 0 {
			lines = append(lines, costLine{item: line["inventoryItemId"], tubes: line["tubes"]})
		}
	}
	court, entrance, mode := fieldOf(m, "courtFeePerCourtHour"), fieldOf(m, "entranceFeePerHead"), fieldOf(m, "paymentMode")
	if court.defined && court.value == nil && entrance.defined && entrance.value == nil && len(lines) == 0 && mode.value == "break_even" {
		return nil, nil
	}
	out := &costValues{court: court, entrance: entrance, mode: mode, lines: lines, custom: jsValue{defined: true}}
	if mode.value == "custom" {
		out.custom = fieldOf(m, "customFeePerHead")
	}
	return out, nil
}

// jsToNumber is the number JavaScript's relational operators make of a JSON value (ToNumber after ToPrimitive).
func jsToNumber(v any) float64 {
	switch x := v.(type) {
	case nil:
		return 0
	case bool:
		if x {
			return 1
		}
		return 0
	case json.Number:
		return number(x)
	case string:
		return stringToNumber(x)
	case []any:
		parts := make([]string, len(x))
		for i, el := range x {
			parts[i] = jsToString(el)
		}
		return stringToNumber(strings.Join(parts, ","))
	}
	return math.NaN() // an object is "[object Object]"
}

// jsToString is String(value) for a JSON value inside a list.
func jsToString(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case bool:
		return strconv.FormatBool(x)
	case json.Number:
		f := number(x)
		if math.IsInf(f, 0) {
			if f < 0 {
				return "-Infinity"
			}
			return "Infinity"
		}
		return strconv.FormatFloat(f, 'f', -1, 64)
	case string:
		return x
	case []any:
		parts := make([]string, len(x))
		for i, el := range x {
			parts[i] = jsToString(el)
		}
		return strings.Join(parts, ",")
	}
	return "[object Object]"
}

// stringToNumber is Number(text): white space is trimmed, an empty text is 0, and a text that is no number is NaN.
func stringToNumber(s string) float64 {
	t := fields.JSTrim(s)
	switch t {
	case "":
		return 0
	case "Infinity", "+Infinity":
		return math.Inf(1)
	case "-Infinity":
		return math.Inf(-1)
	}
	if len(t) > 2 && t[0] == '0' {
		base := map[byte]int{'x': 16, 'X': 16, 'o': 8, 'O': 8, 'b': 2, 'B': 2}[t[1]]
		if base != 0 {
			n, err := strconv.ParseUint(t[2:], base, 64)
			if err != nil || strings.ContainsRune(t[2:], '_') {
				return math.NaN()
			}
			return float64(n)
		}
	}
	for _, c := range t {
		if c != '.' && c != '+' && c != '-' && c != 'e' && c != 'E' && (c < '0' || c > '9') {
			return math.NaN() // letters (inf, nan), underscores and hexadecimal floats are not JavaScript numbers
		}
	}
	f, err := strconv.ParseFloat(t, 64)
	if err != nil && !errors.Is(err, strconv.ErrRange) {
		return math.NaN()
	}
	return f
}

// centavos is centavos() of financials.ts for a field: undefined and null are no amount (nullAllowed) or `invalid` with the nullMessage;
// a value that is no safe integer of zero or more is `invalid` with "Enter an amount of zero or more.". It answers the number.
func centavos(v jsValue, field string, nullAllowed bool) (value float64, set bool, err error) {
	if v.nullish() {
		if nullAllowed {
			return 0, false, nil
		}
		return 0, false, writes.Fail(httpapi.ErrInvalid, map[string]string{field: "Enter an amount."})
	}
	n, isNumber := v.value.(json.Number)
	f := number(n)
	if !isNumber || !safeInteger(f) || f < 0 {
		return 0, false, writes.Fail(httpapi.ErrInvalid, map[string]string{field: "Enter an amount of zero or more."})
	}
	return f, true, nil
}

// costInt is a stored fee: a null when it is not set, else the amount. A value beyond an Int column is refused by Prisma (a 500).
func costInt(f float64, set bool) (pgtype.Int4, error) {
	if !set {
		return pgtype.Int4{}, nil
	}
	if beyondInt32(f) {
		return pgtype.Int4{}, errTypeError
	}
	return pgtype.Int4{Int32: int32(f), Valid: true}, nil
}

// saveSessionCost is saveSessionCost: saves the estimate of a session in a transaction of its own, against the revision in effect
// (nil when none is saved). Online only, and not after Session done. An empty estimate deletes the row ("no fee"). A conflict is the
// revision not being the stored one.
func (s *server) saveSessionCost(ctx context.Context, club pgtype.UUID, sessionID string, raw any, expected *string) error {
	if err := s.entitled(ctx, club); err != nil {
		return err
	}
	values, err := normalizeCost(raw)
	if err != nil {
		return err
	}
	var courtFee, entranceFee, customFee pgtype.Int4
	if values != nil {
		court, courtSet, err := centavos(values.court, "courtFee", true)
		if err != nil {
			return err
		}
		entrance, entranceSet, err := centavos(values.entrance, "entranceFee", true)
		if err != nil {
			return err
		}
		var custom float64
		var customSet bool
		if values.mode.value == "custom" {
			if custom, customSet, err = centavos(values.custom, "customFee", false); err != nil {
				return err
			}
		}
		for _, line := range values.lines {
			if n, ok := line.tubes.(json.Number); !ok || !isInteger(number(n)) || number(n) <= 0 {
				return writes.Fail(httpapi.ErrInvalid, map[string]string{"shuttles": "Enter a whole number of tubes."})
			}
		}
		// The columns are only written to later, and a fee beyond an Int column is refused there (see tooBig).
		for _, fee := range []struct {
			dst *pgtype.Int4
			f   float64
			set bool
		}{{&courtFee, court, courtSet}, {&entranceFee, entrance, entranceSet}, {&customFee, custom, customSet}} {
			if v, err := costInt(fee.f, fee.set); err == nil {
				*fee.dst = v
			} else {
				values.tooBig = true
			}
		}
	}
	_, err = s.lockedSession(ctx, club, sessionID, false, func(t *txn) (any, error) {
		if err := requireState(t.sess, "The estimate can’t change after the session closes.", sqlcgen.QueueSessionStatePrepared, sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		existing, err := t.q.GetQueueCostEstimate(t.ctx, t.sess.ID)
		found := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		// The expected revision is the stored one: none when no estimate is saved, else its decimal text.
		if found && (expected == nil || *expected != httpapi.ToDecimalString(existing.Revision)) || !found && expected != nil {
			return nil, writes.Fail(httpapi.ErrConflict, nil)
		}
		if values == nil {
			if found {
				return nil, t.q.DeleteSessionCostEstimate(t.ctx, t.sess.ID)
			}
			return nil, nil
		}
		return nil, t.writeCost(values, found, courtFee, entranceFee, customFee)
	})
	return err
}

// writeCost saves a kept estimate: the items of its plan must be this club's, then the estimate row and its lines are written and the
// session revision is bumped.
func (t *txn) writeCost(values *costValues, found bool, courtFee, entranceFee, customFee pgtype.Int4) error {
	var ids []pgtype.UUID
	seen := map[string]bool{}
	for _, line := range values.lines {
		text, ok := line.item.(string)
		if !ok {
			return errTypeError // Prisma refuses an id that is no text
		}
		id, ok := writes.ParseUUID(text)
		if !ok {
			return errNotAUUID // ... and one that is no uuid
		}
		if !seen[text] {
			seen[text] = true
			ids = append(ids, id)
		}
	}
	owned := int32(0)
	if len(ids) > 0 {
		var err error
		if owned, err = t.q.CountClubLiveInventoryItems(t.ctx, sqlcgen.CountClubLiveInventoryItemsParams{ClubID: t.club, Ids: ids}); err != nil {
			return err
		}
	}
	if int(owned) != len(ids) {
		return writes.Fail(httpapi.ErrInvalid, map[string]string{"shuttles": "Choose items from this club’s inventory."})
	}
	if values.tooBig {
		return errTypeError // a fee beyond an Int column
	}
	mode := sqlcgen.NullPaymentMode{}
	if values.mode.defined {
		switch m := sqlcgen.PaymentMode(modeText(values.mode.value)); m {
		case sqlcgen.PaymentModeBreakEven, sqlcgen.PaymentModeCustom:
			mode = sqlcgen.NullPaymentMode{PaymentMode: m, Valid: true}
		default:
			return errTypeError // Prisma refuses a value that is no payment mode (null too)
		}
	}
	if found {
		if err := t.q.DeleteSessionShuttlePlanLines(t.ctx, t.sess.ID); err != nil {
			return err
		}
		if err := t.q.UpdateSessionCostEstimate(t.ctx, sqlcgen.UpdateSessionCostEstimateParams{
			SetCourtFee: values.court.defined, CourtFee: courtFee, SetEntranceFee: values.entrance.defined, EntranceFee: entranceFee,
			PaymentMode: mode, CustomFee: customFee, Now: t.stamp(), SessionID: t.sess.ID,
		}); err != nil {
			return err
		}
	} else if err := t.q.InsertSessionCostEstimate(t.ctx, sqlcgen.InsertSessionCostEstimateParams{
		SessionID: t.sess.ID, ClubID: t.club, CourtFee: courtFee, EntranceFee: entranceFee, PaymentMode: mode, CustomFee: customFee, Now: t.stamp(),
	}); err != nil {
		return err
	}
	for position, line := range values.lines {
		item, _ := writes.ParseUUID(line.item.(string))
		tubes := number(line.tubes.(json.Number))
		if beyondInt32(tubes) {
			return errTypeError
		}
		id, err := newestID()
		if err != nil {
			return err
		}
		if err := t.q.InsertSessionShuttlePlanLine(t.ctx, sqlcgen.InsertSessionShuttlePlanLineParams{
			ID: id, ClubID: t.club, SessionID: t.sess.ID, InventoryItemID: item, Tubes: int32(tubes), Position: int16(position),
		}); err != nil {
			return err
		}
	}
	return t.q.TouchQueueSession(t.ctx, sqlcgen.TouchQueueSessionParams{Now: t.stamp(), ID: t.sess.ID})
}

// modeText is the payment mode a value names, or "" for a value that is no text.
func modeText(v any) string {
	s, _ := v.(string)
	return s
}

// costFor is estimateFor on the locked session: the derived estimate (nil with none saved) from the courts, the minutes, the players and
// the club's items at their current prices. A session with no players counts its expected players, and no estimate is no fee.
func (t *txn) costFor() (*sessioncost.Result, error) {
	est, err := t.q.GetQueueCostEstimate(t.ctx, t.sess.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	lines, err := t.q.ListQueueShuttlePlanLines(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	prices, err := t.q.ListQueueClubInventoryPrices(t.ctx, t.club)
	if err != nil {
		return nil, err
	}
	courts, err := t.q.CountQueueLiveCourts(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	roster, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	// Before anyone joins: the expected count, else the slots (the form's "follows your slots"), never 1 player.
	players := int64(roster)
	if players == 0 && t.sess.ExpectedPlayers.Valid {
		players = int64(t.sess.ExpectedPlayers.Int32)
	}
	if players == 0 {
		players = t.slotCapacity(int64(courts), t.sess.PlayersPerCourt)
	}
	// D-2026-11-27-01: free roster players leave the break-even head count.
	free, err := t.q.CountQueueFreeRoster(t.ctx, t.sess.ID)
	if err != nil {
		return nil, err
	}
	in := sessioncost.Input{PaymentMode: string(est.PaymentMode)}
	in.CourtFeePerCourtHour, in.EntranceFeePerHead, in.CustomFeePerHead = optInt(est.CourtFeePerCourtHourMinor), optInt(est.EntranceFeePerHeadMinor), optInt(est.CustomFeePerHeadMinor)
	for _, l := range lines {
		in.Shuttles = append(in.Shuttles, sessioncost.ShuttleLine{InventoryItemID: l.InventoryItemID.String(), Tubes: int64(l.Tubes)})
	}
	items := make([]sessioncost.Item, len(prices))
	for i, p := range prices {
		items[i] = sessioncost.Item{ID: p.ID.String(), UnitCostMinor: int64(p.UnitCostMinor)}
	}
	minutes := max(0, int64(math.Floor(float64(t.sess.ScheduledEndAt.Time.UnixMilli()-t.sess.ScheduledStartAt.Time.UnixMilli())/60000+0.5)))
	r := sessioncost.Estimate(in, sessioncost.Context{Courts: int64(courts), DurationMinutes: minutes, Players: players, FreePlayers: int64(free), Items: items})
	return &r, nil
}

func optInt(v pgtype.Int4) *int64 {
	if !v.Valid {
		return nil
	}
	n := int64(v.Int32)
	return &n
}

// estimateRevision is readSessionCost(...).revision: the revision of the session's saved estimate (nil when none is saved), read with
// the access check of a read (a session of this club; an active one under its licence term needs no entitlement).
func (s *server) estimateRevision(ctx context.Context, club pgtype.UUID, sessionID string) (*string, error) {
	id, err := parseSessionID(sessionID)
	if err != nil {
		return nil, err
	}
	q := sqlcgen.New(s.pool)
	sess, err := q.GetQueueSession(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) || err == nil && sess.ClubID != club {
		return nil, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return nil, err
	}
	if sess.State != sqlcgen.QueueSessionStateActive || !sess.StartLicenseTermID.Valid {
		if err := requireClubEntitlement(ctx, q, club, s.at()); err != nil {
			return nil, err
		}
	}
	est, err := q.GetQueueCostEstimate(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	rev := httpapi.ToDecimalString(est.Revision)
	return &rev, nil
}

// saveCreatedCosts is the end of POST /api/sessions: the estimate is saved on every date the command created (the series of the first
// session, or that session alone), each in its own transaction. A conflict is the repeat of a retry (the estimate is already saved), so
// it is skipped; any other refusal answers the error with the sessions already saved.
func (s *server) saveCreatedCosts(r *http.Request, club pgtype.UUID, firstSessionID string, raw any) error {
	ctx := r.Context()
	q := sqlcgen.New(s.pool)
	first, ok := writes.ParseUUID(firstSessionID)
	if !ok {
		return nil
	}
	ids := []pgtype.UUID{first}
	if sess, err := q.GetQueueSession(ctx, first); err == nil && sess.SeriesID.Valid {
		if ids, err = q.ListQueueSeriesSessionIDs(ctx, sqlcgen.ListQueueSeriesSessionIDsParams{ClubID: club, SeriesID: sess.SeriesID}); err != nil {
			return err
		}
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	for _, id := range ids {
		err := s.saveSessionCost(ctx, club, id.String(), raw, nil)
		var se *writes.Error
		if err != nil && (!errors.As(err, &se) || se.Code != httpapi.ErrConflict) {
			return err
		}
	}
	return nil
}
