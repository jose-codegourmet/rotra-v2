package store_test

import (
	"bytes"
	"errors"
	"net/netip"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

func TestInsertAndGetSession(t *testing.T) {
	e := newEnv(t)
	ip := netip.MustParseAddr("203.0.113.9")
	ident := e.identity(t, store.AudienceClub, "sess-club")
	clubID := e.club(t, &ident.ID, true, nil)
	deviceID := uuid.New()
	if _, _, err := e.s.EnrollDevice(e.ctx, clubID, deviceID, "Front desk tablet", base); err != nil {
		t.Fatal(err)
	}
	exp := base.Add(30 * 24 * time.Hour)
	got, err := e.s.InsertSession(e.ctx, store.NewSession{
		IdentityID: ident.ID, Audience: store.AudienceClub, ClubID: &clubID, DeviceID: &deviceID,
		DeviceLabel: "Chrome on Android", RefreshDigest: dg(1), CreatedIP: &ip, Now: base, ExpiresAt: exp,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.ID.Version() != 7 || got.IdentityID != ident.ID || got.Audience != store.AudienceClub ||
		got.ClubID == nil || *got.ClubID != clubID || got.DeviceID == nil || *got.DeviceID != deviceID ||
		got.DeviceLabel != "Chrome on Android" || !bytes.Equal(got.RefreshDigest, dg(1)) ||
		got.PreviousRefreshDigest != nil || got.RefreshedAt != nil || got.Revoked() || got.RevokeReason != "" {
		t.Fatalf("unexpected session: %+v", got)
	}
	if got.CreatedIP == nil || *got.CreatedIP != ip || got.LastIP == nil || *got.LastIP != ip {
		t.Fatalf("ips: %v %v", got.CreatedIP, got.LastIP)
	}
	if !sameTime(got.LastSeenAt, base) || !sameTime(got.CreatedAt, base) || !sameTime(got.ExpiresAt, exp) {
		t.Fatalf("times: %+v", got)
	}
	again, err := e.s.GetSession(e.ctx, got.ID)
	if err != nil || again.ID != got.ID {
		t.Fatalf("get: %v", err)
	}
	if _, err := e.s.GetSession(e.ctx, uuid.New()); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("missing: %v", err)
	}
}

func TestInsertSessionNullsForPlayer(t *testing.T) {
	e := newEnv(t)
	_, s := e.playerSession(t, "pl@example.test", 2, base)
	if s.ClubID != nil || s.DeviceID != nil || s.CreatedIP != nil || s.LastIP != nil {
		t.Fatalf("player session must have no club, device or ip: %+v", s)
	}
}

func TestInsertSessionConstraints(t *testing.T) {
	e := newEnv(t)
	ident, clubID, _ := e.clubSession(t, "c1", 3)
	other := e.club(t, nil, false, nil)
	otherDevice := uuid.New()
	if _, _, err := e.s.EnrollDevice(e.ctx, other, otherDevice, "Other club tablet", base); err != nil {
		t.Fatal(err)
	}
	exp := base.Add(time.Hour)
	for name, in := range map[string]store.NewSession{
		"club audience without club":  {IdentityID: ident.ID, Audience: store.AudienceClub, DeviceLabel: "x", RefreshDigest: dg(10), Now: base, ExpiresAt: exp},
		"player audience with a club": {IdentityID: ident.ID, Audience: store.AudiencePlayer, ClubID: &clubID, DeviceLabel: "x", RefreshDigest: dg(11), Now: base, ExpiresAt: exp},
		"device of another club":      {IdentityID: ident.ID, Audience: store.AudienceClub, ClubID: &clubID, DeviceID: &otherDevice, DeviceLabel: "x", RefreshDigest: dg(12), Now: base, ExpiresAt: exp},
		"empty label":                 {IdentityID: ident.ID, Audience: store.AudienceClub, ClubID: &clubID, DeviceLabel: "", RefreshDigest: dg(13), Now: base, ExpiresAt: exp},
		"short digest":                {IdentityID: ident.ID, Audience: store.AudienceClub, ClubID: &clubID, DeviceLabel: "x", RefreshDigest: []byte{1, 2}, Now: base, ExpiresAt: exp},
		"duplicate digest":            {IdentityID: ident.ID, Audience: store.AudienceClub, ClubID: &clubID, DeviceLabel: "x", RefreshDigest: dg(3), Now: base, ExpiresAt: exp},
		"unknown identity":            {IdentityID: uuid.New(), Audience: store.AudienceClub, ClubID: &clubID, DeviceLabel: "x", RefreshDigest: dg(14), Now: base, ExpiresAt: exp},
	} {
		if _, err := e.s.InsertSession(e.ctx, in); err == nil {
			t.Errorf("%s: want a constraint error", name)
		}
	}
}

func TestRotateRefreshAndFinders(t *testing.T) {
	e := newEnv(t)
	_, s := e.playerSession(t, "rot@example.test", 4, base)
	ip := netip.MustParseAddr("2001:db8::1")
	at := base.Add(10 * time.Minute)
	newExp := at.Add(30 * 24 * time.Hour)
	if err := e.s.RotateRefresh(e.ctx, store.Rotation{ID: s.ID, NewDigest: dg(5), Now: at, ExpiresAt: &newExp, IP: &ip}); err != nil {
		t.Fatal(err)
	}
	got, _ := e.s.GetSession(e.ctx, s.ID)
	if !bytes.Equal(got.RefreshDigest, dg(5)) || !bytes.Equal(got.PreviousRefreshDigest, dg(4)) ||
		got.RefreshedAt == nil || !sameTime(*got.RefreshedAt, at) || !sameTime(got.LastSeenAt, at) ||
		!sameTime(got.ExpiresAt, newExp) || got.LastIP == nil || *got.LastIP != ip {
		t.Fatalf("rotated: %+v", got)
	}
	cur, err := e.s.FindSessionByRefreshDigest(e.ctx, dg(5))
	if err != nil || cur.ID != s.ID {
		t.Fatalf("by current digest: %v", err)
	}
	prev, err := e.s.FindSessionByPreviousDigest(e.ctx, dg(4))
	if err != nil || prev.ID != s.ID {
		t.Fatalf("by previous digest: %v", err)
	}
	if _, err := e.s.FindSessionByRefreshDigest(e.ctx, dg(4)); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("a retired digest is not the current one: %v", err)
	}
	if _, err := e.s.FindSessionByPreviousDigest(e.ctx, dg(99)); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("unknown digest: %v", err)
	}

	// Second rotation with no new expiry and no ip: both stay as they were, the previous digest moves on.
	if err := e.s.RotateRefresh(e.ctx, store.Rotation{ID: s.ID, NewDigest: dg(6), Now: at.Add(time.Minute)}); err != nil {
		t.Fatal(err)
	}
	got, _ = e.s.GetSession(e.ctx, s.ID)
	if !sameTime(got.ExpiresAt, newExp) || *got.LastIP != ip || !bytes.Equal(got.PreviousRefreshDigest, dg(5)) {
		t.Fatalf("second rotation: %+v", got)
	}
}

func TestRotateRefreshRefusesInactiveSessions(t *testing.T) {
	e := newEnv(t)
	_, s := e.playerSession(t, "gone@example.test", 7, base)
	if err := e.s.RotateRefresh(e.ctx, store.Rotation{ID: uuid.New(), NewDigest: dg(8), Now: base}); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("missing: %v", err)
	}
	if _, err := e.s.RevokeSession(e.ctx, s.ID, store.ReasonSignOut, base); err != nil {
		t.Fatal(err)
	}
	if err := e.s.RotateRefresh(e.ctx, store.Rotation{ID: s.ID, NewDigest: dg(8), Now: base}); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("revoked: %v", err)
	}
	got, _ := e.s.GetSession(e.ctx, s.ID)
	if !bytes.Equal(got.RefreshDigest, dg(7)) {
		t.Fatal("a revoked session's digest must not move")
	}
}

func TestTouchLastSeenIsThrottled(t *testing.T) {
	e := newEnv(t)
	_, s := e.playerSession(t, "touch@example.test", 9, base)
	ip := netip.MustParseAddr("198.51.100.4")

	if ok, err := e.s.TouchLastSeen(e.ctx, s.ID, base.Add(30*time.Second), &ip); err != nil || ok {
		t.Fatalf("within a minute: wrote=%v err=%v", ok, err)
	}
	got, _ := e.s.GetSession(e.ctx, s.ID)
	if !sameTime(got.LastSeenAt, base) || got.LastIP != nil {
		t.Fatalf("nothing may change inside the interval: %+v", got)
	}
	if ok, _ := e.s.TouchLastSeen(e.ctx, s.ID, base.Add(store.TouchInterval-time.Second), nil); ok {
		t.Fatal("59 seconds is still inside the interval")
	}
	later := base.Add(store.TouchInterval + time.Second)
	if ok, err := e.s.TouchLastSeen(e.ctx, s.ID, later, &ip); err != nil || !ok {
		t.Fatalf("after a minute: wrote=%v err=%v", ok, err)
	}
	got, _ = e.s.GetSession(e.ctx, s.ID)
	if !sameTime(got.LastSeenAt, later) || got.LastIP == nil || *got.LastIP != ip {
		t.Fatalf("touched: %+v", got)
	}
	// A nil ip keeps the stored one.
	if ok, _ := e.s.TouchLastSeen(e.ctx, s.ID, later.Add(2*time.Minute), nil); !ok {
		t.Fatal("second write expected")
	}
	got, _ = e.s.GetSession(e.ctx, s.ID)
	if got.LastIP == nil || *got.LastIP != ip {
		t.Fatalf("nil ip must keep last_ip: %v", got.LastIP)
	}
	// Revoked sessions are never touched; unknown ones are simply not written.
	if _, err := e.s.RevokeSession(e.ctx, s.ID, store.ReasonSignOut, later); err != nil {
		t.Fatal(err)
	}
	if ok, _ := e.s.TouchLastSeen(e.ctx, s.ID, later.Add(time.Hour), nil); ok {
		t.Fatal("a revoked session must not be touched")
	}
	if ok, err := e.s.TouchLastSeen(e.ctx, uuid.New(), later, nil); ok || err != nil {
		t.Fatalf("unknown session: %v %v", ok, err)
	}
}

func TestRevokeSessionIsIdempotentAndKeepsTheFirstReason(t *testing.T) {
	e := newEnv(t)
	_, s := e.playerSession(t, "rev@example.test", 20, base)
	first := base.Add(time.Minute)
	if ok, err := e.s.RevokeSession(e.ctx, s.ID, store.ReasonSignedOutByOwner, first); err != nil || !ok {
		t.Fatalf("first revoke: %v %v", ok, err)
	}
	if ok, err := e.s.RevokeSession(e.ctx, s.ID, store.ReasonRefreshReused, first.Add(time.Hour)); err != nil || ok {
		t.Fatalf("second revoke must change nothing: %v %v", ok, err)
	}
	got, _ := e.s.GetSession(e.ctx, s.ID)
	if !got.Revoked() || !sameTime(*got.RevokedAt, first) || got.RevokeReason != store.ReasonSignedOutByOwner {
		t.Fatalf("first revoke must win: %+v", got)
	}
	if ok, err := e.s.RevokeSession(e.ctx, uuid.New(), store.ReasonSignOut, first); ok || err != nil {
		t.Fatalf("unknown session: %v %v", ok, err)
	}
	_, s2 := e.playerSession(t, "rev2@example.test", 21, base)
	if _, err := e.s.RevokeSession(e.ctx, s2.ID, "because", first); err == nil {
		t.Fatal("a reason outside the CHECK must fail")
	}
}

func TestRevokeIdentitySessionsWithExcept(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudiencePlayer, "many@example.test")
	mk := func(d byte) store.Session {
		s, err := e.s.InsertSession(e.ctx, store.NewSession{IdentityID: ident.ID, Audience: store.AudiencePlayer,
			DeviceLabel: "Phone", RefreshDigest: dg(d), Now: base, ExpiresAt: base.Add(time.Hour)})
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	keep, a, b, already := mk(30), mk(31), mk(32), mk(33)
	firstAt := base.Add(time.Minute)
	if _, err := e.s.RevokeSession(e.ctx, already.ID, store.ReasonSignOut, firstAt); err != nil {
		t.Fatal(err)
	}
	other, otherSess := e.playerSession(t, "other@example.test", 34, base)
	_ = other

	at := base.Add(time.Hour)
	ids, err := e.s.RevokeIdentitySessions(e.ctx, ident.ID, store.ReasonPasswordChanged, at, &keep.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 2 || !containsAll(ids, a.ID, b.ID) {
		t.Fatalf("revoked ids = %v, want exactly %v and %v", ids, a.ID, b.ID)
	}
	if got, _ := e.s.GetSession(e.ctx, keep.ID); got.Revoked() {
		t.Fatal("the excepted session must stay")
	}
	if got, _ := e.s.GetSession(e.ctx, already.ID); !sameTime(*got.RevokedAt, firstAt) || got.RevokeReason != store.ReasonSignOut {
		t.Fatalf("an already revoked session keeps its first revoke: %+v", got)
	}
	if got, _ := e.s.GetSession(e.ctx, otherSess.ID); got.Revoked() {
		t.Fatal("another identity's session must stay")
	}
	// Without an exception, everything left goes.
	ids, err = e.s.RevokeIdentitySessions(e.ctx, ident.ID, store.ReasonAccountDisabled, at, nil)
	if err != nil || len(ids) != 1 || ids[0] != keep.ID {
		t.Fatalf("revoke all: %v %v", ids, err)
	}
	if ids, err = e.s.RevokeIdentitySessions(e.ctx, ident.ID, store.ReasonAccountDisabled, at, nil); err != nil || len(ids) != 0 {
		t.Fatalf("nothing left: %v %v", ids, err)
	}
}

func containsAll(have []uuid.UUID, want ...uuid.UUID) bool {
	for _, w := range want {
		found := false
		for _, h := range have {
			found = found || h == w
		}
		if !found {
			return false
		}
	}
	return true
}

func TestRevokeDeviceSessions(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudienceClub, "dev-club")
	clubID := e.club(t, &ident.ID, true, nil)
	dev, otherDev := uuid.New(), uuid.New()
	for _, d := range []uuid.UUID{dev, otherDev} {
		if _, _, err := e.s.EnrollDevice(e.ctx, clubID, d, "Tablet", base); err != nil {
			t.Fatal(err)
		}
	}
	mk := func(d byte, device uuid.UUID) store.Session {
		s, err := e.s.InsertSession(e.ctx, store.NewSession{IdentityID: ident.ID, Audience: store.AudienceClub, ClubID: &clubID,
			DeviceID: &device, DeviceLabel: "Tablet", RefreshDigest: dg(d), Now: base, ExpiresAt: base.Add(time.Hour)})
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	a, b, keep := mk(40, dev), mk(41, dev), mk(42, otherDev)
	if _, err := e.s.RevokeSession(e.ctx, b.ID, store.ReasonSignOut, base); err != nil {
		t.Fatal(err)
	}
	ids, err := e.s.RevokeDeviceSessions(e.ctx, clubID, dev, store.ReasonDeviceRevoked, base.Add(time.Minute))
	if err != nil || len(ids) != 1 || ids[0] != a.ID {
		t.Fatalf("revoked = %v err %v, want only %v", ids, err, a.ID)
	}
	if got, _ := e.s.GetSession(e.ctx, keep.ID); got.Revoked() {
		t.Fatal("another device's session must stay")
	}
	if got, _ := e.s.GetSession(e.ctx, b.ID); got.RevokeReason != store.ReasonSignOut {
		t.Fatal("an earlier revoke must keep its reason")
	}
	// Scoped by club: the right device id with another club's id revokes nothing.
	if ids, _ := e.s.RevokeDeviceSessions(e.ctx, uuid.New(), otherDev, store.ReasonDeviceRevoked, base); len(ids) != 0 {
		t.Fatalf("wrong club revoked %v", ids)
	}
}

func TestListActiveSessionsByIdentityOrder(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudiencePlayer, "list@example.test")
	mk := func(d byte, seen time.Time, expires time.Time) store.Session {
		s, err := e.s.InsertSession(e.ctx, store.NewSession{IdentityID: ident.ID, Audience: store.AudiencePlayer,
			DeviceLabel: "Phone", RefreshDigest: dg(d), Now: seen, ExpiresAt: expires})
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	now := base.Add(24 * time.Hour)
	oldest := mk(50, base, now.Add(time.Hour))
	newest := mk(51, now.Add(-time.Minute), now.Add(time.Hour))
	middle := mk(52, now.Add(-time.Hour), now.Add(time.Hour))
	revoked := mk(53, now.Add(-2*time.Minute), now.Add(time.Hour))
	expired := mk(54, now.Add(-3*time.Minute), now.Add(-time.Second))
	if _, err := e.s.RevokeSession(e.ctx, revoked.ID, store.ReasonSignOut, now); err != nil {
		t.Fatal(err)
	}
	_ = expired
	got, err := e.s.ListActiveSessionsByIdentity(e.ctx, ident.ID, now)
	if err != nil {
		t.Fatal(err)
	}
	want := []uuid.UUID{newest.ID, middle.ID, oldest.ID}
	if len(got) != len(want) {
		t.Fatalf("got %d sessions, want %d: %+v", len(got), len(want), got)
	}
	for i, w := range want {
		if got[i].ID != w {
			t.Fatalf("position %d = %v, want %v (last_seen_at DESC)", i, got[i].ID, w)
		}
	}
	if none, err := e.s.ListActiveSessionsByIdentity(e.ctx, uuid.New(), now); err != nil || len(none) != 0 {
		t.Fatalf("unknown identity: %v %v", none, err)
	}
}

func TestListActiveSessionsByClubJoinsDevices(t *testing.T) {
	e := newEnv(t)
	ident := e.identity(t, store.AudienceClub, "list-club")
	clubID := e.club(t, &ident.ID, true, nil)
	devOK, devGone := uuid.New(), uuid.New()
	for d, label := range map[uuid.UUID]string{devOK: "Front desk", devGone: "Old phone"} {
		if _, _, err := e.s.EnrollDevice(e.ctx, clubID, d, label, base); err != nil {
			t.Fatal(err)
		}
	}
	mk := func(d byte, device *uuid.UUID, seen time.Time) store.Session {
		s, err := e.s.InsertSession(e.ctx, store.NewSession{IdentityID: ident.ID, Audience: store.AudienceClub, ClubID: &clubID,
			DeviceID: device, DeviceLabel: "Chrome", RefreshDigest: dg(d), Now: seen, ExpiresAt: base.Add(48 * time.Hour)})
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	withDevice := mk(60, &devOK, base.Add(2*time.Minute))
	revokedDevice := mk(61, &devGone, base.Add(time.Minute))
	noDevice := mk(62, nil, base)
	revokedAt := base.Add(time.Hour)
	if _, err := e.s.RevokeDevice(e.ctx, clubID, devGone, revokedAt); err != nil {
		t.Fatal(err)
	}
	// Another club's session never shows up.
	otherIdent, otherClub, _ := e.clubSession(t, "other-club", 63)
	_ = otherIdent
	_ = otherClub

	got, err := e.s.ListActiveSessionsByClub(e.ctx, clubID, base.Add(time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 || got[0].ID != withDevice.ID || got[1].ID != revokedDevice.ID || got[2].ID != noDevice.ID {
		t.Fatalf("order/contents: %+v", got)
	}
	if got[0].DeviceLabelCurrent == nil || *got[0].DeviceLabelCurrent != "Front desk" || got[0].DeviceRevokedAt != nil {
		t.Fatalf("device join: %+v", got[0])
	}
	if got[1].DeviceRevokedAt == nil || !sameTime(*got[1].DeviceRevokedAt, revokedAt) {
		t.Fatalf("revoked device: %+v", got[1])
	}
	if got[2].DeviceLabelCurrent != nil || got[2].DeviceRevokedAt != nil {
		t.Fatalf("session without a device: %+v", got[2])
	}
}

func TestGetSessionForUpdateSerializesRefresh(t *testing.T) {
	e := newEnv(t)
	_, s := e.playerSession(t, "lock@example.test", 70, base)

	locked, release, firstDone := make(chan struct{}), make(chan struct{}), make(chan error, 1)
	go func() {
		firstDone <- e.s.InTx(e.ctx, func(q *store.Queries) error {
			if _, err := q.GetSessionForUpdate(e.ctx, s.ID); err != nil {
				return err
			}
			close(locked)
			<-release
			return q.RotateRefresh(e.ctx, store.Rotation{ID: s.ID, NewDigest: dg(71), Now: base.Add(time.Minute)})
		})
	}()
	<-locked

	type result struct {
		digest []byte
		err    error
	}
	second := make(chan result, 1)
	go func() {
		var r result
		r.err = e.s.InTx(e.ctx, func(q *store.Queries) error {
			got, err := q.GetSessionForUpdate(e.ctx, s.ID)
			r.digest = got.RefreshDigest
			return err
		})
		second <- r
	}()

	// The second transaction must show up waiting on a lock, and must not have returned.
	deadline := time.Now().Add(10 * time.Second)
	for {
		var waiting int
		if err := e.pool.QueryRow(e.ctx, `SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`).Scan(&waiting); err != nil {
			t.Fatal(err)
		}
		if waiting > 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("the second FOR UPDATE never waited on the first")
		}
		time.Sleep(20 * time.Millisecond)
	}
	select {
	case r := <-second:
		t.Fatalf("second transaction returned while the first held the row: %+v", r)
	default:
	}

	close(release)
	if err := <-firstDone; err != nil {
		t.Fatal(err)
	}
	r := <-second
	if r.err != nil || !bytes.Equal(r.digest, dg(71)) {
		t.Fatalf("second must see the rotated digest after waiting: %+v", r)
	}
	if _, err := e.s.GetSessionForUpdate(e.ctx, uuid.New()); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("missing: %v", err)
	}
}
