package adminwrites

import (
	"context"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/profilebanner"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/profilecharacter"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Profile library writes: show and hide, delete, restore and (banners only) make default. Ports of
// apps/admin/src/app/api/profile-banners/** and profile-characters/** and of packages/db/src/admin/
// profile-banners.ts and profile-characters.ts. The two upload routes (POST /api/profile-banners and
// POST /api/profile-characters) are not here: they send a picture to Storage and belong to the pictures track.
// The list reads and the picker reads are signedin's.
//
// Each write takes the library's advisory lock first (the TypeScript's key), so the minimum-shown rule and the
// default never race. None has a revision: the answer is the row as it is after the write.

func (s *server) registerProfiles(rt *signedin.Router) {
	rt.Handle("PATCH /api/profile-banners/{id}", store.AudienceAdmin, s.admin(s.setBannerShown))
	rt.Handle("DELETE /api/profile-banners/{id}", store.AudienceAdmin, s.admin(s.deleteBanner))
	rt.Handle("POST /api/profile-banners/{id}/restore", store.AudienceAdmin, s.admin(s.restoreBanner))
	rt.Handle("POST /api/profile-banners/{id}/default", store.AudienceAdmin, s.admin(s.makeBannerDefault))
	rt.Handle("PATCH /api/profile-characters/{id}", store.AudienceAdmin, s.admin(s.setCharacterShown))
	rt.Handle("DELETE /api/profile-characters/{id}", store.AudienceAdmin, s.admin(s.deleteCharacter))
	rt.Handle("POST /api/profile-characters/{id}/restore", store.AudienceAdmin, s.admin(s.restoreCharacter))
}

// ---- banners ----

// bannerDTO is the wire row of ProfileBannerDto.
type bannerDTO struct {
	ID         string `json:"id"`
	Image      string `json:"image"`
	Shown      bool   `json:"shown"`
	UploadedAt string `json:"uploadedAt"`
	Number     int32  `json:"number"`
	IsDefault  bool   `json:"isDefault"`
}

func toBanner(b sqlcgen.ProfileBanner) bannerDTO {
	return bannerDTO{ID: b.ID, Image: b.Image, Shown: b.Shown, UploadedAt: httpapi.ToIso(b.UploadedAt.Time), Number: b.Number, IsDefault: b.IsDefault}
}

type bannerBody struct {
	Banner bannerDTO `json:"banner"`
}

func bannerMissing() *writes.Error {
	return writes.Fail(httpapi.ErrConflict, map[string]string{"banner": profilebanner.Missing})
}

func bannerRefusal(text string) *writes.Error {
	return writes.Fail(httpapi.ErrConflict, map[string]string{"banner": text})
}

// bannerAudit records one banner event; the metadata carries the banner's number.
func (s *server) bannerAudit(ctx context.Context, q *sqlcgen.Queries, admin pgtype.UUID, action string, b sqlcgen.ProfileBanner, extra map[string]any) error {
	meta := map[string]any{"number": b.Number}
	for k, v := range extra {
		meta[k] = v
	}
	return s.recordAudit(ctx, q, admin.Bytes, auditEvent{Action: action, TargetType: "profile_banner", TargetID: b.ID, Metadata: meta})
}

// liveBanner is `current`: a banner that is in the library now (valid id, there, not deleted), read under the lock.
func liveBanner(ctx context.Context, q *sqlcgen.Queries, id string) (sqlcgen.ProfileBanner, error) {
	if !profilebanner.ValidID(id) {
		return sqlcgen.ProfileBanner{}, bannerMissing()
	}
	row, err := q.GetProfileBanner(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return sqlcgen.ProfileBanner{}, bannerMissing()
	}
	if err != nil {
		return sqlcgen.ProfileBanner{}, err
	}
	if row.DeletedAt.Valid {
		return sqlcgen.ProfileBanner{}, bannerMissing()
	}
	return row, nil
}

// inBannerTx runs fn in the write transaction with the banner lock held.
func (s *server) inBannerTx(r *http.Request, fn func(ctx context.Context, q *sqlcgen.Queries) error) error {
	return writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if err := q.LockProfileBanners(ctx); err != nil {
			return err
		}
		return fn(ctx, q)
	})
}

// setBannerShown is PATCH /api/profile-banners/{id} and setProfileBannerShown. The order is the TypeScript's: the
// JSON body, `shown` must be a boolean (`invalid`), then under the lock the banner (missing is a `conflict`), the
// no-op (the value it has: nothing written, nothing recorded), the default (never hidden), and the minimum shown.
func (s *server) setBannerShown(r *http.Request, p session.Principal) (writes.Result, error) {
	id := r.PathValue("id")
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	shown, isBool := body.Bool("shown")
	if !isBool {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	var out sqlcgen.ProfileBanner
	err = s.inBannerTx(r, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := liveBanner(ctx, q, id)
		if err != nil {
			return err
		}
		if row.Shown == shown {
			out = row
			return nil
		}
		if !shown && row.IsDefault {
			return bannerRefusal(profilebanner.DefaultRefusal)
		}
		if !shown {
			n, err := q.CountShownProfileBanners(ctx)
			if err != nil {
				return err
			}
			if profilebanner.BelowMinimum(true, int(n)) {
				return bannerRefusal(profilebanner.HideRefusal)
			}
		}
		if out, err = q.SetProfileBannerShown(ctx, sqlcgen.SetProfileBannerShownParams{ID: row.ID, Shown: shown}); err != nil {
			return err
		}
		action := "profile_banner.hidden"
		if shown {
			action = "profile_banner.shown"
		}
		return s.bannerAudit(ctx, q, pgtype.UUID{Bytes: p.AccountID, Valid: true}, action, out, nil)
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: bannerBody{toBanner(out)}}, nil
}

// deleteBanner is DELETE /api/profile-banners/{id} and deleteProfileBanner: a soft delete. The default never goes
// (checked first); a shown banner goes only above the minimum; a hidden one always goes. The row stays, so players
// who use it keep it, and restore brings it back.
func (s *server) deleteBanner(r *http.Request, p session.Principal) (writes.Result, error) {
	id := r.PathValue("id")
	var out sqlcgen.ProfileBanner
	err := s.inBannerTx(r, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := liveBanner(ctx, q, id)
		if err != nil {
			return err
		}
		if row.IsDefault {
			return bannerRefusal(profilebanner.DefaultRefusal)
		}
		if row.Shown {
			n, err := q.CountShownProfileBanners(ctx)
			if err != nil {
				return err
			}
			if profilebanner.BelowMinimum(true, int(n)) {
				return bannerRefusal(profilebanner.DeleteRefusal)
			}
		}
		if out, err = q.SetProfileBannerDeletedAt(ctx, sqlcgen.SetProfileBannerDeletedAtParams{ID: row.ID, DeletedAt: s.stamp()}); err != nil {
			return err
		}
		return s.bannerAudit(ctx, q, pgtype.UUID{Bytes: p.AccountID, Valid: true}, "profile_banner.deleted", out, nil)
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: bannerBody{toBanner(out)}}, nil
}

// restoreBanner is POST /api/profile-banners/{id}/restore and restoreProfileBanner: the undo of a delete. The banner
// comes back with its old shown state, time and number. A banner that is not there is `conflict`, and so is one that
// is already back. The request body is not read.
func (s *server) restoreBanner(r *http.Request, p session.Principal) (writes.Result, error) {
	id := r.PathValue("id")
	var out sqlcgen.ProfileBanner
	err := s.inBannerTx(r, func(ctx context.Context, q *sqlcgen.Queries) error {
		if !profilebanner.ValidID(id) {
			return bannerMissing()
		}
		row, err := q.GetProfileBanner(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return bannerMissing()
		}
		if err != nil {
			return err
		}
		if !row.DeletedAt.Valid {
			return bannerRefusal(profilebanner.AlreadyBack)
		}
		if out, err = q.SetProfileBannerDeletedAt(ctx, sqlcgen.SetProfileBannerDeletedAtParams{ID: row.ID}); err != nil {
			return err
		}
		return s.bannerAudit(ctx, q, pgtype.UUID{Bytes: p.AccountID, Valid: true}, "profile_banner.restored", out, nil)
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: bannerBody{toBanner(out)}}, nil
}

// makeBannerDefault is POST /api/profile-banners/{id}/default and setDefaultProfileBanner (D-2026-11-13-03). The
// banner must be shown. The old default is cleared and the new one set in one transaction. The answer carries
// previousId, so the Admin app's Undo can make the old default the default again: Court when no row was marked. The
// banner that already is the default changes nothing (and the check that it is shown does not run).
func (s *server) makeBannerDefault(r *http.Request, p session.Principal) (writes.Result, error) {
	id := r.PathValue("id")
	type answer struct {
		Banner     bannerDTO `json:"banner"`
		PreviousID string    `json:"previousId"`
	}
	var out answer
	err := s.inBannerTx(r, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := liveBanner(ctx, q, id)
		if err != nil {
			return err
		}
		previous, err := q.GetDefaultProfileBanner(ctx)
		hasPrevious := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		previousID := profilebanner.DefaultID
		if hasPrevious {
			previousID = previous.ID
		}
		if row.IsDefault {
			out = answer{toBanner(row), row.ID}
			return nil
		}
		if !row.Shown {
			return bannerRefusal(profilebanner.DefaultHidden)
		}
		if err := q.ClearProfileBannerDefaults(ctx); err != nil {
			return err
		}
		saved, err := q.SetProfileBannerDefault(ctx, row.ID)
		if err != nil {
			return err
		}
		// The previous banner's number: the marked row's, else Court's row (hidden or deleted too), else none.
		var previousNumber any
		switch {
		case hasPrevious:
			previousNumber = previous.Number
		default:
			court, err := q.GetProfileBanner(ctx, profilebanner.DefaultID)
			switch {
			case err == nil:
				previousNumber = court.Number
			case !errors.Is(err, pgx.ErrNoRows):
				return err
			}
		}
		if err := s.bannerAudit(ctx, q, pgtype.UUID{Bytes: p.AccountID, Valid: true}, "profile_banner.default_set", saved,
			map[string]any{"previousId": previousID, "previousNumber": previousNumber}); err != nil {
			return err
		}
		out = answer{toBanner(saved), previousID}
		return nil
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: out}, nil
}

// ---- characters ----

// characterDTO is the wire row of ProfileCharacterDto.
type characterDTO struct {
	ID         string `json:"id"`
	Image      string `json:"image"`
	Shown      bool   `json:"shown"`
	UploadedAt string `json:"uploadedAt"`
	Number     int32  `json:"number"`
}

func toCharacter(c sqlcgen.ProfileCharacter) characterDTO {
	return characterDTO{ID: c.ID, Image: c.Image, Shown: c.Shown, UploadedAt: httpapi.ToIso(c.UploadedAt.Time), Number: c.Number}
}

type characterBody struct {
	Character characterDTO `json:"character"`
}

func characterRefusal(text string) *writes.Error {
	return writes.Fail(httpapi.ErrConflict, map[string]string{"character": text})
}

func (s *server) characterAudit(ctx context.Context, q *sqlcgen.Queries, admin pgtype.UUID, action string, c sqlcgen.ProfileCharacter) error {
	return s.recordAudit(ctx, q, admin.Bytes, auditEvent{
		Action: action, TargetType: "profile_character", TargetID: c.ID, Metadata: map[string]any{"number": c.Number},
	})
}

// liveCharacter is `current`: an image that is in the library now, read under the lock.
func liveCharacter(ctx context.Context, q *sqlcgen.Queries, id string) (sqlcgen.ProfileCharacter, error) {
	if !profilecharacter.ValidID(id) {
		return sqlcgen.ProfileCharacter{}, characterRefusal(profilecharacter.Missing)
	}
	row, err := q.GetProfileCharacter(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return sqlcgen.ProfileCharacter{}, characterRefusal(profilecharacter.Missing)
	}
	if err != nil {
		return sqlcgen.ProfileCharacter{}, err
	}
	if row.DeletedAt.Valid {
		return sqlcgen.ProfileCharacter{}, characterRefusal(profilecharacter.Missing)
	}
	return row, nil
}

func (s *server) inCharacterTx(r *http.Request, fn func(ctx context.Context, q *sqlcgen.Queries) error) error {
	return writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		if err := q.LockProfileCharacters(ctx); err != nil {
			return err
		}
		return fn(ctx, q)
	})
}

// characterID is the id the path names: the first seeded image's empty id travels as "_".
func characterID(r *http.Request) string { return profilecharacter.IDOfSegment(r.PathValue("id")) }

// setCharacterShown is PATCH /api/profile-characters/{id} and setProfileCharacterShown, in the order of
// setBannerShown, with no default and a minimum of 15 shown.
func (s *server) setCharacterShown(r *http.Request, p session.Principal) (writes.Result, error) {
	id := characterID(r)
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	shown, isBool := body.Bool("shown")
	if !isBool {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	var out sqlcgen.ProfileCharacter
	err = s.inCharacterTx(r, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := liveCharacter(ctx, q, id)
		if err != nil {
			return err
		}
		if row.Shown == shown {
			out = row
			return nil
		}
		if !shown {
			n, err := q.CountShownProfileCharacters(ctx)
			if err != nil {
				return err
			}
			if profilecharacter.BelowMinimum(true, int(n)) {
				return characterRefusal(profilecharacter.HideRefusal)
			}
		}
		if out, err = q.SetProfileCharacterShown(ctx, sqlcgen.SetProfileCharacterShownParams{ID: row.ID, Shown: shown}); err != nil {
			return err
		}
		action := "profile_character.hidden"
		if shown {
			action = "profile_character.shown"
		}
		return s.characterAudit(ctx, q, pgtype.UUID{Bytes: p.AccountID, Valid: true}, action, out)
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: characterBody{toCharacter(out)}}, nil
}

// deleteCharacter is DELETE /api/profile-characters/{id} and deleteProfileCharacter: a soft delete; a shown image
// goes only above the minimum, a hidden one always.
func (s *server) deleteCharacter(r *http.Request, p session.Principal) (writes.Result, error) {
	id := characterID(r)
	var out sqlcgen.ProfileCharacter
	err := s.inCharacterTx(r, func(ctx context.Context, q *sqlcgen.Queries) error {
		row, err := liveCharacter(ctx, q, id)
		if err != nil {
			return err
		}
		if row.Shown {
			n, err := q.CountShownProfileCharacters(ctx)
			if err != nil {
				return err
			}
			if profilecharacter.BelowMinimum(true, int(n)) {
				return characterRefusal(profilecharacter.DeleteRefusal)
			}
		}
		if out, err = q.SetProfileCharacterDeletedAt(ctx, sqlcgen.SetProfileCharacterDeletedAtParams{ID: row.ID, DeletedAt: s.stamp()}); err != nil {
			return err
		}
		return s.characterAudit(ctx, q, pgtype.UUID{Bytes: p.AccountID, Valid: true}, "profile_character.deleted", out)
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: characterBody{toCharacter(out)}}, nil
}

// restoreCharacter is POST /api/profile-characters/{id}/restore and restoreProfileCharacter. The request body is
// not read.
func (s *server) restoreCharacter(r *http.Request, p session.Principal) (writes.Result, error) {
	id := characterID(r)
	var out sqlcgen.ProfileCharacter
	err := s.inCharacterTx(r, func(ctx context.Context, q *sqlcgen.Queries) error {
		if !profilecharacter.ValidID(id) {
			return characterRefusal(profilecharacter.Missing)
		}
		row, err := q.GetProfileCharacter(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return characterRefusal(profilecharacter.Missing)
		}
		if err != nil {
			return err
		}
		if !row.DeletedAt.Valid {
			return characterRefusal(profilecharacter.AlreadyBack)
		}
		if out, err = q.SetProfileCharacterDeletedAt(ctx, sqlcgen.SetProfileCharacterDeletedAtParams{ID: row.ID}); err != nil {
			return err
		}
		return s.characterAudit(ctx, q, pgtype.UUID{Bytes: p.AccountID, Valid: true}, "profile_character.restored", out)
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: characterBody{toCharacter(out)}}, nil
}
