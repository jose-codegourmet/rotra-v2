package queuewrites

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/phone"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// POST /api/sessions/{sessionId}/roster/batch: Q-ROSTER the roster burst batch (#718). Port of
// apps/queue/src/app/api/sessions/[sessionId]/roster/batch/route.ts and applyRosterBatch in session-roster.ts. `operations` is
// the Queue Master's burst of adds, removes and join-request decisions in click order; all of it is applied in one
// transaction, or none. The reply lists each operation's outcome and the roster as saved now.

const maxRosterBatchOperations = 100

func (s *server) registerRosterBatch(rt *signedin.Router) {
	rt.Handle("POST /api/sessions/{sessionId}/roster/batch", store.AudienceClub, s.club(s.rosterBatch))
}

// rosterOperation is one operation of the batch, as the route validated it.
type rosterOperation struct {
	op          string
	operationID string
	saved       *savedPlayerAdd
	directory   *directoryPlayerAdd
	newPlayer   *newPlayerAdd
	rosterID    string
	requestID   string
	level       string
}

func placementOf(b writes.Body) addPlacement {
	over, _ := b.Bool("allowOverfill")
	wait, _ := b.Bool("toWaitlist")
	return addPlacement{allowOverfill: over, toWaitlist: wait}
}

// addSource is what an add names: a saved player, a Player Information profile, or a new player (the default).
type addSource struct {
	saved     *savedPlayerAdd
	directory *directoryPlayerAdd
	newPlayer *newPlayerAdd
}

// addSourceOf reads the fields of an add the way the single add route and the batch both read them. A source that is neither
// saved nor directory is a new player; its phone is checked here, before any session is looked up.
func addSourceOf(b writes.Body, operationID, level string) (addSource, error) {
	switch b.Text("source") {
	case "saved":
		return addSource{saved: &savedPlayerAdd{addPlacement: placementOf(b), operationID: operationID, clubPlayerID: b.Text("clubPlayerId"), level: level}}, nil
	case "directory":
		return addSource{directory: &directoryPlayerAdd{
			addPlacement: placementOf(b), operationID: operationID, playerID: b.Text("playerId"), name: b.Text("name"), level: level,
		}}, nil
	}
	person := newClubPlayer{name: b.Text("name"), nickname: b.Text("nickname"), email: b.Text("email")}
	if raw := fields.JSTrim(b.Text("phone")); raw != "" {
		e164, ok := phone.Parse(raw)
		if !ok {
			return addSource{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"phone": "Enter a valid phone number."})
		}
		person.phone = e164
	}
	return addSource{newPlayer: &newPlayerAdd{addPlacement: placementOf(b), operationID: operationID, person: person, level: level}}, nil
}

// operationOf reads one wire operation, shaped like the single-op routes read theirs; anything else is invalid. A source that
// is neither saved nor directory is a new player.
func operationOf(raw any) (rosterOperation, error) {
	obj, ok := raw.(map[string]any)
	if !ok {
		return rosterOperation{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	b := writes.Body(obj)
	op := rosterOperation{operationID: b.Text("operationId"), level: b.Text("level")}
	switch b.Text("op") {
	case "add":
		op.op = "add"
		src, err := addSourceOf(b, op.operationID, op.level)
		if err != nil {
			return rosterOperation{}, err
		}
		op.saved, op.directory, op.newPlayer = src.saved, src.directory, src.newPlayer
	case "remove":
		op.op, op.rosterID = "remove", b.Text("rosterId")
	case "acceptRequest":
		op.op, op.requestID = "acceptRequest", b.Text("requestId")
	case "declineRequest":
		op.op, op.requestID = "declineRequest", b.Text("requestId")
	default:
		return rosterOperation{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"op": "Unknown roster change."})
	}
	return op, nil
}

func (s *server) rosterBatch(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	sessionID := r.PathValue("sessionId")
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	list, isList := body["operations"].([]any)
	if !isList || len(list) > maxRosterBatchOperations {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"operations": "Send between 1 and 100 roster changes."})
	}
	operations := make([]rosterOperation, 0, len(list))
	for _, raw := range list {
		op, err := operationOf(raw)
		if err != nil {
			return writes.Result{}, err
		}
		operations = append(operations, op)
	}
	out, err := s.applyRosterBatch(r, club, sessionID, operations)
	return writes.Result{Body: out}, err
}

// applyRosterBatch applies the operations in the order given inside one locked-session transaction: all of it lands or none of
// it does, with one revision bump and one minimum recomputation. Each operation runs the same rules as its single-op service and
// is repeat-safe on its operation id, so a retried batch repeats nothing (it still bumps the revision once more). The reply
// carries every operation's outcome and the roster as saved now.
func (s *server) applyRosterBatch(r *http.Request, club pgtype.UUID, sessionID string, operations []rosterOperation) (any, error) {
	if len(operations) == 0 || len(operations) > maxRosterBatchOperations {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"operations": "Send between 1 and 100 roster changes."})
	}
	ids := map[string]bool{}
	for _, op := range operations {
		ids[op.operationID] = true
	}
	if len(ids) != len(operations) || ids[""] {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"operations": "Every change needs its own operation id."})
	}
	return s.rosterCommand(r.Context(), club, sessionID, func(t *txn) (any, error) {
		results := make([]map[string]any, 0, len(operations))
		for _, op := range operations {
			item, err := t.runRosterOperation(op)
			if err != nil {
				return nil, err
			}
			results = append(results, item)
		}
		roster, err := signedin.ReadSessionRoster(t.ctx, t.q, t.club, t.sess.ID, t.s.at)
		if err != nil {
			return nil, err
		}
		return struct {
			Results []map[string]any `json:"results"`
			Roster  any              `json:"roster"`
		}{results, roster}, nil
	})
}

// runRosterOperation runs one operation and answers its outcome: the operation id and kind, and the roster entry, waitlist
// entry and request it made, each null when it made none. A new player also answers what the email did (emailWords).
func (t *txn) runRosterOperation(op rosterOperation) (map[string]any, error) {
	item := map[string]any{"operationId": op.operationID, "op": op.op, "rosterEntry": nil, "waitlist": nil, "request": nil}
	switch op.op {
	case "add":
		var p placed
		var err error
		switch {
		case op.saved != nil:
			p, err = t.addSavedPlayerIn(*op.saved)
		case op.directory != nil:
			p, err = t.addDirectoryPlayerIn(*op.directory)
		default:
			var words *string
			p, words, err = t.addNewPlayerIn(*op.newPlayer)
			item["emailWords"] = words
		}
		if err != nil {
			return nil, err
		}
		item["rosterEntry"], item["waitlist"] = nilIfNone(p.RosterEntry), nilIfNone(p.Waitlist)
	case "remove":
		if err := t.removeRosterPlayerIn(op.rosterID); err != nil {
			return nil, err
		}
	case "acceptRequest":
		c, err := t.confirmJoinRequestIn(requestAccept{operationID: op.operationID, requestID: op.requestID, level: op.level})
		if err != nil {
			return nil, err
		}
		item["request"], item["rosterEntry"], item["waitlist"] = nilIfNone(c.Request), nilIfNone(c.RosterEntry), nilIfNone(c.Waitlist)
	case "declineRequest":
		d, err := t.declineJoinRequestIn(op.requestID, pgtype.UUID{})
		if err != nil {
			return nil, err
		}
		item["request"] = nilIfNone(d)
	}
	return item, nil
}

// nilIfNone keeps a missing pointer a JSON null inside a map (a typed nil pointer in an interface would still encode as null,
// but this keeps the map plain).
func nilIfNone[T any](p *T) any {
	if p == nil {
		return nil
	}
	return p
}
