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

// OrderedWaitlist is orderedWaitlist: the session's waitlist rows in waitlist order.
func OrderedWaitlist(rows []sqlcgen.ListQueueWaitlistRow) []sqlcgen.ListQueueWaitlistRow {
	return orderedQueueWaitlist(rows)
}

// CountedGamesByEntry is countedGamesByEntry: the games each roster entry has counted, by entry id.
func CountedGamesByEntry(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID) (map[string]int, error) {
	return countedGamesByEntry(ctx, q, session)
}

// Session is sessionDto on the wire.
type Session = queueSessionDTO

// Court is courtDto on the wire.
type Court = queueCourtDTO

// SessionOf is sessionDto for a queue_sessions row, as a write reads it (the columns of LockQueueSession).
func SessionOf(r sqlcgen.LockQueueSessionRow) Session {
	formats := r.RequestFormats
	d := Session{
		ID: r.ID.String(), ClubID: r.ClubID.String(), Title: r.Title, Notes: r.Notes.String,
		ScheduledStartAt: httpapi.ToIso(r.ScheduledStartAt.Time), ScheduledEndAt: httpapi.ToIso(r.ScheduledEndAt.Time),
		VenueID: uuidPtr(r.VenueID), VenueName: r.VenueName.String, VenueAddress: r.VenueAddress.String, State: string(r.State),
		InvalidReason: textPtr(r.InvalidReason), CancelledAt: isoPtr(r.CancelledAt), CancelReason: textPtr(r.CancelReason),
		SessionMode: string(r.SessionMode), AllowSingles: r.AllowSingles, AllowDoubles: r.AllowDoubles, MinimumGames: r.MinimumGames,
		MinimumIsCalculated: r.MinimumIsCalculated, PlayersPerCourt: r.PlayersPerCourt, StartedAt: isoPtr(r.StartedAt),
		FinalizedAt: isoPtr(r.FinalizedAt), SeriesID: uuidPtr(r.SeriesID), PublicSlug: r.PublicSlug, AcceptJoinRequests: r.AcceptJoinRequests,
		AlwaysRequireRequest: r.AlwaysRequireRequest, CourtFillMode: string(r.CourtFillMode), RequestFormats: requestFormatsRecord(formats),
		RecordGames: r.RecordGames, Revision: httpapi.ToDecimalString(r.Revision),
	}
	if r.ExpectedPlayers.Valid {
		v := r.ExpectedPlayers.Int32
		d.ExpectedPlayers = &v
	}
	return d
}

// CourtOf is courtDto for a session court row.
func CourtOf(c sqlcgen.SessionCourt) Court {
	return Court{
		ID: c.ID.String(), SessionID: c.SessionID.String(), Label: c.Label, StartsAt: isoPtr(c.StartsAt), OpenedEarlyAt: isoPtr(c.OpenedEarlyAt),
		OpenUntil: isoPtr(c.OpenUntil), RemovedAt: isoPtr(c.RemovedAt),
	}
}

// NewInviteCode is newClubInviteCode: a random club invite code.
func NewInviteCode() (string, error) { return newInviteCode() }

// Venue is venueDto on the wire.
type Venue = queueVenueDTO

// VenueOf is venueDto for a saved venue.
func VenueOf(v sqlcgen.ClubVenue) Venue {
	return Venue{
		ID: v.ID.String(), ClubID: v.ClubID.String(), Name: v.Name, Address: v.Address.String,
		CourtFeePerCourtHr: moneyOrNil(v.CourtFeePerCourtHourMinor, v.Currency), EntranceFee: moneyOrNil(v.EntranceFeeMinor, v.Currency),
		Revision: httpapi.ToDecimalString(v.Revision),
	}
}
