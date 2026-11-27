package claim

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/profile"
)

// The body of the read: { link: { status, clubName, preview, preset } } (readClaimLink, claim.ts).
type linkBody struct {
	Link linkView `json:"link"`
}

type linkView struct {
	Status   string      `json:"status"`
	ClubName string      `json:"clubName"`
	Preview  linkPreview `json:"preview"`
	Preset   linkPreset  `json:"preset"`
}

// linkPreview is the public identity: nothing the player set, since the profile is unclaimed.
type linkPreview struct {
	PlayerID *string `json:"playerId"`
	FullName string  `json:"fullName"`
	Nickname *string `json:"nickname"`
	RTRID    *string `json:"rtrId"`
	Picture  *string `json:"picture"`
	// PictureSeedID is only on a record link: the entry or record the picture is drawn from.
	PictureSeedID *string `json:"pictureSeedId,omitempty"`
	MaskedPhone   string  `json:"maskedPhone"`
}

// linkPreset is the registration form's starting values, as text the way the form holds them.
type linkPreset struct {
	FullName         string `json:"fullName"`
	Nickname         string `json:"nickname"`
	Email            string `json:"email"`
	PlayingStyle     string `json:"playingStyle"`
	ExperienceYears  string `json:"experienceYears"`
	ExperienceMonths string `json:"experienceMonths"`
	Facebook         string `json:"facebook"`
	Instagram        string `json:"instagram"`
	YouTube          string `json:"youtube"`
	LinkedIn         string `json:"linkedin"`
}

// getLink is GET /api/claim/{token}: the public identity, a masked phone and what the club entered for the form.
// Unknown or revoked is 404 (the page shows it as expired); so is a removed club record, and a player link whose
// player has no RTR ID yet.
func (h *handlers) getLink(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	digest := digestOf(r.PathValue("token"))
	var out *linkView
	err := readTx(ctx, h.pool, func(q *sqlcgen.Queries) error {
		l, err := findLink(ctx, q, digest)
		if err != nil || l == nil || l.state() == sqlcgen.PlayerClaimLinkStateRevoked {
			return err
		}
		now := h.now()
		switch {
		case l.record != nil:
			out = l.record.view(now)
		default:
			links, err := q.ListPlayerSocialLinks(ctx, l.player.PlayerID)
			if err != nil {
				return err
			}
			out = l.player.view(now, links)
		}
		return nil
	})
	if err != nil {
		h.log.ErrorContext(ctx, "reading a claim link failed", "request_id", httpapi.RequestIDFrom(ctx), "error", err.Error())
		httpapi.WriteInternal(w)
		return
	}
	if out == nil {
		httpapi.WriteError(w, httpapi.ErrNotFound, nil)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, linkBody{Link: *out}, httpapi.Private)
}

// status is the three-way state the page shows. A used link, or a profile already registered, is "claimed" even
// after the link would have expired; expires_at <= now is "expired".
func status(claimed bool, expiresAt, now time.Time) string {
	switch {
	case claimed:
		return "claimed"
	case !expiresAt.After(now):
		return "expired"
	}
	return "valid"
}

func (l *recordLink) view(now time.Time) *linkView {
	if l.RemovedAt.Valid {
		return nil
	}
	claimed := l.State == sqlcgen.PlayerClaimLinkStateConsumed || l.PlayerID.Valid
	v := &linkView{
		Status:   status(claimed, l.ExpiresAt.Time, now),
		ClubName: l.ClubName,
		Preview: linkPreview{
			FullName: l.DisplayName, Nickname: text(l.Nickname),
			// Saved with an email: the RTR ID the person keeps (D-2026-11-16-04); else none yet. The picture the club set
			// (D-2026-11-09-12), drawn as on its Saved players card.
			RTRID: text(l.SharedEntryRtrID), Picture: text(l.AvatarRef),
			MaskedPhone: maskedPhone(l.InputPhone),
		},
		// recordPresetOf: the club typed only a name, a nickname and an email; the email of the record's shared entry comes first
		// (BL-14: sharedEntry?.email ?? privateInput?.email).
		Preset: linkPreset{FullName: l.DisplayName, Nickname: orEmpty(l.Nickname), Email: firstEmail(l.SharedEntryEmail, l.InputEmail)},
	}
	if l.PlayerID.Valid {
		id := uuidOf(l.PlayerID).String()
		v.Preview.PlayerID = &id
	}
	seed := uuidOf(l.ClubPlayerID).String()
	if l.SharedEntryID.Valid {
		seed = uuidOf(l.SharedEntryID).String()
	}
	v.Preview.PictureSeedID = &seed
	return v
}

func (l *playerLink) view(now time.Time, links []sqlcgen.ListPlayerSocialLinksRow) *linkView {
	if !l.RtrID.Valid {
		return nil
	}
	claimed := l.State == sqlcgen.PlayerClaimLinkStateConsumed || l.ProfileState == sqlcgen.PlayerProfileStateClaimed
	id := uuidOf(l.PlayerID).String()
	v := &linkView{
		Status:   status(claimed, l.ExpiresAt.Time, now),
		ClubName: l.ClubName,
		Preview: linkPreview{
			PlayerID: &id, FullName: l.FullName, Nickname: text(l.Nickname), RTRID: text(l.RtrID),
			Picture: text(l.AvatarRef), MaskedPhone: maskedPhone(l.ContactPhone),
		},
		Preset: linkPreset{
			FullName: l.FullName, Nickname: orEmpty(l.Nickname), Email: orEmpty(l.ContactEmail),
			PlayingStyle: playingStyle(l.PersonalDetails),
		},
	}
	var months *int32
	if l.ExperienceMonths.Valid {
		months = &l.ExperienceMonths.Int32
	}
	var recorded *time.Time
	if l.ExperienceRecordedAt.Valid {
		recorded = &l.ExperienceRecordedAt.Time
	}
	if m := profile.CurrentExperienceMonths(months, recorded, now); m != nil {
		v.Preset.ExperienceYears = strconv.Itoa(int(*m / 12))
		v.Preset.ExperienceMonths = strconv.Itoa(int(*m % 12))
	}
	for _, link := range links {
		switch link.Provider {
		case sqlcgen.SocialProviderFacebook:
			v.Preset.Facebook = link.Url
		case sqlcgen.SocialProviderInstagram:
			v.Preset.Instagram = link.Url
		case sqlcgen.SocialProviderYoutube:
			v.Preset.YouTube = link.Url
		case sqlcgen.SocialProviderLinkedin:
			v.Preset.LinkedIn = link.Url
		}
	}
	return v
}

// firstEmail is `a ?? b` over two nullable emails.
func firstEmail(a, b pgtype.Text) string {
	if a.Valid {
		return a.String
	}
	return orEmpty(b)
}

func maskedPhone(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return fields.MaskPhone(t.String)
}

// playingStyle is playingStyle() in profile.ts: personal_details.playingStyle when it is a string, else ”.
func playingStyle(details []byte) string {
	var m map[string]json.RawMessage
	if json.Unmarshal(details, &m) != nil {
		return ""
	}
	var s string
	if json.Unmarshal(m["playingStyle"], &s) != nil {
		return ""
	}
	return s
}
