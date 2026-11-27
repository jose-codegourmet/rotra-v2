package queuewrites

import (
	"errors"
	"math"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the single roster operations of packages/db/src/queue/session-roster.ts and their Route Handlers
// (apps/queue/src/app/api/sessions/[sessionId]/{roster,presence,waitlist}/**): add, remove, set level, No show and Back to
// roster, Move to waitlist, Set games played, Present, and the waitlist's remove, give slot and fill. Each runs as a
// rosterCommand, as the burst batch does, so the building blocks are shared with roster_batch.go.

const gamesPlayedMax = 99

func (s *server) registerRosterOps(rt *signedin.Router) {
	const base = "/api/sessions/{sessionId}"
	rt.Handle("POST "+base+"/roster", store.AudienceClub, s.club(s.addToRoster))
	rt.Handle("DELETE "+base+"/roster/{rosterId}", store.AudienceClub, s.club(s.removeFromRoster))
	rt.Handle("POST "+base+"/roster/{rosterId}/level", store.AudienceClub, s.club(s.setRosterLevel))
	rt.Handle("POST "+base+"/roster/{rosterId}/no-show", store.AudienceClub, s.club(s.markNoShow))
	rt.Handle("DELETE "+base+"/roster/{rosterId}/no-show", store.AudienceClub, s.club(s.undoNoShow))
	rt.Handle("POST "+base+"/roster/{rosterId}/waitlist", store.AudienceClub, s.club(s.stepDown))
	rt.Handle("PATCH "+base+"/roster/games", store.AudienceClub, s.club(s.setGamesPlayed))
	rt.Handle("PATCH "+base+"/roster/handicap", store.AudienceClub, s.club(s.setHandicap))
	rt.Handle("POST "+base+"/presence", store.AudienceClub, s.club(s.setPresence))
	rt.Handle("DELETE "+base+"/waitlist/{waitlistId}", store.AudienceClub, s.club(s.removeFromWaitlist))
	rt.Handle("POST "+base+"/waitlist/{waitlistId}/slot", store.AudienceClub, s.club(s.giveSlot))
	rt.Handle("POST "+base+"/waitlist/fill", store.AudienceClub, s.club(s.fillOpenSlots))
}

// newPlaced is what adding a new player answers: the placement and what the email did (emailWords, null for a guest).
type newPlaced struct {
	placed
	EmailWords *string `json:"emailWords"`
}

// addToRoster is POST roster: Q-ROSTER Add player. `source` picks the tab: saved, directory, or a new player (the default).
func (s *server) addToRoster(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	src, err := addSourceOf(body, body.Text("operationId"), body.Text("level"))
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		switch {
		case src.saved != nil:
			return t.addSavedPlayerIn(*src.saved)
		case src.directory != nil:
			return t.addDirectoryPlayerIn(*src.directory)
		}
		p, words, err := t.addNewPlayerIn(*src.newPlayer)
		return newPlaced{placed: p, EmailWords: words}, err
	})
	return writes.Result{Status: http.StatusCreated, Body: out}, err
}

// removeFromRoster is DELETE roster/{rosterId}: the entry is released, not deleted.
func (s *server) removeFromRoster(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	_, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		return nil, t.removeRosterPlayerIn(r.PathValue("rosterId"))
	})
	return writes.Result{Body: map[string]any{"removed": nil}}, err
}

// liveEntry is liveEntry: a roster entry of this session that is neither released nor a no show.
func (t *txn) liveEntry(rosterText string) (sqlcgen.SessionPlayer, error) {
	e, err := t.entryOfSession(rosterText)
	if err != nil {
		return e, err
	}
	if e.ReleasedAt.Valid || e.NoShowAt.Valid {
		return e, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return e, nil
}

// entryOfSession reads a roster entry by id; one of another session is not found. A malformed id is not found (the TypeScript
// crashes on it).
func (t *txn) entryOfSession(rosterText string) (sqlcgen.SessionPlayer, error) {
	id, err := parseRowID(rosterText)
	if err != nil {
		return sqlcgen.SessionPlayer{}, err
	}
	e, err := t.q.GetSessionPlayer(t.ctx, id)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && e.SessionID != t.sess.ID) {
		return e, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return e, err
}

// setRosterLevel is POST roster/{rosterId}/level: a prepared entry's level changes by appending a new assessment.
func (s *server) setRosterLevel(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	level, err := levelID(body.Text("level"))
	if err != nil {
		return writes.Result{}, err
	}
	out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireState(t.sess, "Levels are locked after the session starts.", sqlcgen.QueueSessionStatePrepared); err != nil {
			return nil, err
		}
		entry, err := t.liveEntry(r.PathValue("rosterId"))
		if err != nil {
			return nil, err
		}
		if _, err := t.assessEntry(entry, level.Int16, body.Text("operationId")); err != nil {
			return nil, err
		}
		updated, err := t.q.GetSessionPlayer(t.ctx, entry.ID)
		if err != nil {
			return nil, err
		}
		return t.rosterEntryOf(updated, entry.ClubPlayerID)
	})
	return writes.Result{Body: out}, err
}

// shortName is the short name the roster toasts use: the club nickname, else the nickname, else the first word of the name
// (JavaScript || skips an empty string).
func (t *txn) shortName(e sqlcgen.SessionPlayer) (string, error) {
	nick, club, err := t.rosterNamesFor(e.ClubPlayerID)
	if err != nil {
		return "", err
	}
	if club != nil && *club != "" {
		return *club, nil
	}
	if nick != nil && *nick != "" {
		return *nick, nil
	}
	if first, _, _ := strings.Cut(e.NameSnapshot, " "); first != "" {
		return first, nil
	}
	return e.NameSnapshot, nil
}

// rosterCount is the live roster count and slot capacity, for the No show toasts.
type rosterCount struct {
	Count    int64 `json:"count"`
	Capacity int64 `json:"capacity"`
}

func (t *txn) rosterCount() (rosterCount, error) {
	n, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
	if err != nil {
		return rosterCount{}, err
	}
	capacity, err := t.capacityOf()
	return rosterCount{Count: int64(n), Capacity: capacity}, err
}

// noShowResult is what No show and Back to roster answer: the player's name and the roster count.
type noShowResult struct {
	Name string `json:"name"`
	rosterCount
}

func (t *txn) noShowResult(e sqlcgen.SessionPlayer) (noShowResult, error) {
	c, err := t.rosterCount()
	return noShowResult{Name: e.NameSnapshot, rosterCount: c}, err
}

// noShowCommand reads the body every No show route reads (an operation id is required, never looked up) and runs change.
func (s *server) noShowCommand(r *http.Request, club pgtype.UUID, change func(t *txn) (any, error)) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if body.Text("operationId") == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"operationId": "Missing operation id."})
	}
	out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), change)
	return writes.Result{Body: out}, err
}

// offRosterEntry is the entry a No show command works on: one of this session that is not released (a no show is allowed).
func (t *txn) offRosterEntry(rosterText string) (sqlcgen.SessionPlayer, error) {
	e, err := t.entryOfSession(rosterText)
	if err != nil {
		return e, err
	}
	if e.ReleasedAt.Valid {
		return e, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return e, nil
}

// markNoShow is POST roster/{rosterId}/no-show (#839): on a live session, an away entry with no games and in no match comes off
// tonight's roster and its slot opens. Marking an entry that is already a no show answers the same result.
func (s *server) markNoShow(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	return s.noShowCommand(r, club, func(t *txn) (any, error) {
		if t.sess.State != sqlcgen.QueueSessionStateActive {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"state": "This session is not live."})
		}
		e, err := t.offRosterEntry(r.PathValue("rosterId"))
		if err != nil {
			return nil, err
		}
		if e.NoShowAt.Valid {
			return t.noShowResult(e)
		}
		busy, err := t.q.EntryInUnfinishedMatch(t.ctx, sqlcgen.EntryInUnfinishedMatchParams{SessionID: t.sess.ID, SessionPlayerID: e.ID})
		if err != nil {
			return nil, err
		}
		if busy {
			name, err := t.shortName(e)
			if err != nil {
				return nil, err
			}
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"player": "Remove " + name + " from their match first."})
		}
		decided, err := t.q.EntryHasDecidedMatch(t.ctx, sqlcgen.EntryHasDecidedMatchParams{SessionID: t.sess.ID, SessionPlayerID: e.ID})
		if err != nil {
			return nil, err
		}
		counted, err := signedin.CountedGamesByEntry(t.ctx, t.q, t.sess.ID)
		if err != nil {
			return nil, err
		}
		games := max(0, int64(counted[e.ID.String()])+int64(e.GamesAdjustment))
		if e.Present || decided || games > 0 {
			name, err := t.shortName(e)
			if err != nil {
				return nil, err
			}
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"player": name + " is here or has played tonight."})
		}
		if err := t.q.SetSessionPlayerNoShow(t.ctx, sqlcgen.SetSessionPlayerNoShowParams{NoShowAt: t.stamp(), Now: t.stamp(), ID: e.ID}); err != nil {
			return nil, err
		}
		return t.noShowResult(e)
	})
}

// undoNoShow is DELETE roster/{rosterId}/no-show (#839): a no show takes a free slot again. Refused while the live roster is
// full; an entry already back answers the same result.
func (s *server) undoNoShow(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	return s.noShowCommand(r, club, func(t *txn) (any, error) {
		e, err := t.offRosterEntry(r.PathValue("rosterId"))
		if err != nil {
			return nil, err
		}
		before, err := t.rosterCount()
		if err != nil {
			return nil, err
		}
		if !e.NoShowAt.Valid {
			return noShowResult{Name: e.NameSnapshot, rosterCount: before}, nil
		}
		if before.Count >= before.Capacity {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"roster": "The roster is full. Free a slot to bring someone back."})
		}
		if err := t.q.SetSessionPlayerNoShow(t.ctx, sqlcgen.SetSessionPlayerNoShowParams{Now: t.stamp(), ID: e.ID}); err != nil {
			return nil, err
		}
		return t.noShowResult(e)
	})
}

// stepDownResult is what Move to waitlist answers.
type stepDownResult struct {
	Name         string `json:"name"`
	ClubPlayerID string `json:"clubPlayerId"`
}

// stepDown is POST roster/{rosterId}/waitlist (#735): the player steps down to the front of the waitlist.
func (s *server) stepDown(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	operationID := body.Text("operationId")
	if operationID == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"operationId": "Missing operation id."})
	}
	out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		return t.stepDownIn(operationID, r.PathValue("rosterId"), func(name string) string { return "Finish or remove " + name + "'s match first." })
	})
	return writes.Result{Body: out}, err
}

// stepDownIn is stepDownIn: the admitted player steps down to the front of the waitlist. Like a budget demotion the entry is
// released (reason demoted), so its assessments, paid mark and finished matches stay. Repeat-safe on the operation id.
func (t *txn) stepDownIn(operationID, rosterText string, blocked func(shortName string) string) (stepDownResult, error) {
	waitlistID := derivedID(operationID, "step-down")
	e, err := t.entryOfSession(rosterText)
	if err != nil {
		return stepDownResult{}, err
	}
	result := stepDownResult{Name: e.NameSnapshot, ClubPlayerID: e.ClubPlayerID.String()}
	// A retry of the same operation returns what it already did.
	if _, err := t.q.GetSessionWaitlistEntry(t.ctx, waitlistID); err == nil {
		return result, nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return result, err
	}
	if e.ReleasedAt.Valid || e.NoShowAt.Valid {
		return result, writes.Fail(httpapi.ErrNotFound, nil)
	}
	busy, err := t.q.EntryInUnfinishedMatch(t.ctx, sqlcgen.EntryInUnfinishedMatchParams{SessionID: t.sess.ID, SessionPlayerID: e.ID})
	if err != nil {
		return result, err
	}
	if busy {
		name, err := t.shortName(e)
		if err != nil {
			return result, err
		}
		return result, writes.Fail(httpapi.ErrConflict, map[string]string{"player": blocked(name)})
	}
	if err := t.q.DemoteSessionPlayer(t.ctx, sqlcgen.DemoteSessionPlayerParams{Now: t.stamp(), ID: e.ID}); err != nil {
		return result, err
	}
	if err := t.q.InsertDemotedWaitlistEntry(t.ctx, sqlcgen.InsertDemotedWaitlistEntryParams{
		ID: waitlistID, ClubID: t.sess.ClubID, SessionID: t.sess.ID, ClubPlayerID: e.ClubPlayerID, SkillLevelID: e.SkillLevelID,
		AddedAt: e.JoinedAt, Now: t.stamp(), DemotedConfirmedAt: e.ConfirmedAt,
	}); err != nil {
		return result, err
	}
	cp, err := t.q.GetClubPlayerByID(t.ctx, e.ClubPlayerID)
	if err != nil {
		return result, err
	}
	pos, err := t.waitlistPosition(waitlistID)
	if err != nil {
		return result, err
	}
	return result, t.notifyWaitlistPlace(cp.PlayerID, waitlistID, pos)
}

// safeInteger is Number.isSafeInteger.
func safeInteger(f float64) bool {
	return !math.IsNaN(f) && !math.IsInf(f, 0) && f == math.Trunc(f) && math.Abs(f) <= 1<<53-1
}

type gamesChange struct {
	RosterID string `json:"rosterId"`
	Name     string `json:"name"`
	Games    int64  `json:"games"`
}

// setGamesPlayed is PATCH roster/games (#717, D-SET-GAMES): one live entry, or every live entry (`all`), shows `games` from
// now on, stored as the adjustment against the counted games so later matches keep counting up. Active sessions only.
func (s *server) setGamesPlayed(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	games := body.Number("games")
	all, _ := body["all"].(bool)
	out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireState(t.sess, "Start the session first.", sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		if !safeInteger(games) || games < 0 || games > gamesPlayedMax {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"games": "Enter a whole number of games, 0 to 99."})
		}
		var entries []sqlcgen.SessionPlayer
		if all {
			rows, err := t.q.ListQueueLiveRoster(t.ctx, t.sess.ID)
			if err != nil {
				return nil, err
			}
			entries = rows
		} else {
			e, err := t.liveEntry(body.Text("rosterId"))
			if err != nil {
				return nil, err
			}
			entries = []sqlcgen.SessionPlayer{e}
		}
		if len(entries) == 0 {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"roster": "No players on the roster yet."})
		}
		counted, err := signedin.CountedGamesByEntry(t.ctx, t.q, t.sess.ID)
		if err != nil {
			return nil, err
		}
		changed := make([]gamesChange, 0, len(entries))
		for _, e := range entries {
			played := int64(counted[e.ID.String()])
			adjustment := int64(games) - played
			if int64(e.GamesAdjustment) != adjustment {
				if err := t.q.SetSessionPlayerGamesAdjustment(t.ctx, sqlcgen.SetSessionPlayerGamesAdjustmentParams{GamesAdjustment: int32(adjustment), Now: t.stamp(), ID: e.ID}); err != nil {
					return nil, err
				}
			}
			changed = append(changed, gamesChange{RosterID: e.ID.String(), Name: e.NameSnapshot, Games: max(0, played+adjustment)})
		}
		return map[string]any{"changed": changed}, nil
	})
	return writes.Result{Body: out}, err
}

// setPresence is POST presence (Q-ROSTER Present). `{ all: boolean }` marks everyone (prepared only); otherwise `changes` lists
// wanted end states, applied one by one, each in its own transaction (so an earlier change stays when a later one fails).
func (s *server) setPresence(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	sessionID := r.PathValue("sessionId")
	if all, isBool := body.Bool("all"); isBool {
		_, err := s.rosterCommand(r.Context(), club, sessionID, func(t *txn) (any, error) {
			if err := requireState(t.sess, "Mark players individually after the session starts.", sqlcgen.QueueSessionStatePrepared); err != nil {
				return nil, err
			}
			return nil, t.q.SetAllSessionPlayersPresence(t.ctx, sqlcgen.SetAllSessionPlayersPresenceParams{Present: all, Now: t.stamp(), SessionID: t.sess.ID})
		})
		return writes.Result{Body: map[string]any{"changed": nil}}, err
	}
	changes, _ := body["changes"].([]any)
	for _, raw := range changes {
		// A change that is no object has no rosterId (the TypeScript reads undefined, or crashes on null).
		change, _ := raw.(map[string]any)
		rosterID := writes.Body(change).Text("rosterId")
		present := change["present"] == true
		_, err := s.rosterCommand(r.Context(), club, sessionID, func(t *txn) (any, error) {
			e, err := t.liveEntry(rosterID)
			if err != nil || e.Present == present {
				return nil, err
			}
			return nil, t.q.SetSessionPlayerPresence(t.ctx, sqlcgen.SetSessionPlayerPresenceParams{Present: present, Now: t.stamp(), ID: e.ID})
		})
		if err != nil {
			return writes.Result{}, err
		}
	}
	return writes.Result{Body: map[string]any{"changed": len(changes)}}, nil
}

// waiterOf is waiter: a waitlist entry of this session, or not found. A malformed id is not found.
func (t *txn) waiterOf(waitlistText string) (sqlcgen.SessionWaitlist, error) {
	id, err := parseRowID(waitlistText)
	if err != nil {
		return sqlcgen.SessionWaitlist{}, err
	}
	w, err := t.q.GetSessionWaitlistEntry(t.ctx, id)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && w.SessionID != t.sess.ID) {
		return w, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return w, err
}

// removeFromWaitlist is DELETE waitlist/{waitlistId}. An entry that is not there is already removed.
func (s *server) removeFromWaitlist(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	_, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		id, err := parseRowID(r.PathValue("waitlistId"))
		if err != nil {
			return nil, err
		}
		w, err := t.q.GetSessionWaitlistEntry(t.ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		if err != nil {
			return nil, err
		}
		if w.SessionID != t.sess.ID {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		return nil, t.q.DeleteSessionWaitlistEntry(t.ctx, w.ID)
	})
	return writes.Result{Body: map[string]any{"removed": nil}}, err
}

// giveSlot is POST waitlist/{waitlistId}/slot: one waitlisted player gets a slot, even over budget (the operator's choice).
// A retry answers the entry the first try made, without the names.
func (s *server) giveSlot(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	operationID := body.Text("operationId")
	out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		op, err := opUUID(operationID)
		if err != nil {
			return nil, err
		}
		done, err := t.q.GetClubAssessmentByOperation(t.ctx, op)
		if err == nil {
			e, err := t.q.GetSessionPlayer(t.ctx, done.SessionPlayerID)
			if err != nil {
				return nil, err
			}
			return map[string]any{"rosterEntry": signedin.RosterEntryOf(e, nil, nil)}, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		w, err := t.waiterOf(r.PathValue("waitlistId"))
		if err != nil {
			return nil, err
		}
		live, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		capacity, err := t.capacityOf()
		if err != nil {
			return nil, err
		}
		promoted, err := t.promoteWaiter(waiter{ID: w.ID, ClubPlayerID: w.ClubPlayerID, SkillLevelID: w.SkillLevelID}, operationID, int64(live) >= capacity)
		if err != nil {
			return nil, err
		}
		entry, err := t.rosterEntryOf(promoted, promoted.ClubPlayerID)
		return map[string]any{"rosterEntry": entry}, err
	})
	return writes.Result{Body: out}, err
}

// fillOpenSlots is POST waitlist/fill: open slots fill from the front of the waitlist; entries without a level are skipped.
func (s *server) fillOpenSlots(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	operationID := body.Text("operationId")
	out, err := s.rosterCommand(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		live, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		capacity, err := t.capacityOf()
		if err != nil {
			return nil, err
		}
		open := capacity - int64(live)
		rows, err := t.q.ListQueueWaitlist(t.ctx, t.sess.ID)
		if err != nil {
			return nil, err
		}
		moved := 0
		for _, w := range signedin.OrderedWaitlist(rows) {
			if open <= 0 {
				break
			}
			if !w.SkillLevelID.Valid {
				continue
			}
			op := derivedID(operationID, w.ID.String()).String()
			if _, err := t.promoteWaiter(waiter{ID: w.ID, ClubPlayerID: w.ClubPlayerID, SkillLevelID: w.SkillLevelID}, op, false); err != nil {
				return nil, err
			}
			open--
			moved++
		}
		return map[string]any{"moved": moved}, nil
	})
	return writes.Result{Body: out}, err
}
