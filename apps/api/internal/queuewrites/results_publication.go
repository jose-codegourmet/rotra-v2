package queuewrites

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Publish results (packages/db/src/queue/results.ts publishResults, POST results/publication). The public page reads only the copy this
// builds from an allowlist of the private snapshot. The snapshot itself is written by the finalization drive (finalization_snapshot.go).

func (s *server) registerResultsPublication(rt *signedin.Router) {
	rt.Handle("POST /api/sessions/{sessionId}/results/publication", store.AudienceClub, s.club(s.publishResults))
}

type publishAnswer struct {
	Slides        []string `json:"slides"`
	IncludeOffDay bool     `json:"includeOffDay"`
	PublishedAt   string   `json:"publishedAt"`
}

// validSlides is validSlides: the distinct slides in the order given, standings and awards only; Off Day goes with awards.
func validSlides(in []string, includeOffDay bool) ([]string, error) {
	unique := []string{}
	for _, s := range in {
		if !slices.Contains(unique, s) {
			unique = append(unique, s)
		}
	}
	if len(unique) == 0 || slices.ContainsFunc(unique, func(s string) bool { return s != "standings" && s != "awards" }) {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"slides": "Choose standings, awards or both."})
	}
	if includeOffDay && !slices.Contains(unique, "awards") {
		return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"offDay": "Off Day goes with the awards slide."})
	}
	return unique, nil
}

// decodeJSON reads stored JSON keeping the numbers as written.
func decodeJSON(raw []byte, into any) error {
	if len(raw) == 0 {
		return nil
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	return dec.Decode(into)
}

// pick is the allowlisted fields of one stored object; a field the object lacks is left out, as JSON.stringify leaves out undefined.
func pick(from map[string]any, keys ...string) map[string]any {
	out := map[string]any{}
	for _, k := range keys {
		if v, ok := from[k]; ok {
			out[k] = v
		}
	}
	return out
}

// publicCopy is publicCopy: names and counts only.
func publicCopy(standings, awards, offDay []byte, slides []string, includeOffDay bool) ([]byte, error) {
	out := map[string]any{}
	if slices.Contains(slides, "standings") {
		var rows []map[string]any
		if err := decodeJSON(standings, &rows); err != nil {
			return nil, err
		}
		list := make([]map[string]any, len(rows))
		for i, r := range rows {
			list[i] = pick(r, "position", "name", "wins", "losses", "games")
		}
		out["standings"] = list
	}
	if slices.Contains(slides, "awards") {
		var a map[string]any
		if err := decodeJSON(awards, &a); err != nil {
			return nil, err
		}
		copyOf := map[string]any{"mvp": nil, "mostImproved": nil}
		if mvp, ok := a["mvp"].(map[string]any); ok {
			copyOf["mvp"] = pick(mvp, "name")
		}
		if mi, ok := a["mostImproved"].(map[string]any); ok {
			copyOf["mostImproved"] = pick(mi, "name", "priorSessions")
		}
		out["awards"] = copyOf
	}
	if includeOffDay {
		var rows []map[string]any
		if err := decodeJSON(offDay, &rows); err != nil {
			return nil, err
		}
		list := make([]map[string]any, len(rows))
		for i, r := range rows {
			list[i] = pick(r, "name", "priorSessions")
		}
		out["offDay"] = list
	}
	return json.Marshal(out)
}

// publishResults is POST results/publication, Q-PUBLISH Publish / Publish again, keyed on commandId. Each publish replaces the selection and
// needs a fresh, explicit Off Day choice (absent is excluded), appends a consent event, and never touches facts or the snapshot. No database
// error is mapped, as in the TypeScript.
func (s *server) publishResults(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	includeOffDay, _ := body["includeOffDay"].(bool)
	slides, err := validSlides(textList(body, "slides"), includeOffDay)
	if err != nil {
		return writes.Result{}, err
	}
	commandText := body.Text("commandId")
	out, err := s.inSession(r.Context(), club, r.PathValue("sessionId"), func(t *txn) (any, error) {
		command, err := parseOperationID(commandText)
		if err != nil {
			return nil, err
		}
		done, err := t.q.GetPublicationEventByCommand(t.ctx, command)
		if err == nil {
			if done.SessionID != t.sess.ID {
				return nil, writes.Fail(httpapi.ErrConflict, nil)
			}
			return publishAnswer{Slides: done.Slides, IncludeOffDay: done.IncludeOffDay, PublishedAt: httpapi.ToIso(done.OccurredAt.Time)}, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if t.sess.State != sqlcgen.QueueSessionStateCompleted {
			return nil, writes.Fail(httpapi.ErrInvalid, map[string]string{"state": "Finish the session before publishing results."})
		}
		snapshot, err := t.q.GetQueueLatestSnapshot(t.ctx, t.sess.ID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, writes.Fail(httpapi.ErrUnavailable, map[string]string{"results": "Results are still being prepared."})
		}
		if err != nil {
			return nil, err
		}
		return t.publish(command, snapshot, slides, includeOffDay)
	})
	return writes.Result{Body: out}, err
}

func (t *txn) publish(command pgtype.UUID, snapshot sqlcgen.GetQueueLatestSnapshotRow, slides []string, includeOffDay bool) (any, error) {
	now := t.stamp()
	publication, err := t.q.GetPublicationOfSession(t.ctx, t.sess.ID)
	exists := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if exists && publication.State == "deleted" {
		return nil, writes.Fail(httpapi.ErrForbidden, map[string]string{"publication": "This public page was removed."})
	}
	cycle, err := t.q.GetClubExpiryCycle(t.ctx, t.club)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	publicationID := publication.ID
	if !exists {
		if publicationID, err = newestID(); err != nil {
			return nil, err
		}
		if err := t.createPublication(publicationID, cycle, now); err != nil {
			return nil, err
		}
	}
	results, err := publicCopy(snapshot.Standings, snapshot.Awards, snapshot.OffDay, slides, includeOffDay)
	if err != nil {
		return nil, err
	}
	if err := t.q.PublishSessionPublication(t.ctx, sqlcgen.PublishSessionPublicationParams{
		PublishedSnapshotID: snapshot.ID, PublishedSlides: slides, IncludeOffDay: includeOffDay, PublicResults: results, Now: now, ID: publicationID,
	}); err != nil {
		return nil, err
	}
	eventID, err := newestID()
	if err != nil {
		return nil, err
	}
	if err := t.q.InsertPublicationEvent(t.ctx, sqlcgen.InsertPublicationEventParams{
		ID: eventID, ClubID: t.club, SessionID: t.sess.ID, PublicationID: publicationID, SnapshotID: snapshot.ID, Slides: slides,
		IncludeOffDay: includeOffDay, ActorClubID: t.club, SourceCommandID: command, Now: now,
	}); err != nil {
		return nil, err
	}
	if err := t.notifyResults(eventID); err != nil {
		return nil, err
	}
	return publishAnswer{Slides: slides, IncludeOffDay: includeOffDay, PublishedAt: httpapi.ToIso(now.Time)}, nil
}

// createPublication makes the publication row on first publish: the public key and the allowlisted Details and Participants copies.
func (t *txn) createPublication(id, cycle pgtype.UUID, now pgtype.Timestamptz) error {
	roster, err := t.q.ListRosterForPublication(t.ctx, t.sess.ID)
	if err != nil {
		return err
	}
	people := make([]map[string]any, len(roster))
	for i, r := range roster {
		var picture any
		if r.AvatarRef.Valid {
			picture = r.AvatarRef.String
		}
		people[i] = map[string]any{"name": r.NameSnapshot, "pictureUrl": picture, "hasRotraProfile": r.PlayerIDAtEntry.Valid}
	}
	var address any
	if t.sess.VenueAddress.Valid {
		address = t.sess.VenueAddress.String
	}
	details := map[string]any{
		"title": t.sess.Title, "start": t.sess.ScheduledStartAt.Time.UnixMilli(), "end": t.sess.ScheduledEndAt.Time.UnixMilli(),
		"venue": map[string]any{"name": t.sess.VenueName.String, "address": address}, "minimum": t.sess.MinimumGames,
	}
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		return err
	}
	peopleJSON, err := json.Marshal(people)
	if err != nil {
		return err
	}
	key := make([]byte, 18)
	if _, err := rand.Read(key); err != nil {
		return err
	}
	return t.q.InsertSessionPublication(t.ctx, sqlcgen.InsertSessionPublicationParams{
		ID: id, ClubID: t.club, SessionID: t.sess.ID, PublicKey: base64.RawURLEncoding.EncodeToString(key),
		DetailsProjection: detailsJSON, ParticipantsProjection: peopleJSON, ExpiryCycleID: cycle, Now: now,
	})
}

// notifyResults tells every registered player who played, and every player a confirmed history attribution links to, that results are up.
func (t *txn) notifyResults(eventID pgtype.UUID) error {
	summaries, err := t.q.ListPublicationSummaries(t.ctx, t.sess.ID)
	if err != nil {
		return err
	}
	clubPlayers := make([]pgtype.UUID, len(summaries))
	for i, s := range summaries {
		clubPlayers[i] = s.ClubPlayerID
	}
	links, err := t.q.ListHistoryAttributionPlayers(t.ctx, sqlcgen.ListHistoryAttributionPlayersParams{ClubID: t.club, ClubPlayerIds: clubPlayers})
	if err != nil {
		return err
	}
	var order []pgtype.UUID
	games := map[pgtype.UUID]int32{}
	for _, row := range summaries {
		recipients := map[pgtype.UUID]bool{}
		for _, l := range links {
			if l.ClubPlayerID == row.ClubPlayerID {
				recipients[l.PlayerID] = true
			}
		}
		if row.PlayerIDSnapshot.Valid {
			recipients[row.PlayerIDSnapshot] = true
		}
		ids := make([]pgtype.UUID, 0, len(recipients))
		for id := range recipients {
			ids = append(ids, id)
		}
		slices.SortFunc(ids, func(a, b pgtype.UUID) int { return bytes.Compare(a.Bytes[:], b.Bytes[:]) })
		for _, id := range ids {
			if _, seen := games[id]; !seen {
				order = append(order, id)
			}
			games[id] += row.FullGames
		}
	}
	for _, id := range order {
		count := games[id]
		word := "games"
		if count == 1 {
			word = "game"
		}
		if err := t.notify(notification{
			playerID: id, kind: sqlcgen.PlayerNotificationKindSession, sourceType: "session_publication_event", sourceID: eventID,
			title: "Results are up for " + t.sess.Title, body: fmt.Sprintf("You played %d %s. See how they counted.", count, word), target: "/players/" + id.String() + "/games",
		}); err != nil {
			return err
		}
	}
	return nil
}
