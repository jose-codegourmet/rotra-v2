package signedin

import (
	"context"
	"errors"
	"net/http"
	"slices"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/match"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// The session page reads of a signed-in Player, on the Player origin and called from the paired Queue origin:
// GET /api/public-sessions/{slug}/access (#569), /my-night, /match-history (#850), /match-request and
// /match-request/options. Ports of packages/db/src/queue/{public-session,match-requests}.ts.

// ---- GET /api/public-sessions/{slug}/access ----

type participantDTO struct {
	BannerKey      string  `json:"bannerKey"`
	BannerImageURL *string `json:"bannerImageUrl"`
	Name           string  `json:"name"`
	Masked         bool    `json:"masked"`
	Nickname       *string `json:"nickname"`
	RtrID          *string `json:"rtrId"`
	IsViewer       bool    `json:"isViewer"`
	Profile        string  `json:"profile"`
	PictureURL     *string `json:"pictureUrl"`
	SkillGroup     *string `json:"skillGroup"`
	LevelLabel     *string `json:"levelLabel"`
}

type courtNowDTO struct {
	ID          string    `json:"id"`
	Label       string    `json:"label"`
	CourtLabels []string  `json:"courtLabels"`
	Merged      bool      `json:"merged"`
	Status      string    `json:"status"`
	TeamA       []faceDTO `json:"teamA"`
	TeamB       []faceDTO `json:"teamB"`
	StartedAt   *int64    `json:"startedAt"`
	FreeSince   *int64    `json:"freeSince"`
}

type queuedMatchDTO struct {
	MatchNo int64     `json:"matchNo"`
	Format  string    `json:"format"`
	Label   string    `json:"label"`
	TeamA   []faceDTO `json:"teamA"`
	TeamB   []faceDTO `json:"teamB"`
}

// levelBlockDTO is the reason a Player cannot join and the level the club knows them at.
type levelBlockDTO struct {
	Reason string `json:"reason"`
	Level  string `json:"level"`
}

type accessDTO struct {
	PlayerID         string           `json:"playerId"`
	Name             string           `json:"name"`
	Nickname         *string          `json:"nickname"`
	RtrID            *string          `json:"rtrId"`
	PictureURL       *string          `json:"pictureUrl"`
	InSession        bool             `json:"inSession"`
	WaitlistPosition *int             `json:"waitlistPosition"`
	JoinRequest      *joinRequestView `json:"joinRequest"`
	IsClubMember     bool             `json:"isClubMember"`
	// LevelBlock is "Not open to your level" (D-2026-11-19-12): only a session restricted by level can block, and only a Player
	// who holds no slot (playerLevelBlock).
	LevelBlock   *levelBlockDTO   `json:"levelBlock"`
	FullRoster   bool             `json:"fullRoster"`
	Participants []participantDTO `json:"participants"`
	Waitlist     []participantDTO `json:"waitlist"`
	Hosts        []participantDTO `json:"hosts"`
	CourtsNow    []courtNowDTO    `json:"courtsNow"`
	Queue        []queuedMatchDTO `json:"queue"`
}

// readSessionAccess is readPlayerSessionAccess: what the signed-in Player sees of the session page (D-2026-11-09-02).
// A registered (claimed) player shows their full name, nickname and RTR ID; an unclaimed player saved with an email
// shows in full with the club's own name and nickname (D-2026-11-16-04); guests stay masked, and an always-private
// player is masked for everyone but themselves. Courts now and the queue show first names only.
func (s *server) readSessionAccess(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
	ctx := r.Context()
	ls, err := loadSession(ctx, q, r.PathValue("slug"))
	if err != nil {
		return nil, err
	}
	// The waitlist in its public order, and the hosts (epic #1002): a finished session shows the rows frozen at its end.
	waitRows, err := q.ListSessionWaitlistRows(ctx, ls.row.ID)
	if err != nil {
		return nil, err
	}
	waitlist := orderedWaitlist(waitRows)
	ended := ls.row.State == sqlcgen.QueueSessionStateCompleted || ls.row.State == sqlcgen.QueueSessionStateInvalid
	hostRows, err := q.ListSessionHostRows(ctx, sqlcgen.ListSessionHostRowsParams{SessionID: ls.row.ID, Ended: ended})
	if err != nil {
		return nil, err
	}
	ids := make([]pgtype.UUID, 0, len(ls.roster)+len(waitlist)+len(hostRows))
	for _, e := range ls.roster {
		ids = append(ids, e.ClubPlayerID)
	}
	for _, w := range waitlist {
		ids = append(ids, w.ClubPlayerID)
	}
	hostIDs := make([]pgtype.UUID, len(hostRows))
	for i, h := range hostRows {
		ids = append(ids, h.ClubPlayerID)
		hostIDs[i] = h.ClubPlayerID
	}
	linked, err := peopleByID(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	hostLevels, err := q.ListLatestAssessmentLevels(ctx, hostIDs)
	if err != nil {
		return nil, err
	}
	shown, err := q.ListShownProfileBanners(ctx)
	if err != nil {
		return nil, err
	}
	// pictureOf: a registered player's own picture, else the one the club set for its guest or unclaimed player.
	pictureOf := func(clubPlayer pgtype.UUID) *string {
		c, ok := linked[clubPlayer]
		switch {
		case !ok:
			return nil
		case c.PlayerID.Valid:
			return publicreads.TextPtr(c.AvatarRef)
		}
		return publicreads.TextPtr(c.ClubAvatarRef)
	}
	person := func(clubPlayer pgtype.UUID, nameSnapshot string) participantDTO {
		club, found := linked[clubPlayer]
		registered := found && isClaimed(club)
		isViewer := found && club.PlayerID.Valid && club.PlayerID == who.ID
		alwaysPrivate := registered && club.ProfileVisibility.Valid && club.ProfileVisibility.ProfileVisibility == sqlcgen.ProfileVisibilityAlwaysPrivate
		// An unclaimed player (saved with an email, so an RTR ID) is public, with this club's own name and nickname.
		unclaimed := !registered && found && club.HasSharedEntry && !club.SharedClaimedPlayerID.Valid && !club.SharedRetiredAt.Valid
		showFull := unclaimed || (registered && (!alwaysPrivate || isViewer))
		var chosenID, chosenImage pgtype.Text
		if registered {
			chosenID, chosenImage = club.BannerID, club.BannerImage
		}
		key, image := publicreads.ResolveBanner(chosenID, chosenImage, shown)
		p := participantDTO{BannerKey: key, BannerImageURL: image, Masked: !showFull, IsViewer: isViewer}
		p.Name = publicreads.MaskPublicName(nameSnapshot)
		if showFull {
			p.Name = nameSnapshot
		}
		switch {
		case unclaimed:
			p.Nickname, p.RtrID, p.Profile = publicreads.TextPtr(club.ClubNickname), publicreads.TextPtr(club.SharedRtrID), "unclaimed"
		case showFull:
			p.Nickname, p.RtrID, p.Profile = publicreads.TextPtr(club.PlayerNickname), publicreads.TextPtr(club.PlayerRtrID), "registered"
		case alwaysPrivate:
			p.Profile = "private"
		default:
			p.Profile = "guest"
		}
		return p
	}
	rosterPerson := func(e sqlcgen.ListSessionRosterRowsRow) participantDTO {
		p := person(e.ClubPlayerID, e.NameSnapshot)
		p.PictureURL = pictureOf(e.ClubPlayerID)
		p.SkillGroup, p.LevelLabel = publicreads.PublicLevel(levelOf(e.SkillLevelID))
		return p
	}
	// A signed-in Player sees the whole roster, whether or not they hold a slot (D-2026-11-25-05); the 12-tile cap is the
	// visitor's page only. A face points at its entry there so it can open the same profile card.
	index := make(map[string]int, len(ls.roster))
	byID := make(map[string]sqlcgen.ListSessionRosterRowsRow, len(ls.roster))
	for i, e := range ls.roster {
		index[e.ID.String()] = i
		byID[e.ID.String()] = e
	}
	faceOf := func(id string) faceDTO {
		e, ok := byID[id]
		f := faceDTO{Name: publicreads.PublicFirstName(publicreads.MaskPublicName("")), Masked: true}
		if !ok {
			return f
		}
		p := person(e.ClubPlayerID, e.NameSnapshot)
		i := index[id]
		return faceDTO{
			Name: publicreads.PublicFirstName(p.Name), Level: levelOf(e.SkillLevelID), PictureURL: pictureOf(e.ClubPlayerID),
			Masked: p.Masked, IsViewer: p.IsViewer, Participant: &i,
		}
	}
	faces := func(ids []string) []faceDTO {
		out := make([]faceDTO, 0, len(ids))
		for _, id := range ids {
			out = append(out, faceOf(id))
		}
		return out
	}

	courts := []courtNowDTO{}
	if ls.row.State == sqlcgen.QueueSessionStateActive || ls.row.State == sqlcgen.QueueSessionStateFinalizing {
		courts = s.courtsNow(ls, faces)
	}

	st, err := playerStanding(ctx, q, who.ID, ls.row.ID)
	if err != nil {
		return nil, err
	}
	member, err := isClubMember(ctx, q, ls.row.ClubID, who.ID)
	if err != nil {
		return nil, err
	}
	dto := accessDTO{
		PlayerID: who.ID.String(), Name: st.Name, Nickname: st.Nickname, RtrID: st.RtrID, PictureURL: st.PictureURL,
		InSession: st.InSession, WaitlistPosition: st.WaitlistPosition, JoinRequest: st.JoinRequest,
		IsClubMember: member, FullRoster: true, Participants: make([]participantDTO, 0, len(ls.roster)),
		Waitlist: make([]participantDTO, 0, len(waitlist)), Hosts: []participantDTO{}, CourtsNow: courts, Queue: []queuedMatchDTO{},
	}
	if !st.InSession {
		if dto.LevelBlock, err = playerLevelBlock(ctx, q, ls, who.ID); err != nil {
			return nil, err
		}
	}
	for _, e := range ls.roster {
		dto.Participants = append(dto.Participants, rosterPerson(e))
	}
	// The waitlist by the same signed-in name rule; the name is this club's saved name, as on the visitor's page.
	for _, w := range waitlist {
		p := person(w.ClubPlayerID, linked[w.ClubPlayerID].DisplayName)
		p.PictureURL = pictureOf(w.ClubPlayerID)
		p.SkillGroup, p.LevelLabel = publicreads.PublicLevel(levelOf(w.SkillLevelID))
		dto.Waitlist = append(dto.Waitlist, p)
	}
	// Epic #1002 (#1006): the Hosts section, the same name, picture and card as Players. A finished session shows the name a
	// host row froze with; an open one the roster name, else the saved player's.
	assessed := map[pgtype.UUID]int16{}
	for _, a := range hostLevels {
		assessed[a.ClubPlayerID] = a.SkillLevelID
	}
	for _, host := range hostRows {
		who, ok := linked[host.ClubPlayerID]
		if !ok {
			continue
		}
		name := host.NameSnapshot
		level := pgtype.Int2{}
		if a, ok := assessed[host.ClubPlayerID]; ok {
			level = pgtype.Int2{Int16: a, Valid: true}
		}
		if i := slices.IndexFunc(ls.roster, func(e sqlcgen.ListSessionRosterRowsRow) bool { return e.ClubPlayerID == host.ClubPlayerID }); i >= 0 {
			level = ls.roster[i].SkillLevelID
			if !ended {
				name = ls.roster[i].NameSnapshot
			}
		} else if !ended {
			name = who.DisplayName
		}
		p := person(host.ClubPlayerID, name)
		p.PictureURL = pictureOf(host.ClubPlayerID)
		p.SkillGroup, p.LevelLabel = publicreads.PublicLevel(levelOf(level))
		dto.Hosts = append(dto.Hosts, p)
	}
	// Only waiting lineups, in queue order (a match with no position last). No presence, court holds, games, scores,
	// contacts or operator notes. The match is named by who plays it (D-2026-11-19-07).
	genderOf := func(id string) string {
		e, ok := byID[id]
		if !ok {
			return ""
		}
		if g := linked[e.ClubPlayerID].Gender; g.Valid {
			return string(g.PlayerGender)
		}
		return ""
	}
	waiting := make([]int, 0)
	for i, m := range ls.matches {
		if m.State == model.StateWaiting {
			waiting = append(waiting, i)
		}
	}
	sort.SliceStable(waiting, func(a, b int) bool {
		x, y := ls.matchRows[waiting[a]], ls.matchRows[waiting[b]]
		if x.QueuePosition.Valid != y.QueuePosition.Valid {
			return x.QueuePosition.Valid
		}
		if x.QueuePosition.Int64 != y.QueuePosition.Int64 {
			return x.QueuePosition.Int64 < y.QueuePosition.Int64
		}
		return x.MatchNo < y.MatchNo
	})
	for _, i := range waiting {
		m := ls.matches[i]
		dto.Queue = append(dto.Queue, queuedMatchDTO{
			MatchNo: m.MatchNo, Format: string(m.Format), Label: match.Label(m.Format, m.TeamA, m.TeamB, genderOf),
			TeamA: faces(m.TeamA), TeamB: faces(m.TeamB),
		})
	}
	return dto, nil
}

// courtsNow is Courts now (the live feed): one entry per court, or per match on merged courts. Who is on which court and
// since when; never a score or a running result.
func (s *server) courtsNow(ls *loadedSession, faces func([]string) []faceDTO) []courtNowDTO {
	now := s.now().UnixMilli()
	out := []courtNowDTO{}
	seen := map[string]bool{}
	for _, court := range ls.courts {
		if seen[court.ID] {
			continue
		}
		var held *model.Match
		for i := range ls.matches {
			if ls.matches[i].HoldsCourt() && slices.Contains(ls.matches[i].CourtIDs, court.ID) {
				held = &ls.matches[i]
				break
			}
		}
		if held == nil {
			free := courtFreeSince(court.ID, ls.matches, now)
			if free == nil {
				free = msPtr(ls.row.StartedAt)
			}
			out = append(out, courtNowDTO{
				ID: court.ID, Label: court.Label, CourtLabels: []string{court.Label}, Status: "free",
				TeamA: []faceDTO{}, TeamB: []faceDTO{}, FreeSince: free,
			})
			continue
		}
		for _, id := range held.CourtIDs {
			seen[id] = true
		}
		labels := []string{}
		for _, c := range ls.courts {
			if slices.Contains(held.CourtIDs, c.ID) {
				labels = append(labels, c.Label)
			}
		}
		tile := courtNowDTO{
			ID: court.ID, Label: courtNames(*held, ls.courts), CourtLabels: labels, Merged: len(held.CourtIDs) > 1,
			Status: "getting-ready", TeamA: faces(held.TeamA), TeamB: faces(held.TeamB),
		}
		if held.State == model.StateActive {
			tile.Status, tile.StartedAt = "playing", held.StartedAt
		}
		out = append(out, tile)
	}
	return out
}

// ---- GET /api/public-sessions/{slug}/my-night ----

type teamUpDTO struct {
	Partners   []faceDTO `json:"partners"`
	Opponents  []faceDTO `json:"opponents"`
	MatchLabel string    `json:"matchLabel"`
}

type inQueueDTO struct {
	Position int `json:"position"`
	teamUpDTO
}

type onCourtDTO struct {
	CourtLabel string `json:"courtLabel"`
	Started    bool   `json:"started"`
	teamUpDTO
}

type myNightDTO struct {
	PlayerID         string  `json:"playerId"`
	Status           string  `json:"status"`
	Stage            *string `json:"stage"`
	WaitlistPosition *int    `json:"waitlistPosition"`
	StartsAt         int64   `json:"startsAt"`
	Present          bool    `json:"present"`
	CheckedIn        bool    `json:"checkedIn"`
	HasLeft          bool    `json:"hasLeft"`
	CantMakeItSent   bool    `json:"cantMakeItSent"`
	// CanTransfer is whether the slot can be given to someone else: a confirmed player before Start. SlotTransfer is the player's own
	// pending transfer (#1011); slot transfers are not in Go yet (task 2.12), so there is none.
	CanTransfer  bool             `json:"canTransfer"`
	SlotTransfer *struct{}        `json:"slotTransfer"`
	Offline      bool             `json:"offline"`
	Games        int64            `json:"games"`
	Won          int              `json:"won"`
	Lost         int              `json:"lost"`
	Minimum      int32            `json:"minimum"`
	InQueue      *inQueueDTO      `json:"inQueue"`
	OnCourt      *onCourtDTO      `json:"onCourt"`
	JoinRequest  *joinRequestView `json:"joinRequest"`
	IsClubMember bool             `json:"isClubMember"`
	CanInvite    bool             `json:"canInvite"`
	InviteCode   *string          `json:"inviteCode"`
	MatchRequest *matchRequestDTO `json:"matchRequest"`
	// LevelBlock is "Not open to your level" (D-2026-11-19-12), while the Player holds no slot or waitlist place.
	LevelBlock *levelBlockDTO `json:"levelBlock"`
}

// readMyNight is readMyNight: the signed-in Player's own night on this session. Own standing only: their status and
// stage, counted games, wins and losses, the minimum, the first waiting match with them in it and the match holding a
// court with them in it, their latest join request and open match request, club membership, their own I'm here and
// I'm leaving marks, whether they have an open I can't make it notice and their Session invite code. Never another
// player's results or positions, presence of others, contacts or operator notes.
func (s *server) readMyNight(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
	ctx := r.Context()
	ls, err := loadSession(ctx, q, r.PathValue("slug"))
	if err != nil {
		return nil, err
	}
	st, err := playerStanding(ctx, q, who.ID, ls.row.ID)
	if err != nil {
		return nil, err
	}
	ownID, err := q.GetOwnLiveEntry(ctx, sqlcgen.GetOwnLiveEntryParams{SessionID: ls.row.ID, PlayerID: who.ID})
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	hasRow := err == nil
	var own sqlcgen.ListSessionRosterRowsRow
	if hasRow {
		for _, e := range ls.roster {
			if e.ID == ownID {
				own = e
			}
		}
	}
	night := myNightDTO{PlayerID: who.ID.String(), WaitlistPosition: st.WaitlistPosition, StartsAt: msOf(ls.row.ScheduledStartAt), Minimum: ls.row.MinimumGames}
	night.JoinRequest = st.JoinRequest
	night.CanTransfer = hasRow && ls.row.State == sqlcgen.QueueSessionStatePrepared
	waitlisted := !hasRow && st.WaitlistPosition != nil
	state := ls.row.State
	isLive := state == sqlcgen.QueueSessionStateActive || state == sqlcgen.QueueSessionStateFinalizing
	takesPart := state == sqlcgen.QueueSessionStatePrepared || isLive
	switch {
	case hasRow:
		night.Status = "confirmed"
	case waitlisted:
		night.Status = "waitlisted"
	default:
		night.Status = "none"
	}
	var stage string
	switch {
	case night.Status == "waitlisted":
		if takesPart {
			stage = "waitlisted"
		}
	case hasRow:
		switch {
		case state == sqlcgen.QueueSessionStatePrepared:
			stage = "before-start"
		case isLive && own.Present:
			stage = "live-present"
		case isLive:
			stage = "live-not-present"
		case state == sqlcgen.QueueSessionStateCompleted:
			stage = "finished"
		}
	}
	if stage != "" {
		night.Stage = &stage
	}
	if hasRow {
		mark := selfCheckInMark(own.Present, msOf(own.PresentChangedAt), msPtr(own.SelfCheckedInAt), msPtr(own.LeftAt))
		night.Present, night.CheckedIn, night.HasLeft = own.Present, mark == "checked-in", mark == "left"
		if night.CantMakeItSent, err = q.HasOpenDropOutNotice(ctx, own.ID); err != nil {
			return nil, err
		}
	}
	code, err := q.GetMyInviteCode(ctx, sqlcgen.GetMyInviteCodeParams{SessionID: ls.row.ID, PlayerID: who.ID})
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err == nil {
		night.InviteCode = &code
	}

	var people map[pgtype.UUID]shownPerson
	if hasRow {
		if people, err = peopleFor(ctx, q, ls.roster, who.ID); err != nil {
			return nil, err
		}
	}
	levels := map[string]*string{}
	for _, p := range ls.rules {
		levels[p.ID] = p.Level
	}
	face := func(id string) faceDTO {
		uid, _ := parseUUIDString(id)
		p, ok := people[uid]
		f := faceDTO{Name: publicreads.PublicFirstName(""), Level: levels[id], Masked: true}
		if ok {
			f = faceDTO{Name: publicreads.PublicFirstName(p.name), Level: levels[id], PictureURL: p.pictureURL, Masked: p.masked, IsViewer: p.isViewer}
		}
		return f
	}
	teamUp := func(m model.Match, rosterID string) teamUpDTO {
		mineA := slices.Contains(m.TeamA, rosterID)
		partnerIDs, opponentIDs := m.TeamB, m.TeamA
		if mineA {
			partnerIDs, opponentIDs = m.TeamA, m.TeamB
		}
		out := teamUpDTO{Partners: []faceDTO{}, Opponents: []faceDTO{}}
		var pn, on []string
		for _, id := range partnerIDs {
			if id != rosterID {
				f := face(id)
				out.Partners, pn = append(out.Partners, f), append(pn, f.Name)
			}
		}
		for _, id := range opponentIDs {
			f := face(id)
			out.Opponents, on = append(out.Opponents, f), append(on, f.Name)
		}
		out.MatchLabel = myMatchLabel(pn, on)
		return out
	}
	if hasRow {
		rosterID := own.ID.String()
		for _, row := range match.ComputeStandings(ls.rules, ls.matches) {
			if row.PlayerID == rosterID {
				night.Games, night.Won, night.Lost = row.Games, row.Wins, row.Losses
			}
		}
		var queued []model.Match
		for _, m := range ls.matches {
			if m.State == model.StateWaiting {
				queued = append(queued, m)
			}
		}
		sort.SliceStable(queued, func(i, j int) bool { return queued[i].QueuePosition < queued[j].QueuePosition })
		for i, m := range queued {
			if slices.Contains(m.AllPlayers(), rosterID) {
				night.InQueue = &inQueueDTO{Position: i + 1, teamUpDTO: teamUp(m, rosterID)}
				break
			}
		}
		if isLive {
			for _, m := range ls.matches {
				if m.HoldsCourt() && slices.Contains(m.AllPlayers(), rosterID) {
					night.OnCourt = &onCourtDTO{CourtLabel: courtNames(m, ls.courts), Started: m.State == model.StateActive, teamUpDTO: teamUp(m, rosterID)}
					break
				}
			}
		}
	}
	if night.IsClubMember, err = isClubMember(ctx, q, ls.row.ClubID, who.ID); err != nil {
		return nil, err
	}
	if !st.InSession {
		if night.LevelBlock, err = playerLevelBlock(ctx, q, ls, who.ID); err != nil {
			return nil, err
		}
	}
	night.CanInvite = state == sqlcgen.QueueSessionStatePrepared && ls.row.AcceptJoinRequests && (hasRow || waitlisted)
	if night.MatchRequest, err = readOpenMatchRequest(ctx, q, ls, who); err != nil {
		return nil, err
	}
	return night, nil
}

// ---- GET /api/public-sessions/{slug}/match-history ----

type historyMatchDTO struct {
	ID          string    `json:"id"`
	Number      int64     `json:"number"`
	Format      string    `json:"format"`
	CourtLabels []string  `json:"courtLabels"`
	StartedAt   int64     `json:"startedAt"`
	EndedAt     int64     `json:"endedAt"`
	ReplayEndAt int64     `json:"replayEndAt"`
	TeamA       []faceDTO `json:"teamA"`
	TeamB       []faceDTO `json:"teamB"`
	WinningTeam *string   `json:"winningTeam"`
	TeamAScore  *int64    `json:"teamAScore"`
	TeamBScore  *int64    `json:"teamBScore"`
	Invalid     bool      `json:"invalid"`
}

type matchHistoryDTO struct {
	Shared      bool              `json:"shared"`
	Total       int               `json:"total"`
	Matches     []historyMatchDTO `json:"matches"`
	CourtLabels []string          `json:"courtLabels"`
	From        int64             `json:"from"`
	To          int64             `json:"to"`
}

// readMatchHistory is readPublicMatchHistory: a finished session's matches for the signed-in Player, newest first, with
// the replay's courts and bounds. Null for any session that is not completed; a session with Record games off lists its
// matches as usual (D-2026-11-20-02). Until the club shares the results (a published copy) only the matches the Player played in
// are listed and the court labels are empty; the total always counts every finished or invalid match.
func (s *server) readMatchHistory(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
	ctx := r.Context()
	ls, err := loadSession(ctx, q, r.PathValue("slug"))
	if err != nil {
		return nil, err
	}
	if ls.row.State != sqlcgen.QueueSessionStateCompleted {
		return nil, nil
	}
	matches := ls.matches
	start := ls.row.ScheduledStartAt
	if ls.row.StartedAt.Valid {
		start = ls.row.StartedAt
	}
	record := sessionRecordHistory(msOf(start), ls.courtsAll, matches)
	people, err := peopleFor(ctx, q, ls.rosterAll, who.ID)
	if err != nil {
		return nil, err
	}
	levels := map[string]*string{}
	for _, e := range ls.rosterAll {
		levels[e.ID.String()] = levelOf(e.SkillLevelID)
	}
	// The access read sends the whole roster to any signed-in Player (D-2026-11-25-05).
	indexes := map[string]int{}
	for i, e := range ls.roster {
		indexes[e.ID.String()] = i
	}
	face := func(id string) faceDTO {
		uid, _ := parseUUIDString(id)
		p, ok := people[uid]
		f := faceDTO{Name: publicreads.PublicFirstName(""), Level: levels[id], Masked: true}
		if ok {
			f = faceDTO{Name: publicreads.PublicFirstName(p.name), Level: levels[id], PictureURL: p.pictureURL, Masked: p.masked, IsViewer: p.isViewer}
		}
		if i, listed := indexes[id]; listed {
			f.Participant = &i
		}
		return f
	}
	faces := func(ids []string) []faceDTO {
		out := make([]faceDTO, 0, len(ids))
		for _, id := range ids {
			out = append(out, face(id))
		}
		return out
	}
	all := make([]historyMatchDTO, 0, len(record.matches))
	for _, rm := range record.matches {
		dto := historyMatchDTO{
			ID: rm.m.ID, Number: rm.m.MatchNo, Format: string(rm.m.Format), CourtLabels: rm.courtNames,
			StartedAt: rm.startedAt, EndedAt: rm.endedAt, ReplayEndAt: rm.replayEnd,
			TeamA: faces(rm.m.TeamA), TeamB: faces(rm.m.TeamB), Invalid: rm.m.State == model.StateInvalid,
		}
		if d := rm.m.Decision; d != nil {
			dto.WinningTeam, dto.TeamAScore, dto.TeamBScore = d.WinningTeam, d.TeamAScore, d.TeamBScore
		}
		all = append(all, dto)
	}
	sort.SliceStable(all, func(i, j int) bool { return all[i].Number > all[j].Number })
	_, err = q.GetPublishedResults(ctx, ls.row.ID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	shared := err == nil
	out := matchHistoryDTO{Shared: shared, Total: len(all), Matches: []historyMatchDTO{}, CourtLabels: []string{}, From: record.from, To: record.to}
	if shared {
		out.CourtLabels = record.courtLabels
	}
	for _, m := range all {
		own := slices.ContainsFunc(slices.Concat(m.TeamA, m.TeamB), func(f faceDTO) bool { return f.IsViewer })
		if shared || own {
			out.Matches = append(out.Matches, m)
		}
	}
	return out, nil
}

// ---- GET /api/public-sessions/{slug}/match-request and /match-request/options ----

type matchRequestDTO struct {
	ID        string     `json:"id"`
	Format    string     `json:"format"`
	At        string     `json:"at"`
	Partners  []*faceDTO `json:"partners"`
	Opponents []*faceDTO `json:"opponents"`
}

// readOpenMatchRequest is the match request of readMyMatchRequest: the Player's own open request, nil without one. An
// open request naming anyone who is not present reads as closed. The faces follow the signed-in name rule, first name
// only.
func readOpenMatchRequest(ctx context.Context, q *sqlcgen.Queries, ls *loadedSession, who viewer) (*matchRequestDTO, error) {
	ownID, err := q.GetOwnLiveEntry(ctx, sqlcgen.GetOwnLiveEntryParams{SessionID: ls.row.ID, PlayerID: who.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	requests, err := q.ListOpenMatchRequests(ctx, ls.row.ID)
	if err != nil {
		return nil, err
	}
	spots, err := q.ListOpenMatchRequestSpots(ctx, ls.row.ID)
	if err != nil {
		return nil, err
	}
	present := map[pgtype.UUID]bool{}
	for _, e := range ls.roster {
		if e.Present {
			present[e.ID] = true
		}
	}
	for _, req := range requests {
		// Everyone the request names (the requester and every picked spot) is still present: otherwise it is stale.
		stale := !present[req.SessionPlayerID]
		var mine []sqlcgen.ListOpenMatchRequestSpotsRow
		for _, sp := range spots {
			if sp.RequestID != req.ID {
				continue
			}
			mine = append(mine, sp)
			if sp.SessionPlayerID.Valid && !present[sp.SessionPlayerID] {
				stale = true
			}
		}
		if stale || req.SessionPlayerID != ownID {
			continue
		}
		people, err := peopleFor(ctx, q, ls.roster, who.ID)
		if err != nil {
			return nil, err
		}
		byID := map[pgtype.UUID]sqlcgen.ListSessionRosterRowsRow{}
		for _, e := range ls.roster {
			byID[e.ID] = e
		}
		face := func(id pgtype.UUID) *faceDTO {
			if !id.Valid {
				return nil
			}
			p, ok := people[id]
			f := faceDTO{Name: publicreads.PublicFirstName(""), Masked: true}
			if ok {
				f = faceDTO{Name: publicreads.PublicFirstName(p.name), PictureURL: p.pictureURL, Masked: p.masked, IsViewer: p.isViewer}
			}
			if e, found := byID[id]; found {
				f.Level = levelOf(e.SkillLevelID)
			}
			return &f
		}
		side := func(name string) []*faceDTO {
			var rows []sqlcgen.ListOpenMatchRequestSpotsRow
			for _, sp := range mine {
				if sp.Side == name {
					rows = append(rows, sp)
				}
			}
			sort.SliceStable(rows, func(a, b int) bool { return rows[a].SlotNo < rows[b].SlotNo })
			out := make([]*faceDTO, 0, len(rows))
			for _, sp := range rows {
				out = append(out, face(sp.SessionPlayerID))
			}
			return out
		}
		return &matchRequestDTO{
			ID: req.ID.String(), Format: req.Format, At: httpapi.ToIso(req.RequestedAt.Time),
			Partners: side("partner"), Opponents: side("opponent"),
		}, nil
	}
	return nil, nil
}

// requestFormatOrder is REQUEST_FORMAT_ORDER: the six Request a match pills, 2 v 2 first.
var requestFormatOrder = []string{"doubles", "singles", "fun_1v2", "fun_3v3", "fun_4v4", "fun_5v5"}

type requestPlayerDTO struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	ShortName  string  `json:"shortName"`
	PictureURL *string `json:"pictureUrl"`
	Level      *string `json:"level"`
	Games      int     `json:"games"`
	PlayingOn  *string `json:"playingOn"`
	RestMin    int64   `json:"restMinutes"`
}

type requestOptionsDTO struct {
	ViewerRosterID string             `json:"viewerRosterId"`
	ViewerPicture  *string            `json:"viewerPictureUrl"`
	Minimum        int32              `json:"minimum"`
	AllowedFormats []string           `json:"allowedFormats"`
	Players        []requestPlayerDTO `json:"players"`
}

// readMatchRequestOptions is readMatchRequestOptions (Q17.14): the allowed formats in pill order, the minimum, and the
// present players other than the viewer with games, level, court and waiting time. Only a Player on the session's
// roster may read it.
func (s *server) readMatchRequestOptions(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
	ctx := r.Context()
	ls, err := loadSession(ctx, q, r.PathValue("slug"))
	if err != nil {
		return nil, err
	}
	ownID, err := q.GetOwnLiveEntry(ctx, sqlcgen.GetOwnLiveEntryParams{SessionID: ls.row.ID, PlayerID: who.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, &serviceError{code: httpapi.ErrForbidden, fields: map[string]string{"player": "Only confirmed players in this session can do this."}}
	}
	if err != nil {
		return nil, err
	}
	people, err := peopleFor(ctx, q, ls.roster, who.ID)
	if err != nil {
		return nil, err
	}
	now := s.now().UnixMilli()
	out := requestOptionsDTO{
		ViewerRosterID: ownID.String(), ViewerPicture: people[ownID].pictureURL, Minimum: ls.row.MinimumGames,
		AllowedFormats: []string{}, Players: []requestPlayerDTO{},
	}
	for _, f := range requestFormatOrder {
		if slices.Contains(ls.row.RequestFormats, f) {
			out.AllowedFormats = append(out.AllowedFormats, f)
		}
	}
	for i, p := range ls.rules {
		entry := ls.roster[i]
		if !p.Present || entry.ID == ownID {
			continue
		}
		person, ok := people[entry.ID]
		name := publicreads.MaskPublicName(p.NameSnapshot)
		var nick *string
		if ok {
			name, nick = person.name, person.nickname
		}
		short := publicreads.PublicFirstName(name)
		if nick != nil && *nick != "" {
			short = *nick
		}
		row := requestPlayerDTO{
			ID: p.ID, Name: name, ShortName: short, Level: p.Level, Games: match.CountedGames(p.ID, ls.matches),
			RestMin: match.WaitMinutes(p, ls.matches, msPtr(ls.row.StartedAt), now),
		}
		if ok {
			row.PictureURL = person.pictureURL
		}
		for _, m := range ls.matches {
			if m.HoldsCourt() && slices.Contains(m.AllPlayers(), p.ID) {
				label := courtNames(m, ls.courts)
				row.PlayingOn = &label
				break
			}
		}
		out.Players = append(out.Players, row)
	}
	return out, nil
}

// readMyMatchRequest is the body of GET /api/public-sessions/{slug}/match-request: { matchRequest }.
func (s *server) readMyMatchRequest(r *http.Request, q *sqlcgen.Queries, who viewer) (any, error) {
	ls, err := loadSession(r.Context(), q, r.PathValue("slug"))
	if err != nil {
		return nil, err
	}
	req, err := readOpenMatchRequest(r.Context(), q, ls, who)
	if err != nil {
		return nil, err
	}
	return struct {
		MatchRequest *matchRequestDTO `json:"matchRequest"`
	}{req}, nil
}
