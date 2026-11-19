package signedin

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// GET /api/invites/{clubId}: P-INVITE. Port of apps/player/src/app/api/invites/[clubId]/route.ts and
// packages/db/src/player/invite-landing.ts. Open to visitors; a signed-in player also gets where they stand.
// Not found while the player_google_sign_in flag is off.

type inviteClubDTO struct {
	ID       string                  `json:"id"`
	Name     string                  `json:"name"`
	Initials publicreads.UTF16String `json:"initials"`
	LogoURL  *string                 `json:"logoUrl"`
	City     string                  `json:"city"`
}

type inviteSessionDTO struct {
	Slug      string `json:"slug"`
	Title     string `json:"title"`
	StartsAt  int64  `json:"startsAt"`
	EndsAt    int64  `json:"endsAt"`
	VenueName string `json:"venueName"`
}

// inviteCard is InviteCardData: a club link, a session link or "unavailable" with a reason. inviter is always
// null and continueUrl is filled in by the app (no session invite codes are stored yet).
type inviteCard struct {
	Kind        string            `json:"kind"`
	Reason      string            `json:"reason,omitempty"`
	Club        *inviteClubDTO    `json:"club,omitempty"`
	MemberCount *int64            `json:"memberCount,omitempty"`
	Session     *inviteSessionDTO `json:"session,omitempty"`
	Inviter     json.RawMessage   `json:"inviter,omitempty"`
	ContinueURL *string           `json:"continueUrl,omitempty"`
}

// inviteViewer is InviteViewerState: visitor, ready, already-member, already-in, request-pending or on-waitlist.
type inviteViewer struct {
	Status   string `json:"status"`
	PlayerID string `json:"playerId,omitempty"`
	Name     string `json:"name,omitempty"`
	Position *int   `json:"position,omitempty"`
}

type inviteLanding struct {
	Card   inviteCard   `json:"card"`
	Viewer inviteViewer `json:"viewer"`
}

var clubInviteCodeShape = regexp.MustCompile(`^[A-Z0-9]{8,16}$`)

// jsUpper is toUpperCase for the characters that can still reach an invite code: Go keeps the sharp s and the
// Latin ligatures as they are, JavaScript expands them to plain letters.
var jsUpper = strings.NewReplacer(
	"ß", "SS", "ﬀ", "FF", "ﬁ", "FI", "ﬂ", "FL", "ﬃ", "FFI", "ﬄ", "FFL", "ﬅ", "ST", "ﬆ", "ST",
)

// readClubInviteCode is readClubInviteCode in @rotra/data/club/invite-code: trimmed and upper-cased, and it must
// look like a stored code.
func readClubInviteCode(value string) (string, bool) {
	code := strings.ToUpper(jsUpper.Replace(publicreads.JSTrim(value)))
	return code, clubInviteCodeShape.MatchString(code)
}

func unavailable(reason string, viewer inviteViewer) inviteLanding {
	return inviteLanding{Card: inviteCard{Kind: "unavailable", Reason: reason}, Viewer: viewer}
}

func (s *server) invite() http.Handler {
	return s.visitorOrPlayer(func(r *http.Request, q *sqlcgen.Queries, who *viewer) (any, error) {
		if !s.flagOn(r, playerGoogleFlag) {
			return nil, errNotFound
		}
		sessionSlug, _ := publicreads.QueryValue(r.URL.RawQuery, "session")
		clubCode, _ := publicreads.QueryValue(r.URL.RawQuery, "k")
		return readInviteLanding(r, q, who, r.PathValue("clubId"), sessionSlug, clubCode)
	})
}

// readInviteLanding is readInviteLanding. An empty session or k reads as absent. Reading it never joins anyone.
func readInviteLanding(r *http.Request, q *sqlcgen.Queries, who *viewer, clubID, sessionSlug, clubCode string) (any, error) {
	ctx := r.Context()
	ready := inviteViewer{Status: "visitor"}
	var player *sqlcgen.GetInvitePlayerRow
	if who != nil {
		p, err := q.GetInvitePlayer(ctx, who.ID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if err == nil {
			player = &p
			ready = inviteViewer{Status: "ready", PlayerID: p.ID.String(), Name: p.FullName}
		}
	}
	withStatus := func(status string) inviteViewer {
		v := ready
		v.Status = status
		return v
	}

	id, ok := parseUUIDString(clubID)
	if !ok {
		return unavailable("club", ready), nil
	}
	club, err := q.GetClubPageClub(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return unavailable("club", ready), nil
	}
	if err != nil {
		return nil, err
	}
	cardClub := &inviteClubDTO{ID: club.ID.String(), Name: club.Name, Initials: publicreads.ClubInitials(club.Name), LogoURL: textPtr(club.LogoRef), City: club.City}

	if sessionSlug == "" {
		code, ok := readClubInviteCode(clubCode)
		if !ok || !club.InviteCode.Valid || code != club.InviteCode.String {
			return unavailable("code", ready), nil
		}
		members, err := q.CountInviteClubMembers(ctx, club.ID)
		if err != nil {
			return nil, err
		}
		viewer := ready
		if player != nil {
			member, err := q.IsClubMember(ctx, sqlcgen.IsClubMemberParams{ClubID: club.ID, PlayerID: player.ID})
			if err != nil {
				return nil, err
			}
			if member {
				viewer = withStatus("already-member")
			}
		}
		return inviteLanding{Card: inviteCard{Kind: "club", Club: cardClub, MemberCount: &members}, Viewer: viewer}, nil
	}

	session, err := q.GetInviteSession(ctx, sessionSlug)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && (session.ClubID != club.ID || session.PublicationState.PublicationState == sqlcgen.PublicationStateDeleted && session.PublicationState.Valid)) {
		return unavailable("session", ready), nil
	}
	if err != nil {
		return nil, err
	}
	// Session invites only work before the session starts (D-2026-11-09-11).
	if session.State != sqlcgen.QueueSessionStatePrepared {
		return unavailable("started", ready), nil
	}
	viewer := ready
	if player != nil {
		viewer, err = sessionStanding(r, q, player, session.ID, ready, withStatus)
		if err != nil {
			return nil, err
		}
	}
	continueURL := ""
	return inviteLanding{
		Card: inviteCard{
			Kind: "session", Club: cardClub, ContinueURL: &continueURL, Inviter: json.RawMessage("null"),
			Session: &inviteSessionDTO{
				Slug: session.PublicSlug, Title: session.Title, StartsAt: session.ScheduledStartAt.Time.UnixMilli(),
				EndsAt: session.ScheduledEndAt.Time.UnixMilli(), VenueName: session.VenueName.String,
			},
		},
		Viewer: viewer,
	}, nil
}

// sessionStanding is readPlayerSessionStanding folded into the viewer state: the player's own place in the
// session. A slot wins over the waitlist; a waitlist place over a pending request.
func sessionStanding(r *http.Request, q *sqlcgen.Queries, player *sqlcgen.GetInvitePlayerRow, sessionID pgtype.UUID, ready inviteViewer, withStatus func(string) inviteViewer) (inviteViewer, error) {
	ctx := r.Context()
	slot, err := q.HasLiveSlotAtSession(ctx, sqlcgen.HasLiveSlotAtSessionParams{SessionID: sessionID, PlayerID: player.ID})
	if err != nil {
		return ready, err
	}
	waitIndex := -1
	list, err := q.ListSessionWaitlistRows(ctx, sessionID)
	if err != nil {
		return ready, err
	}
	if len(list) > 0 {
		ordered := orderedWaitlist(list)
		ids := make([]pgtype.UUID, len(ordered))
		for i, w := range ordered {
			ids[i] = w.ClubPlayerID
		}
		own, err := q.ListMyClubPlayersAmong(ctx, sqlcgen.ListMyClubPlayersAmongParams{Ids: ids, PlayerID: player.ID})
		if err != nil {
			return ready, err
		}
		waiting := uuidSet(own)
		for i, w := range ordered {
			if waiting[w.ClubPlayerID] {
				waitIndex = i
				break
			}
		}
	}
	if !slot && waitIndex >= 0 {
		v := withStatus("on-waitlist")
		pos := waitIndex + 1
		v.Position = &pos
		return v, nil
	}
	if slot || waitIndex >= 0 {
		return withStatus("already-in"), nil
	}
	status, err := q.GetLatestJoinRequestStatus(ctx, sqlcgen.GetLatestJoinRequestStatusParams{SessionID: sessionID, PlayerID: player.ID})
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return ready, err
	}
	if err == nil && status == sqlcgen.JoinRequestStatusPending {
		return withStatus("request-pending"), nil
	}
	return ready, nil
}
