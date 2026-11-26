package queuewrites

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/courts"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports session preparation: packages/db/src/queue/session-preparation.ts (create, edit, start, the two join switches)
// and session-delete.ts, with their Route Handlers apps/queue/src/app/api/sessions/route.ts, sessions/[sessionId]/route.ts and
// sessions/[sessionId]/start/route.ts.
//
// Create, edit and start check the club's entitlement before the transaction and lock the session without the live-session
// exception (lockedSession with access false), as the TypeScript does. The request body is not checked field by field there: a
// field of the wrong type crashes inside the service (a TypeError, or a Prisma validation error), which is a 500. errTypeError is
// that 500 here, raised at the point the TypeScript reaches the field.

// errTypeError is a body field of the wrong type: the TypeScript throws a TypeError or Prisma refuses the value (a 500).
var errTypeError = errors.New("queuewrites: a body field has the wrong type")

func (s *server) registerSessionPrep(rt *signedin.Router) {
	rt.Handle("POST /api/sessions", store.AudienceClub, s.club(s.createSession))
	rt.Handle("PATCH /api/sessions/{sessionId}", store.AudienceClub, s.club(s.patchSession))
	rt.Handle("DELETE /api/sessions/{sessionId}", store.AudienceClub, s.club(s.deleteSession))
	rt.Handle("POST /api/sessions/{sessionId}/start", store.AudienceClub, s.club(s.startSession))
}

// number is a JSON number as JavaScript reads it, NaN for anything else.
func number(v any) float64 {
	n, ok := v.(json.Number)
	if !ok {
		return math.NaN()
	}
	f, err := strconv.ParseFloat(string(n), 64)
	if err != nil && !errors.Is(err, strconv.ErrRange) {
		return math.NaN()
	}
	return f
}

// truthy is JavaScript truthiness of a JSON value.
func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case string:
		return x != ""
	case json.Number:
		f := number(x)
		return f != 0 && !math.IsNaN(f)
	}
	return true
}

// isInteger is Number.isInteger.
func isInteger(f float64) bool { return !math.IsNaN(f) && !math.IsInf(f, 0) && f == math.Trunc(f) }

// ms is ms() in session-preparation.ts: Date.parse of an instant; one that is no date is invalid (the schedule).
func ms(v any) (int64, error) {
	text, _ := v.(string)
	at, ok := parseInstant(text)
	if !ok {
		return 0, writes.Fail(httpapi.ErrInvalid, map[string]string{"schedule": "Enter a date and time."})
	}
	return at, nil
}

// plannedStart is plannedStart: a planned start equal to the session start is stored as null (it follows the session start).
func plannedStart(startsAt any, sessionStart int64) (*int64, error) {
	at := sessionStart
	if truthy(startsAt) {
		var err error
		if at, err = ms(startsAt); err != nil {
			return nil, err
		}
	}
	if at == sessionStart {
		return nil, nil
	}
	return &at, nil
}

func timestamp(at int64) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: timeOf(at), Valid: true}
}

func nullableTimestamp(at *int64) pgtype.Timestamptz {
	if at == nil {
		return pgtype.Timestamptz{}
	}
	return timestamp(*at)
}

// courtInput is one court of the session form.
type courtInput struct {
	id        string
	label     string
	startsAt  any
	openUntil any
}

// readCourts is `input.courts`: a list of courts with a label. A court that is no object, or has no text label, is the TypeError of
// `c.label.trim()`.
func readCourts(in writes.Body) ([]courtInput, error) {
	list, ok := in["courts"].([]any)
	if !ok {
		return nil, errTypeError
	}
	out := make([]courtInput, 0, len(list))
	for _, raw := range list {
		c, ok := raw.(map[string]any)
		if !ok {
			return nil, errTypeError
		}
		label, ok := c["label"].(string)
		if !ok {
			return nil, errTypeError
		}
		id := ""
		if truthy(c["id"]) {
			if id, ok = c["id"].(string); !ok {
				return nil, errTypeError
			}
		}
		out = append(out, courtInput{id: id, label: label, startsAt: c["startsAt"], openUntil: c["openUntil"]})
	}
	return out, nil
}

// validated is what validate answers.
type validated struct {
	venue           sqlcgen.ClubVenue
	start, end      int64
	playersPerCourt int16
	courts          []courtInput
}

// validate is validate in session-preparation.ts, in its order.
func (t *txn) validate(in writes.Body) (validated, error) {
	venueText, ok := in["venueId"].(string)
	if !ok {
		return validated{}, errTypeError
	}
	venueID, ok := writes.ParseUUID(venueText)
	if !ok {
		return validated{}, errTypeError // Prisma refuses a venue id that is no uuid
	}
	venue, err := t.q.GetClubVenue(t.ctx, sqlcgen.GetClubVenueParams{ClubID: t.club, ID: venueID})
	missingVenue := errors.Is(err, pgx.ErrNoRows)
	if err != nil && !missingVenue {
		return validated{}, err
	}
	start, err := ms(in["scheduledStartAt"])
	if err != nil {
		return validated{}, err
	}
	end, err := ms(in["scheduledEndAt"])
	if err != nil {
		return validated{}, err
	}
	invalidSession := writes.Fail(httpapi.ErrInvalid, map[string]string{"session": "Enter a title, venue, date, time and at least one court."})
	if missingVenue {
		return validated{}, invalidSession
	}
	title, ok := in["title"].(string)
	if !ok {
		return validated{}, errTypeError
	}
	if fields.JSTrim(title) == "" {
		return validated{}, invalidSession
	}
	crts, err := readCourts(in)
	if err != nil {
		return validated{}, err
	}
	if len(crts) == 0 {
		return validated{}, invalidSession
	}
	for _, c := range crts {
		if fields.JSTrim(c.label) == "" {
			return validated{}, invalidSession
		}
	}
	if end <= start {
		return validated{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"schedule": "The session must end after it starts."})
	}
	if v, has := in["expectedPlayers"]; !has || v != nil {
		if n := number(v); !isInteger(n) || n < 1 {
			return validated{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"expectedPlayers": "Enter a whole number of players."})
		}
	}
	if n := number(in["minimumGames"]); !isInteger(n) || n < 0 {
		return validated{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"minimumGames": "Enter a whole number of games."})
	}
	defaultPerCourt, err := t.q.GetClubDefaultPlayersPerCourt(t.ctx, t.club)
	if err != nil {
		return validated{}, err
	}
	perCourt := float64(defaultPerCourt)
	if v := in["playersPerCourt"]; v != nil {
		perCourt = number(v)
	}
	if !isInteger(perCourt) || perCourt < 2 || perCourt > 20 {
		return validated{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"playersPerCourt": "Players per court must be between 2 and 20."})
	}
	now := t.s.at().UnixMilli()
	for _, c := range crts {
		var until *int64
		if c.openUntil != nil {
			at, err := ms(c.openUntil)
			if err != nil {
				return validated{}, err
			}
			until = &at
			if at <= now || at > end {
				return validated{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"courts": "Enter a court label and a booking end within the session."})
			}
		}
		planned, err := plannedStart(c.startsAt, start)
		if err != nil {
			return validated{}, err
		}
		from := start
		if planned != nil {
			from = *planned
		}
		if msg, bad := courtWindowError(from, until, start, end); bad {
			return validated{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"courts": firstMessage(msg)})
		}
	}
	return validated{venue: venue, start: start, end: end, playersPerCourt: int16(perCourt), courts: crts}, nil
}

// sessionFields are the columns create and edit both write, read from the form after validate.
type sessionFields struct {
	title               string
	notes               pgtype.Text
	mode                sqlcgen.SessionMode
	singles, doubles    bool
	minimumGames        int32
	minimumIsCalculated bool
	expectedPlayers     pgtype.Int4
	requestFormats      []string
	hasFormats          bool
	recordGames         *bool
}

func readSessionFields(in writes.Body) (sessionFields, error) {
	var f sessionFields
	f.title = fields.JSTrim(in.Text("title"))
	if truthy(in["notes"]) {
		notes, ok := in["notes"].(string)
		if !ok {
			return f, errTypeError
		}
		f.notes = pgtype.Text{String: notes, Valid: true}
	}
	mode, ok := in["sessionMode"].(string)
	if !ok {
		return f, errTypeError
	}
	f.mode = sqlcgen.SessionMode(mode)
	for _, pair := range []struct {
		key string
		dst *bool
	}{{"allowSingles", &f.singles}, {"allowDoubles", &f.doubles}, {"minimumIsCalculated", &f.minimumIsCalculated}} {
		v, ok := in[pair.key].(bool)
		if !ok {
			return f, errTypeError
		}
		*pair.dst = v
	}
	f.minimumGames = int32(number(in["minimumGames"]))
	if in["expectedPlayers"] != nil {
		f.expectedPlayers = pgtype.Int4{Int32: int32(number(in["expectedPlayers"])), Valid: true}
	}
	f.requestFormats, f.hasFormats = requestFormatsInput(in["requestFormats"])
	if v, isBool := in["recordGames"].(bool); isBool {
		f.recordGames = &v
	}
	return f, nil
}

// createResult is what creating sessions answers.
type createResult struct {
	FirstSessionID string `json:"firstSessionId"`
	Created        int    `json:"created"`
	Skipped        *int   `json:"skipped"`
}

// createSession is POST /api/sessions, Q-SETUP Create session (or a repeating series). Repeat-safe on commandId: a retry returns
// the sessions it already created.
func (s *server) createSession(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	commandID := body.Text("commandId")
	if commandID == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	if err := requireClubEntitlement(r.Context(), sqlcgen.New(s.pool), club, s.at()); err != nil {
		return writes.Result{}, err
	}
	in := writes.Body(body.Object("input"))
	var out createResult
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		t := &txn{ctx: ctx, q: q, s: s, club: club}
		var err error
		out, err = t.createSessions(commandID, in)
		return err
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	if body["input"] == nil {
		return writes.Result{}, errTypeError // `input.costEstimate` of a missing input, after the sessions were created
	}
	if truthy(in["costEstimate"]) {
		// The estimate is saved on each date the command made, after the sessions were committed (money_cost.go).
		if err := s.saveCreatedCosts(r, club, out.FirstSessionID, in["costEstimate"]); err != nil {
			return writes.Result{}, err
		}
	}
	return writes.Result{Status: http.StatusCreated, Body: out}, nil
}

func (t *txn) createSessions(commandID string, in writes.Body) (createResult, error) {
	existing, err := t.q.GetQueueSessionBySourceCommand(t.ctx, derivedID(commandID, "session:0"))
	if err == nil {
		if existing.ClubID != t.club {
			return createResult{}, writes.Fail(httpapi.ErrConflict, nil)
		}
		created := 1
		if existing.SeriesID.Valid {
			n, err := t.q.CountQueueSeriesSessions(t.ctx, sqlcgen.CountQueueSeriesSessionsParams{ClubID: t.club, SeriesID: existing.SeriesID})
			if err != nil {
				return createResult{}, err
			}
			created = int(n)
		}
		return createResult{FirstSessionID: existing.ID.String(), Created: created}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return createResult{}, err
	}
	v, err := t.validate(in)
	if err != nil {
		return createResult{}, err
	}
	others, err := t.q.ListClashCandidates(t.ctx, t.club)
	if err != nil {
		return createResult{}, err
	}
	repeat, _ := in["repeat"].(string)
	occurrences := sessionOccurrences(occurrenceDraft{start: v.start, end: v.end, venueID: v.venue.ID, repeat: repeat, occurrences: number(in["occurrences"])}, others)
	free := 0
	for _, o := range occurrences {
		if o.clash == "" {
			free++
		}
	}
	if free == 0 {
		msg := occurrences[0].clash + ". Pick another date or time."
		if len(occurrences) > 1 {
			msg = "Every date clashes with another session. Change the start date, time or venue."
		}
		return createResult{}, writes.Fail(httpapi.ErrConflict, map[string]string{"schedule": msg})
	}
	// The other fields are read where main inserts the session: after the clash check.
	f, err := readSessionFields(in)
	if err != nil {
		return createResult{}, err
	}
	var seriesID pgtype.UUID
	if len(occurrences) > 1 {
		seriesID = derivedID(commandID, "series")
	}
	formats := []string{"doubles"}
	if f.singles {
		formats = []string{"doubles", "singles"}
	}
	if f.hasFormats {
		formats = f.requestFormats
	}
	recordGames := true // every date of a series gets the same choice; anything but an explicit false records
	if v, isBool := in["recordGames"].(bool); isBool && !v {
		recordGames = false
	}
	var first pgtype.UUID
	created := 0
	for index, date := range occurrences {
		if date.clash != "" {
			continue
		}
		id := derivedID(commandID, "session-id:"+strconv.Itoa(index))
		if created == 0 {
			first = id
		}
		slug := publicSlugFor(uuid.UUID(id.Bytes)) + id.String()[:4]
		err := t.q.InsertQueueSession(t.ctx, sqlcgen.InsertQueueSessionParams{
			ID: id, ClubID: t.club, Title: f.title, Notes: f.notes, ScheduledStartAt: timestamp(date.start), ScheduledEndAt: timestamp(date.end),
			VenueID: v.venue.ID, VenueName: pgtype.Text{String: v.venue.Name, Valid: true}, VenueAddress: v.venue.Address, SessionMode: f.mode,
			AllowSingles: f.singles, AllowDoubles: f.doubles, MinimumGames: f.minimumGames, MinimumIsCalculated: f.minimumIsCalculated,
			PlayersPerCourt: v.playersPerCourt, ExpectedPlayers: f.expectedPlayers, RequestFormats: formats, RecordGames: recordGames,
			SeriesID: seriesID, PublicSlug: slug, SourceCommandID: derivedID(commandID, "session:"+strconv.Itoa(index)), Now: t.stamp(),
		})
		if err != nil {
			return createResult{}, err
		}
		liveupdates.Note(t.ctx, t.club, id) // each date made is a session the club's screens now list
		for n, court := range v.courts {
			planned, err := plannedStart(court.startsAt, v.start)
			if err != nil {
				return createResult{}, err
			}
			var startsAt, openUntil *int64
			if planned != nil {
				at := date.start + (*planned - v.start)
				startsAt = &at
			}
			if truthy(court.openUntil) {
				until, err := ms(court.openUntil)
				if err != nil {
					return createResult{}, err
				}
				at := date.start + (until - v.start)
				openUntil = &at
			}
			if _, err := t.q.InsertSessionCourt(t.ctx, sqlcgen.InsertSessionCourtParams{
				ID: derivedID(commandID, "court:"+strconv.Itoa(index)+":"+strconv.Itoa(n)), ClubID: t.club, SessionID: id,
				Label: fields.JSTrim(court.label), Position: int32(n + 1), StartsAt: nullableTimestamp(startsAt), OpenUntil: nullableTimestamp(openUntil), Now: t.stamp(),
			}); err != nil {
				return createResult{}, err
			}
		}
		session, err := t.reload(id)
		if err != nil {
			return createResult{}, err
		}
		if _, err := t.recomputeMinimum(session); err != nil {
			return createResult{}, err
		}
		created++
	}
	skipped := len(occurrences) - created
	return createResult{FirstSessionID: first.String(), Created: created, Skipped: &skipped}, nil
}

// patchSession is PATCH /api/sessions/{sessionId}: `{ acceptJoinRequests }` or `{ alwaysRequireRequest }` turns one join
// switch; `{ commandId, expectedRevision, input }` saves Edit preparation (prepared only, at the displayed revision).
func (s *server) patchSession(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	sessionID := r.PathValue("sessionId")
	for _, key := range []string{"acceptJoinRequests", "alwaysRequireRequest"} {
		on, isBool := body.Bool(key)
		if !isBool {
			continue
		}
		out, err := s.inSession(r.Context(), club, sessionID, func(t *txn) (any, error) {
			params := sqlcgen.SetQueueSessionJoinSwitchesParams{Now: t.stamp(), ID: t.sess.ID}
			if key == "acceptJoinRequests" {
				params.AcceptJoinRequests = pgtype.Bool{Bool: on, Valid: true}
			} else {
				params.AlwaysRequireRequest = pgtype.Bool{Bool: on, Valid: true}
			}
			if err := t.q.SetQueueSessionJoinSwitches(t.ctx, params); err != nil {
				return nil, err
			}
			updated, err := t.reload(t.sess.ID)
			return signedin.SessionOf(updated), err
		})
		return writes.Result{Body: out}, err
	}
	commandID := body.Text("commandId")
	if commandID == "" || !truthy(body["input"]) || !isJSObject(body["input"]) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	if err := requireClubEntitlement(r.Context(), sqlcgen.New(s.pool), club, s.at()); err != nil {
		return writes.Result{}, err
	}
	in := writes.Body(body.Object("input")) // a list is an object in JavaScript, with none of the fields
	out, err := s.lockedSession(r.Context(), club, sessionID, false, func(t *txn) (any, error) {
		return t.updateSession(commandID, body.Text("expectedRevision"), in)
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	if in.Has("costEstimate") {
		// The estimate is saved against the revision in effect, after the edit was committed; the answer is the edit's, from before the
		// estimate bumped the session revision (money_cost.go).
		current, err := s.estimateRevision(r.Context(), club, sessionID)
		if err != nil {
			return writes.Result{}, err
		}
		if err := s.saveSessionCost(r.Context(), club, sessionID, in["costEstimate"], current); err != nil {
			return writes.Result{}, err
		}
	}
	return writes.Result{Body: out}, nil
}

// isJSObject is `typeof value === 'object'` for a value that is not null: an object, or a list.
func isJSObject(v any) bool {
	switch v.(type) {
	case map[string]any, []any:
		return true
	}
	return false
}

// updateResult is what saving Edit preparation answers.
type updateResult struct {
	Session           signedin.Session `json:"session"`
	MovedToWaitlist   int              `json:"movedToWaitlist"`
	MovedFromWaitlist int              `json:"movedFromWaitlist"`
}

// updateSession is updateQueueSession: prepared sessions only, at the expected revision. It reconciles the courts, then applies the
// new budget first come, first served: entries beyond it are released (kept, never deleted) and moved to the front of the waitlist
// in their slot order; a larger budget fills from the waitlist.
func (t *txn) updateSession(commandID, expectedRevision string, in writes.Body) (any, error) {
	if err := requireState(t.sess, "Only prepared sessions can be edited.", sqlcgen.QueueSessionStatePrepared); err != nil {
		return nil, err
	}
	if err := requireRevision(t.sess.Revision, expectedRevision); err != nil {
		return nil, err
	}
	v, err := t.validate(in)
	if err != nil {
		return nil, err
	}
	others, err := t.q.ListClashCandidates(t.ctx, t.club)
	if err != nil {
		return nil, err
	}
	if date := sessionOccurrences(occurrenceDraft{id: t.sess.ID, start: v.start, end: v.end, venueID: v.venue.ID, repeat: "none"}, others)[0]; date.clash != "" {
		return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"schedule": date.clash + ". Pick another date or time."})
	}
	f, err := readSessionFields(in)
	if err != nil {
		return nil, err
	}
	params := sqlcgen.UpdateQueueSessionPreparationParams{
		Title: f.title, Notes: f.notes, VenueID: v.venue.ID, VenueName: pgtype.Text{String: v.venue.Name, Valid: true}, VenueAddress: v.venue.Address,
		ScheduledStartAt: timestamp(v.start), ScheduledEndAt: timestamp(v.end), SessionMode: f.mode, AllowSingles: f.singles, AllowDoubles: f.doubles,
		MinimumGames: f.minimumGames, MinimumIsCalculated: f.minimumIsCalculated, ExpectedPlayers: f.expectedPlayers, PlayersPerCourt: v.playersPerCourt,
		Now: t.stamp(), ID: t.sess.ID,
	}
	if f.hasFormats {
		params.RequestFormats = f.requestFormats
	}
	if f.recordGames != nil {
		params.RecordGames = pgtype.Bool{Bool: *f.recordGames, Valid: true}
	}
	if err := t.q.UpdateQueueSessionPreparation(t.ctx, params); err != nil {
		return nil, err
	}
	session, err := t.reload(t.sess.ID)
	if err != nil {
		return nil, err
	}
	// The rest of the command reads the session as it is now (the notification texts, the revision an assessment records).
	t.sess = session

	if err := t.reconcileCourts(commandID, v); err != nil {
		return nil, err
	}
	capacity := int(t.slotCapacity(int64(len(v.courts)), v.playersPerCourt))
	roster, err := t.q.ListQueueLiveRoster(t.ctx, session.ID)
	if err != nil {
		return nil, err
	}
	var movedOut []sqlcgen.SessionPlayer
	if capacity < len(roster) {
		movedOut = roster[capacity:]
	}
	for _, e := range movedOut {
		if err := t.q.DemoteSessionPlayer(t.ctx, sqlcgen.DemoteSessionPlayerParams{Now: t.stamp(), ID: e.ID}); err != nil {
			return nil, err
		}
		if err := t.q.InsertDemotedWaitlistEntry(t.ctx, sqlcgen.InsertDemotedWaitlistEntryParams{
			ID: derivedID(commandID, "demote:"+e.ID.String()), ClubID: t.club, SessionID: session.ID, ClubPlayerID: e.ClubPlayerID, SkillLevelID: e.SkillLevelID,
			AddedAt: e.JoinedAt, Now: t.stamp(), DemotedConfirmedAt: e.ConfirmedAt,
		}); err != nil {
			return nil, err
		}
	}
	if len(movedOut) > 0 {
		if err := t.notifyDemoted(movedOut); err != nil {
			return nil, err
		}
	}
	movedIn := 0
	if len(movedOut) == 0 {
		rows, err := t.q.ListQueueWaitlist(t.ctx, session.ID)
		if err != nil {
			return nil, err
		}
		for _, w := range signedin.OrderedWaitlist(rows) {
			if len(roster)+movedIn >= capacity {
				break
			}
			if !w.SkillLevelID.Valid {
				continue
			}
			op := derivedID(commandID, "promote:"+w.ID.String()).String()
			if _, err := t.promoteWaiter(waiter{ID: w.ID, ClubPlayerID: w.ClubPlayerID, SkillLevelID: w.SkillLevelID}, op, false); err != nil {
				return nil, err
			}
			movedIn++
		}
	}
	session, err = t.recomputeMinimum(session)
	if err != nil {
		return nil, err
	}
	return updateResult{Session: signedin.SessionOf(session), MovedToWaitlist: len(movedOut), MovedFromWaitlist: movedIn}, nil
}

// notifyDemoted tells each demoted player who is registered their new place on the waitlist (the other entries are not told).
func (t *txn) notifyDemoted(demoted []sqlcgen.SessionPlayer) error {
	ids := make([]pgtype.UUID, len(demoted))
	for i, e := range demoted {
		ids[i] = e.ClubPlayerID
	}
	accounts, err := t.q.ListClubPlayerAccounts(t.ctx, ids)
	if err != nil {
		return err
	}
	players := map[pgtype.UUID]pgtype.UUID{}
	for _, a := range accounts {
		players[a.ID] = a.PlayerID
	}
	rows, err := t.q.ListQueueWaitlist(t.ctx, t.sess.ID)
	if err != nil {
		return err
	}
	for i, w := range signedin.OrderedWaitlist(rows) {
		if player := players[w.ClubPlayerID]; player.Valid {
			if err := t.notifyWaitlistPlace(player, w.ID, i+1); err != nil {
				return err
			}
		}
	}
	return nil
}

// reconcileCourts drops the courts left out of the form and saves the others (an id keeps a court, no id adds one).
func (t *txn) reconcileCourts(commandID string, v validated) error {
	kept := map[string]bool{}
	for _, c := range v.courts {
		if c.id != "" {
			kept[c.id] = true
		}
	}
	live, err := t.q.ListQueueSessionCourts(t.ctx, t.sess.ID)
	if err != nil {
		return err
	}
	for _, c := range live {
		if !kept[c.ID.String()] {
			if err := t.q.DropSessionCourt(t.ctx, sqlcgen.DropSessionCourtParams{Now: t.stamp(), ID: c.ID}); err != nil {
				return err
			}
		}
	}
	for n, c := range v.courts {
		planned, err := plannedStart(c.startsAt, v.start)
		if err != nil {
			return err
		}
		var openUntil *int64
		if truthy(c.openUntil) {
			at, err := ms(c.openUntil)
			if err != nil {
				return err
			}
			openUntil = &at
		}
		if c.id != "" {
			id, ok := writes.ParseUUID(c.id)
			if !ok {
				return errTypeError // Prisma refuses a court id that is no uuid
			}
			if _, err := t.q.EditSessionCourt(t.ctx, sqlcgen.EditSessionCourtParams{
				Label: fields.JSTrim(c.label), Position: pgtype.Int4{Int32: int32(n + 1), Valid: true}, StartsAt: nullableTimestamp(planned), OpenUntil: nullableTimestamp(openUntil), Now: t.stamp(),
				ClubID: t.club, SessionID: t.sess.ID, ID: id,
			}); err != nil {
				return err
			}
			continue
		}
		if _, err := t.q.InsertSessionCourt(t.ctx, sqlcgen.InsertSessionCourtParams{
			ID: derivedID(commandID, "court:"+strconv.Itoa(n)), ClubID: t.club, SessionID: t.sess.ID, Label: fields.JSTrim(c.label), Position: int32(n + 1),
			StartsAt: nullableTimestamp(planned), OpenUntil: nullableTimestamp(openUntil), Now: t.stamp(),
		}); err != nil {
			return err
		}
	}
	return nil
}

// deleteSession is DELETE /api/sessions/{sessionId}, Q-PREPARE / D-DELETE-SESSION: removes one prepared session with nobody confirmed.
// Waitlist and join requests do not block; the other dates of a series stay.
func (s *server) deleteSession(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	if err := requireClubEntitlement(r.Context(), sqlcgen.New(s.pool), club, s.at()); err != nil {
		return writes.Result{}, err
	}
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireState(t.sess, "Only a session that has not started can be deleted.", sqlcgen.QueueSessionStatePrepared); err != nil {
			return nil, err
		}
		confirmed, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		if confirmed > 0 {
			who := "players are"
			if confirmed == 1 {
				who = "player is"
			}
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"roster": strconv.Itoa(int(confirmed)) + " " + who + " confirmed. Remove them from the roster first."})
		}
		id := t.sess.ID
		steps := []func() error{
			func() error { return t.q.DeleteQueueSessionWaitlist(t.ctx, id) },
			func() error { return t.q.DeleteQueueSessionJoinRequests(t.ctx, id) },
			func() error { return t.q.DeleteQueueSessionPaymentMarks(t.ctx, id) },
			func() error { return t.q.DeleteQueueSessionShuttlePlanLines(t.ctx, id) },
			func() error { return t.q.DeleteQueueSessionCostEstimates(t.ctx, id) },
			func() error {
				return t.q.ClearQueueSessionPlayerAssessments(t.ctx, sqlcgen.ClearQueueSessionPlayerAssessmentsParams{Now: t.stamp(), SessionID: id})
			},
			func() error { return t.q.ClearQueueSessionAssessmentLinks(t.ctx, id) },
			func() error { return t.q.DeleteQueueSessionAssessments(t.ctx, id) },
			func() error { return t.q.DeleteQueueSessionPlayers(t.ctx, id) },
			func() error {
				return t.q.DeleteQueueSessionReservations(t.ctx, sqlcgen.DeleteQueueSessionReservationsParams{ClubID: t.club, SessionID: id})
			},
			func() error { return t.q.DeleteQueueSessionCourts(t.ctx, id) },
			func() error { return t.q.DeleteQueueSession(t.ctx, id) },
		}
		for _, step := range steps {
			if err := step(); err != nil {
				return nil, err
			}
		}
		return map[string]any{"id": id.String(), "title": t.sess.Title}, nil
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Body: out}, nil
}

// startResult is what Start answers: the session and how many join requests it closed.
type startResult struct {
	signedin.Session
	JoinRequestsClosed int64 `json:"joinRequestsClosed"`
}

// startSession is POST /api/sessions/{sessionId}/start, Q-PREPARE Start session: prepared to active under the club's current license
// term. It refuses while another session is running or an entry lacks a level, freezes the minimum, locks every entry's level and
// closes every pending join request. A retry after a lost response answers the already-active session (0 closed).
func (s *server) startSession(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	term, err := entitlementTerm(r.Context(), sqlcgen.New(s.pool), club, s.at())
	if err != nil {
		return writes.Result{}, err
	}
	var newEnd *int64
	if text := body.Text("newEndAt"); text != "" {
		at, err := ms(text)
		if err != nil {
			return writes.Result{}, err
		}
		newEnd = &at
	}
	out, err := s.lockedSession(r.Context(), club, r.PathValue("sessionId"), false, func(t *txn) (any, error) {
		return t.start(body.Text("expectedRevision"), term, newEnd)
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Body: out}, nil
}

func (t *txn) start(expectedRevision string, term pgtype.UUID, newEnd *int64) (any, error) {
	session := t.sess
	if session.State == sqlcgen.QueueSessionStateActive {
		return startResult{Session: signedin.SessionOf(session)}, nil
	}
	if err := requireState(session, "Only a prepared session can start.", sqlcgen.QueueSessionStatePrepared); err != nil {
		return nil, err
	}
	if err := requireRevision(session.Revision, expectedRevision); err != nil {
		return nil, err
	}
	running, err := t.q.FindRunningQueueSession(t.ctx, sqlcgen.FindRunningQueueSessionParams{ClubID: t.club, ID: session.ID})
	if err == nil {
		return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"session": running + " is already running. One session at a time."})
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	roster, err := t.q.ListQueueLiveRoster(t.ctx, session.ID)
	if err != nil {
		return nil, err
	}
	missing := 0
	for _, e := range roster {
		if !e.SkillLevelID.Valid || !e.AssessmentID.Valid {
			missing++
		}
	}
	if missing > 0 {
		need := "s need"
		if missing == 1 {
			need = " needs"
		}
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"roster": strconv.Itoa(missing) + " player" + need + " a level before you can start."})
	}
	now := t.s.at().UnixMilli()
	plannedStartAt, plannedEndAt := session.ScheduledStartAt.Time.UnixMilli(), session.ScheduledEndAt.Time.UnixMilli()
	late := startNeedsNewEnd(plannedStartAt, plannedEndAt, now)
	endError, bad := startNewEndError(plannedStartAt, plannedEndAt, newEnd, now)
	if !bad && late && newEnd != nil {
		live, err := t.q.ListQueueSessionCourts(t.ctx, session.ID)
		if err != nil {
			return nil, err
		}
		endError, bad = courts.SessionEndCourtConflict(modelCourts(live), *newEnd, now, now)
	}
	if bad {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"endAt": endError})
	}
	// The minimum freezes from the planned window, before a late start moves the end.
	if session, err = t.recomputeMinimum(session); err != nil {
		return nil, err
	}
	for _, e := range roster {
		if err := t.q.LockSessionPlayerLevelAtStart(t.ctx, sqlcgen.LockSessionPlayerLevelAtStartParams{Now: t.stamp(), ID: e.ID}); err != nil {
			return nil, err
		}
	}
	params := sqlcgen.StartQueueSessionParams{Now: t.stamp(), StartLicenseTermID: term, ID: session.ID}
	if late && newEnd != nil {
		params.ScheduledEndAt = timestamp(*newEnd)
	}
	if err := t.q.StartQueueSession(t.ctx, params); err != nil {
		return nil, err
	}
	if session, err = t.reload(session.ID); err != nil {
		return nil, err
	}
	// Join requests end at Start: online requests close; the Queue Master adds late players.
	closed, err := t.q.CloseQueueJoinRequestsAtStart(t.ctx, sqlcgen.CloseQueueJoinRequestsAtStartParams{Now: t.stamp(), ClubID: t.club, SessionID: session.ID})
	if err != nil {
		return nil, err
	}
	return startResult{Session: signedin.SessionOf(session), JoinRequestsClosed: closed}, nil
}

// modelCourts is the courts as the end-time rule reads them (endCourt): a null planned start follows the session start, and none is removed.
func modelCourts(rows []sqlcgen.SessionCourt) []model.Court {
	out := make([]model.Court, len(rows))
	for i, c := range rows {
		out[i] = model.Court{ID: c.ID.String(), Label: c.Label}
		if c.StartsAt.Valid {
			at := c.StartsAt.Time.UnixMilli()
			out[i].StartsAt = &at
		}
		if c.OpenUntil.Valid {
			at := c.OpenUntil.Time.UnixMilli()
			out[i].OpenUntil = &at
		}
	}
	return out
}
