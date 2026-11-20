package queuewrites

import (
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// This file ports the player notifications the roster writes send: writePlayerNotifications, notifySpotConfirmed,
// notifyWaitlistPlace and notifySavedPlayer in packages/db/src/player/notification-events.ts.

// manila is Asia/Manila, where the club's times are shown. It has no daylight saving, so a fixed +08:00 zone is exact.
var manila = time.FixedZone("Asia/Manila", 8*60*60)

type notification struct {
	playerID   pgtype.UUID
	kind       sqlcgen.PlayerNotificationKind
	sourceType string
	sourceID   pgtype.UUID
	title      string
	body       string
	target     string
}

// notify is writePlayerNotifications for one event: a guest or unclaimed profile has no inbox, and a repeat of the same
// source writes nothing.
func (t *txn) notify(n notification) error {
	id, err := newestID()
	if err != nil {
		return err
	}
	return t.q.InsertSessionNotification(t.ctx, sqlcgen.InsertSessionNotificationParams{
		ID: id, Kind: n.kind, Title: n.title, Body: n.body, Target: n.target,
		SourceType: pgtype.Text{String: n.sourceType, Valid: true}, SourceID: n.sourceID, Now: t.stamp(), PlayerID: n.playerID,
	})
}

// notifySpotConfirmed tells a registered player the club confirmed their spot.
func (t *txn) notifySpotConfirmed(playerID, assessmentID pgtype.UUID) error {
	if !playerID.Valid {
		return nil
	}
	club, err := t.q.GetClubName(t.ctx, t.club)
	if err != nil {
		return err
	}
	sess := t.sess
	return t.notify(notification{
		playerID: playerID, kind: sqlcgen.PlayerNotificationKindSession, sourceType: "club_assessment", sourceID: assessmentID,
		title:  "You're in " + sess.Title,
		body:   fmt.Sprintf("%s confirmed your spot. %s · %s.", club, sessionDay(sess.ScheduledStartAt.Time), sessionHours(sess.ScheduledStartAt.Time, sess.ScheduledEndAt.Time)),
		target: "/players/" + playerID.String() + "/sessions",
	})
}

// notifyWaitlistPlace tells a registered player their place on the waitlist.
func (t *txn) notifyWaitlistPlace(playerID, waitlistID pgtype.UUID, position int) error {
	if !playerID.Valid {
		return nil
	}
	return t.notify(notification{
		playerID: playerID, kind: sqlcgen.PlayerNotificationKindSession, sourceType: "session_waitlist_entry", sourceID: waitlistID,
		title:  "You're on the waitlist for " + t.sess.Title,
		body:   fmt.Sprintf("You're number %d. We'll tell you if a spot opens.", position),
		target: "/players/" + playerID.String() + "/sessions",
	})
}

// notifySavedPlayer tells a registered player a club saved them.
func (t *txn) notifySavedPlayer(playerID, operationID pgtype.UUID) error {
	club, err := t.q.GetClubName(t.ctx, t.club)
	if err != nil {
		return err
	}
	return t.notify(notification{
		playerID: playerID, kind: sqlcgen.PlayerNotificationKindClub, sourceType: "club_player_add", sourceID: operationID,
		title:  club + " added you",
		body:   "You're in the club's saved players. You can leave from the club page.",
		target: "/clubs/" + t.club.String(),
	})
}

// sessionDay is the short weekday of the start in Manila (Intl weekday "short", en-US).
func sessionDay(start time.Time) string { return start.In(manila).Weekday().String()[:3] }

// clock12 is the time as Intl's en-US hour numeric, minute 2-digit shows it, split into the clock and the period.
func clock12(t time.Time) (clock, period string) {
	t = t.In(manila)
	h := t.Hour() % 12
	if h == 0 {
		h = 12
	}
	period = "AM"
	if t.Hour() >= 12 {
		period = "PM"
	}
	return fmt.Sprintf("%d:%02d", h, t.Minute()), period
}

// sessionHours is the session's hours as notifySpotConfirmed words them: Intl's formatRange of the two times in Manila with
// the spaces around the dash removed and every space made a plain one. The same instant is one time; the same day shares
// the period ("9:00–11:30 AM") unless it changes ("9:00 AM–1:00 PM"); another day shows both dates ("11/19/2026, 6:00 PM–
// 11/20/2026, 2:00 AM").
func sessionHours(start, end time.Time) string {
	s, e := start.In(manila), end.In(manila)
	sc, sp := clock12(s)
	ec, ep := clock12(e)
	switch {
	case s.UnixMilli() == e.UnixMilli():
		return sc + " " + sp
	case s.Year() == e.Year() && s.YearDay() == e.YearDay():
		if sp == ep {
			return sc + "–" + ec + " " + ep
		}
		return sc + " " + sp + "–" + ec + " " + ep
	}
	date := func(t time.Time) string { return fmt.Sprintf("%d/%d/%d", int(t.Month()), t.Day(), t.Year()) }
	return date(s) + ", " + sc + " " + sp + "–" + date(e) + ", " + ec + " " + ep
}
