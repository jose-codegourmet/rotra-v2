package signedin

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// What the Queue writes (internal/queuewrites) answer with: the same roster read, entry, waitlist entry and join
// request the GET routes send, shared here so a write can never disagree with a read about what the Queue Master sees.

// RosterEntry is rosterEntryDto on the wire.
type RosterEntry = queueRosterEntryDTO

// WaitlistEntry is waitlistDto on the wire.
type WaitlistEntry = queueWaitlistDTO

// JoinRequest is joinRequestDto on the wire.
type JoinRequest = queueJoinRequestDTO

// RosterNames is rosterNamesOf for one entry: the nickname players see and the club's own nickname for a registered
// player (null when blank).
func RosterNames(clubNickname, playerNickname pgtype.Text, state sqlcgen.NullPlayerProfileState) (nickname, club *string) {
	return rosterNames(clubNickname, playerNickname, state)
}

// RosterEntryOf is rosterEntryDto for a session player row.
func RosterEntryOf(e sqlcgen.SessionPlayer, nickname, clubNickname *string) RosterEntry {
	return RosterEntry{
		ID: e.ID.String(), SessionID: e.SessionID.String(), ClubPlayerID: e.ClubPlayerID.String(), NameSnapshot: e.NameSnapshot,
		NicknameSnapshot: nickname, ClubNickname: clubNickname, Present: e.Present, PresentChangedAt: httpapi.ToIso(e.PresentChangedAt.Time),
		Level: levelOf(e.SkillLevelID), LevelLockedAt: isoPtr(e.LevelLockedAt), ConfirmedAt: httpapi.ToIso(e.ConfirmedAt.Time),
		GamesAdjustment: e.GamesAdjustment, SelfCheckedInAt: isoPtr(e.SelfCheckedInAt), LeftAt: isoPtr(e.LeftAt),
		Revision: httpapi.ToDecimalString(e.Revision),
	}
}

// WaitlistEntryOf is waitlistDto for a waitlist row at a position.
func WaitlistEntryOf(w sqlcgen.SessionWaitlist, position int) WaitlistEntry {
	return WaitlistEntry{
		ID: w.ID.String(), SessionID: w.SessionID.String(), ClubPlayerID: w.ClubPlayerID.String(), Level: levelOf(w.SkillLevelID),
		AddedAt: httpapi.ToIso(w.AddedAt.Time), Position: position,
	}
}

// JoinRequestOf is joinRequestDto for a request row with its Player's picture and name seed.
func JoinRequestOf(j sqlcgen.GetQueueJoinRequestForUpdateRow) JoinRequest {
	return JoinRequest{
		ID: j.ID.String(), SessionID: j.SessionID.String(), Name: j.Name, Nickname: textPtr(j.Nickname), PhoneE164: textPtr(j.PhoneE164),
		StatedBand: string(j.StatedBand), Placement: string(j.Placement), Status: string(j.Status), RequestedAt: httpapi.ToIso(j.RequestedAt.Time),
		DecidedAt: isoPtr(j.DecidedAt), ClubPlayerID: uuidPtr(j.ClubPlayerID), PlayerID: uuidPtr(j.PlayerID),
		Picture: textPtr(j.AvatarRef), PictureName: textPtr(j.PlayerFullName),
	}
}

// WaitlistPosition is the 1-based place of an entry in the waitlist order (orderedWaitlist then findIndex + 1); 0 when
// it is not there.
func WaitlistPosition(rows []sqlcgen.ListQueueWaitlistRow, id pgtype.UUID) int {
	for i, w := range orderedQueueWaitlist(rows) {
		if w.ID == id {
			return i + 1
		}
	}
	return 0
}

// ReadSessionRoster is readSessionRosterIn for the club's session: the roster read, run on q (a transaction's queries).
func ReadSessionRoster(ctx context.Context, q *sqlcgen.Queries, club, sessionID pgtype.UUID, now func() time.Time) (any, error) {
	rows, err := q.ListQueueSessions(ctx, sqlcgen.ListQueueSessionsParams{ClubID: club, SessionID: sessionID})
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, errNotFound
	}
	return (&server{now: now}).rosterOf(ctx, q, club, rows[0])
}
