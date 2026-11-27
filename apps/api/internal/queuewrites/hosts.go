package queuewrites

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the club's trusted hosts and a Queue Session's hosts (D-2026-11-22-01): packages/db/src/queue/club-hosts.ts and session-hosts.ts, and the
// Route Handlers under apps/queue/src/app/api/club/trusted-hosts and apps/queue/src/app/api/sessions/{sessionId}/hosts. The two GETs are in signedin.
// The setup save's hostClubPlayerIds (assignSessionHostsIn for a whole list) and the freeze of a finished session's hosts are not ported here.

func (s *server) registerHosts(rt *signedin.Router) {
	club := store.AudienceClub
	rt.Handle("POST /api/club/trusted-hosts", club, s.club(s.addTrustedHost))
	rt.Handle("DELETE /api/club/trusted-hosts/{clubPlayerId}", club, s.club(s.removeTrustedHost))
	rt.Handle("POST /api/sessions/{sessionId}/hosts", club, s.club(s.addSessionHost))
	rt.Handle("DELETE /api/sessions/{sessionId}/hosts/{clubPlayerId}", club, s.club(s.removeSessionHost))
}

func playerNotAvailable() error {
	return writes.Fail(httpapi.ErrNotFound, map[string]string{"player": "Player not available."})
}

// hostName is hostName: the ROTRA full name of a linked record, else the club's name for the saved player.
func hostName(displayName string, fullName pgtype.Text) string {
	if fullName.Valid && fullName.String != "" {
		return fullName.String
	}
	return displayName
}

// hostPlayer is the saved player a host command names. current says a deleted or moved one is not available (the trusted-host commands); the Session
// host commands name any saved player of the club. A malformed id is not available.
func (t *txn) hostPlayer(raw string, current bool) (sqlcgen.GetQueueHostPlayerRow, string, error) {
	id, ok := writes.ParseUUID(raw)
	if !ok {
		return sqlcgen.GetQueueHostPlayerRow{}, "", playerNotAvailable()
	}
	row, err := t.q.GetQueueHostPlayer(t.ctx, sqlcgen.GetQueueHostPlayerParams{ClubID: t.club, ID: id})
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && current && row.RemovedAt.Valid) {
		return row, "", playerNotAvailable()
	}
	if err != nil {
		return row, "", err
	}
	return row, hostName(row.DisplayName, row.FullName), nil
}

// ---- POST and DELETE /api/club/trusted-hosts

type trustedHost struct {
	ID           string `json:"id"`
	ClubPlayerID string `json:"clubPlayerId"`
	AddedAt      string `json:"addedAt"`
}

// addTrustedHost is addTrustedHost: puts one of the club's saved players on its trusted-host list. Guests and unclaimed players qualify; already trusted is
// a conflict. Only the list changes. The body is read before the entitlement, as the Route Handler does.
func (s *server) addTrustedHost(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	raw := body.Text("clubPlayerId")
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		player, name, err := t.hostPlayer(raw, true)
		if err != nil {
			return nil, err
		}
		_, err = t.q.GetQueueCurrentTrustedHost(t.ctx, sqlcgen.GetQueueCurrentTrustedHostParams{ClubID: t.club, ClubPlayerID: player.ID})
		if err == nil {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"player": name + " is already a trusted host."})
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		row, err := t.q.InsertQueueTrustedHost(t.ctx, sqlcgen.InsertQueueTrustedHostParams{ID: randomID(), ClubID: t.club, ClubPlayerID: player.ID, Now: t.stamp()})
		if err != nil {
			return nil, err
		}
		return struct {
			TrustedHost trustedHost `json:"trustedHost"`
			Message     string      `json:"message"`
		}{trustedHost{ID: row.ID.String(), ClubPlayerID: row.ClubPlayerID.String(), AddedAt: httpapi.ToIso(row.AddedAt.Time)}, name + " added to trusted hosts"}, nil
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Status: http.StatusCreated, Body: out}, nil
}

// removeTrustedHost is removeTrustedHost: ends the current trusted-host row. The saved player, their registrations and every session's host records stay.
func (s *server) removeTrustedHost(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		player, name, err := t.hostPlayer(r.PathValue("clubPlayerId"), true)
		if err != nil {
			return nil, err
		}
		ended, err := t.q.EndQueueTrustedHost(t.ctx, sqlcgen.EndQueueTrustedHostParams{Now: t.stamp(), ClubID: t.club, ClubPlayerID: player.ID})
		if err != nil {
			return nil, err
		}
		if ended == 0 {
			return nil, writes.Fail(httpapi.ErrNotFound, map[string]string{"player": name + " is not a trusted host."})
		}
		return struct {
			ClubPlayerID string `json:"clubPlayerId"`
			Message      string `json:"message"`
		}{player.ID.String(), name + " removed from trusted hosts"}, nil
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: out}, nil
}

// ---- POST and DELETE /api/sessions/{sessionId}/hosts

// hostCommand is hostCommand: change runs on a locked, prepared or active session, and the session revision is bumped (a calculated minimum is
// recomputed). Unlike a roster command it does not close match requests.
func (s *server) hostCommand(r *http.Request, club pgtype.UUID, change func(t *txn) (any, error)) (any, error) {
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		if err := requireState(t.sess, "This session is closed.", sqlcgen.QueueSessionStatePrepared, sqlcgen.QueueSessionStateActive); err != nil {
			return nil, err
		}
		res, err := change(t)
		if err != nil {
			return nil, err
		}
		touched, err := t.touch()
		if err != nil {
			return nil, err
		}
		if _, err := t.recomputeMinimum(touched); err != nil {
			return nil, err
		}
		return res, nil
	})
	if err != nil {
		return nil, mapDatabaseError(err)
	}
	return out, nil
}

// hostRegistration is what an added host got: a slot, or a waitlist place (every slot taken).
type hostRegistration struct {
	Registered int `json:"registered"`
	Waitlisted int `json:"waitlisted"`
}

func hostsText(h hostRegistration) string {
	n := func(k int) string {
		if k == 1 {
			return "1 host"
		}
		return strconv.Itoa(k) + " hosts"
	}
	out := ""
	if h.Registered > 0 {
		out += " · " + n(h.Registered) + " registered"
	}
	if h.Waitlisted > 0 {
		out += " · " + n(h.Waitlisted) + " waitlisted"
	}
	return out
}

// addSessionHost is addSessionHost: the same rules as the setup (a current trusted host; a slot while one is open, else the waitlist; never a second
// registration). No role, permission or sign-in changes.
func (s *server) addSessionHost(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	raw := body.Text("clubPlayerId")
	out, err := s.hostCommand(r, club, func(t *txn) (any, error) {
		player, name, err := t.hostPlayer(raw, false)
		if err != nil {
			return nil, err
		}
		current, err := t.q.ListQueueCurrentHostPlayers(t.ctx, sqlcgen.ListQueueCurrentHostPlayersParams{ClubID: t.club, SessionID: t.sess.ID})
		if err != nil {
			return nil, err
		}
		for _, id := range current {
			if id == player.ID {
				return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"hosts": name + " is already a host."})
			}
		}
		registration, err := t.assignHost(player)
		if err != nil {
			return nil, err
		}
		return struct {
			Registration hostRegistration `json:"registration"`
			Message      string           `json:"message"`
		}{registration, name + " added as a host" + hostsText(registration)}, nil
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Status: http.StatusCreated, Body: out}, nil
}

// removeSessionHost is removeSessionHost: ends the host designation only. The player's slot or waitlist place and their trusted-host status stay.
func (s *server) removeSessionHost(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	out, err := s.hostCommand(r, club, func(t *txn) (any, error) {
		player, name, err := t.hostPlayer(r.PathValue("clubPlayerId"), false)
		if err != nil {
			return nil, err
		}
		ended, err := t.q.EndQueueSessionHost(t.ctx, sqlcgen.EndQueueSessionHostParams{Now: t.stamp(), ClubID: t.club, SessionID: t.sess.ID, ClubPlayerID: player.ID})
		if err != nil {
			return nil, err
		}
		if ended == 0 {
			return nil, writes.Fail(httpapi.ErrConflict, map[string]string{"hosts": name + " is not a host of this session."})
		}
		return struct {
			ClubPlayerID string `json:"clubPlayerId"`
			Message      string `json:"message"`
		}{player.ID.String(), name + " removed as a host"}, nil
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: out}, nil
}

// assignHost is assignSessionHostsIn for one host who is not one yet: they must be a current trusted host; they get a host row and, unless they already
// hold a live slot or a waitlist place, a place by the preparation rule (a slot while one is open, otherwise the end of the waitlist). Their latest saved
// level comes with them through place; a saved player with none is placed with no level, to be set in Roster and levels, and no assessment is written.
func (t *txn) assignHost(player sqlcgen.GetQueueHostPlayerRow) (hostRegistration, error) {
	var result hostRegistration
	if player.RemovedAt.Valid {
		return result, writes.Fail(httpapi.ErrInvalid, map[string]string{"hosts": "A host is no longer one of your saved players."})
	}
	trusted, err := t.q.IsQueueClubPlayerTrusted(t.ctx, sqlcgen.IsQueueClubPlayerTrustedParams{ClubID: t.club, ClubPlayerID: player.ID})
	if err != nil {
		return result, err
	}
	if !trusted {
		return result, writes.Fail(httpapi.ErrConflict, map[string]string{"hosts": player.DisplayName + " is not a trusted host. Pick them again to add them to your trusted hosts."})
	}
	_, err = t.q.GetSessionWaitlistEntryOfClubPlayer(t.ctx, sqlcgen.GetSessionWaitlistEntryOfClubPlayerParams{SessionID: t.sess.ID, ClubPlayerID: player.ID})
	hasWaiting := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return result, err
	}
	entry, err := t.q.GetSessionPlayerOfClubPlayer(t.ctx, sqlcgen.GetSessionPlayerOfClubPlayerParams{SessionID: t.sess.ID, ClubPlayerID: player.ID})
	hasEntry := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return result, err
	}
	registered := hasWaiting || (hasEntry && !entry.ReleasedAt.Valid && !entry.NoShowAt.Valid)
	level, err := t.q.GetQueueLatestAssessmentLevel(t.ctx, sqlcgen.GetQueueLatestAssessmentLevelParams{ClubID: t.club, ClubPlayerID: player.ID})
	hasLevel := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return result, err
	}
	// Levels are locked once play starts, so a host who would take a place in a live session needs a saved level. A host already registered needs nothing.
	if t.sess.State == sqlcgen.QueueSessionStateActive && !registered && !hasLevel {
		return result, writes.Fail(httpapi.ErrInvalid, map[string]string{"hosts": player.DisplayName + " has no saved level. Add them as a player with a level first, then add them as a host."})
	}
	operationID := randomID().String()
	at := t.stamp()
	if err := t.q.InsertQueueSessionHost(t.ctx, sqlcgen.InsertQueueSessionHostParams{
		ID: derivedID(operationID, "host:"+player.ID.String()), ClubID: t.club, SessionID: t.sess.ID, ClubPlayerID: player.ID, At: at,
		NameSnapshot: hostName(player.DisplayName, player.FullName), Now: at,
	}); err != nil {
		return result, err
	}
	// Already registered (a live slot or a waitlist place): never a second registration.
	if registered {
		return result, nil
	}
	placeID := derivedID(operationID, "host-place:"+player.ID.String()).String()
	clubPlayer, err := t.q.GetQueueClubPlayerOfClub(t.ctx, sqlcgen.GetQueueClubPlayerOfClubParams{ClubID: t.club, ID: player.ID})
	if err != nil {
		return result, err
	}
	if hasLevel {
		placed, err := t.place(clubPlayer, pgtype.Int2{Int16: level, Valid: true}, placeID, at, false, false, true)
		if err != nil {
			return result, err
		}
		if placed.Waitlist != nil {
			result.Waitlisted++
		} else {
			result.Registered++
		}
		return result, nil
	}
	// No saved level: the same placement, with the level left for Roster and levels.
	rosterCount, err := t.q.CountQueueLiveRoster(t.ctx, t.sess.ID)
	if err != nil {
		return result, err
	}
	capacity, err := t.capacityOf()
	if err != nil {
		return result, err
	}
	if int64(rosterCount) < capacity {
		if hasEntry {
			if err := t.q.ReactivateHostSessionPlayer(t.ctx, sqlcgen.ReactivateHostSessionPlayerParams{At: at, Now: t.stamp(), ID: entry.ID}); err != nil {
				return result, err
			}
		} else if _, err := t.q.InsertSessionPlayer(t.ctx, sqlcgen.InsertSessionPlayerParams{
			ID: derivedID(placeID, "entry"), ClubID: t.club, SessionID: t.sess.ID, ClubPlayerID: player.ID, PlayerIDAtEntry: clubPlayer.PlayerID,
			NameSnapshot: clubPlayer.DisplayName, Present: false, Now: at,
		}); err != nil {
			return result, err
		}
		result.Registered++
		return result, nil
	}
	waiter, err := t.q.InsertSessionWaitlistEntry(t.ctx, sqlcgen.InsertSessionWaitlistEntryParams{
		ID: derivedID(placeID, "waitlist"), ClubID: t.club, SessionID: t.sess.ID, ClubPlayerID: player.ID, AddedAt: at, Now: t.stamp(),
	})
	if err != nil {
		return result, err
	}
	position, err := t.waitlistPosition(waiter.ID)
	if err != nil {
		return result, err
	}
	if err := t.notifyWaitlistPlace(clubPlayer.PlayerID, waiter.ID, position); err != nil {
		return result, err
	}
	result.Waitlisted++
	return result, nil
}
