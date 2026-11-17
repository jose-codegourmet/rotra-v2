#!/usr/bin/env python3
"""Split the hero art (public/hero-a/far, mid, near .webp, 2880x1620) into element layers for Rive.

Writes, under rive/hero/:
  el/*.webp        one image per element, cropped to its bounding box, with overdraw
  elements.json    every element's file, position (artboard px), size, depth and group
  scene.rml        the Rive scene: one artboard, one image per element, one group per depth,
                   view model Hero {px, py, scroll} bound to the group positions, state machine Main
and public/hero-a/still.webp, the flattened scene the page shows until (or if) Rive draws.

Requirements: Python 3 with Pillow and numpy (a virtualenv outside the repo), e.g.
  python3 -m venv /tmp/herovenv && /tmp/herovenv/bin/pip install pillow numpy
  /tmp/herovenv/bin/python apps/landingpage/rive/hero_split.py
Then: rive apps/landingpage/rive/hero --publish, and copy rive/hero/build/hero.riv to public/art/hero.riv.

The art is flat colour, so elements are split by colour and position. Antialiased edges are
unblended against the colour behind them (no fringes), the holes an element leaves in the one
behind it are filled with the surrounding colour, and every element gets overdraw so the parallax
offsets below never open a gap. The light cones are redrawn from their fitted edges so they can
extend under the lamp housings and the floor.

Parallax (artboard px; the page must use the same numbers, see the hero part of src/scripts/rive.js):
  pointer  x = -MAX_X * depth * px,  y = -MAX_Y * depth * py      (px, py in -1..1)
  scroll   y = SCROLL * (SCROLL_D0 - depth) * scroll              (scroll in 0..1)
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SRC = ROOT / 'public' / 'hero-a'
OUT = HERE / 'hero'
EL = OUT / 'el'
W, H = 2880, 1620

MAX_X, MAX_Y = 40.0, 20.0          # pointer parallax at depth 1
SCROLL, SCROLL_D0 = 324.0, 0.4     # scroll parallax: depth 0.15 -> +81 px (down), 0.85 -> -146 px (up)
PAD = 72                           # overdraw beyond the frame on the left, right and top
PAD_BOTTOM = 220                   # and below it (the near layers rise by up to ~165 px)

DEPTH = {'truss': 0.15, 'cones': 0.25, 'floor': 0.3, 'stands': 0.5, 'crowd': 0.55, 'court': 0.85}

# Idle motion
SWAY_RAD, SWAY_FRAMES = 0.012, 360      # 6 s at 60 fps
BOB_PX, BOB_FRAMES = 4.0, 180           # 3 s
BREATHE, BREATHE_FRAMES = 1.02, 240     # 4 s

WEBP_Q = 90


# ---------------------------------------------------------------- helpers

def load(name):
    im = Image.open(SRC / name).convert('RGBA')
    assert im.size == (W, H), name
    return np.asarray(im).astype(np.float32) / 255.0


def shift(a, dy, dx):
    """out[y, x] = a[y + dy, x + dx], zero outside."""
    out = np.zeros_like(a)
    h, w = a.shape[:2]
    ys, yd = (slice(dy, h), slice(0, h - dy)) if dy >= 0 else (slice(0, h + dy), slice(-dy, h))
    xs, xd = (slice(dx, w), slice(0, w - dx)) if dx >= 0 else (slice(0, w + dx), slice(-dx, w))
    out[yd, xd] = a[ys, xs]
    return out


def dilate(m, r=1):
    out = m.copy()
    for _ in range(r):
        acc = out.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    acc |= shift(out, dy, dx)
        out = acc
    return out


def bbox(m, margin=0):
    ys, xs = np.where(m)
    if len(ys) == 0:
        return None
    return (max(0, ys.min() - margin), min(m.shape[0], ys.max() + 1 + margin),
            max(0, xs.min() - margin), min(m.shape[1], xs.max() + 1 + margin))


def geodesic(seed, mask):
    """Connected part of mask reached from seed (8-connected)."""
    lab = label(mask)
    keep = np.unique(lab[seed & mask])
    return np.isin(lab, keep[keep > 0])


def label(mask):
    """8-connected component labels (0 = background), from row runs and union-find."""
    runs = []
    for y in range(mask.shape[0]):
        row = mask[y]
        if not row.any():
            continue
        d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
        for s, e in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
            runs.append((y, int(s), int(e)))
    parent = list(range(len(runs)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    by_row = {}
    for i, (y, s, e) in enumerate(runs):
        by_row.setdefault(y, []).append(i)
    for y, idx in by_row.items():
        prev = by_row.get(y - 1, [])
        j = 0
        for i in idx:
            _, s, e = runs[i]
            for q in prev:
                _, qs, qe = runs[q]
                if qs < e + 1 and s < qe + 1:
                    a, b = find(i), find(q)
                    if a != b:
                        parent[a] = b
    lab = np.zeros(mask.shape, np.int32)
    roots = {}
    for i, (y, s, e) in enumerate(runs):
        r = find(i)
        lab[y, s:e] = roots.setdefault(r, len(roots) + 1)
    return lab


def onion_fill(val, valid, target, iters):
    """Fill target pixels, ring by ring, with the mean of their already valid 8-neighbours.
    val is premultiplied (or any linear quantity); returns (val, filled_mask)."""
    val = val.copy()
    valid = valid.copy()
    target = target & ~valid
    b = bbox(target, iters + 2)
    if b is None:
        return val, valid
    y0, y1, x0, x1 = b
    v, ok, tg = val[y0:y1, x0:x1], valid[y0:y1, x0:x1], target[y0:y1, x0:x1]
    for _ in range(iters):
        if not tg.any():
            break
        okf = ok.astype(np.float32)
        acc = np.zeros_like(v)
        cnt = np.zeros(ok.shape, np.float32)
        vm = v * okf[..., None]
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    acc += shift(vm, dy, dx)
                    cnt += shift(okf, dy, dx)
        new = tg & (cnt > 0)
        v[new] = acc[new] / cnt[new][:, None]
        ok |= new
        tg &= ~new
    val[y0:y1, x0:x1] = v
    valid[y0:y1, x0:x1] = ok
    return val, valid


def nearest_colour(rgb, core, iters=6):
    """Colour of the nearest core pixel (approximately), for every pixel within iters of the core."""
    filled, ok = onion_fill(rgb, core, ~core, iters)
    return filled, ok


def unblend(p, f, b):
    """alpha such that p ~= alpha * f + (1 - alpha) * b (per pixel, last axis = channels)."""
    d = f - b
    n = (d * d).sum(-1)
    a = ((p - b) * d).sum(-1) / np.maximum(n, 1e-6)
    return np.clip(a, 0.0, 1.0)


def over(dst, src):
    """Premultiplied source-over, in place on dst (both HxWx4)."""
    dst[...] = src + dst * (1.0 - src[..., 3:4])


def premul(rgb, a):
    return np.concatenate([rgb * a[..., None], a[..., None]], -1)


class Canvas:
    """A premultiplied RGBA buffer in artboard coordinates, extended by the overdraw pads."""

    def __init__(self):
        self.ox, self.oy = PAD, PAD
        self.a = np.zeros((H + PAD + PAD_BOTTOM, W + 2 * PAD, 4), np.float32)

    def put(self, frame_rgba_prem):
        self.a[self.oy:self.oy + H, self.ox:self.ox + W] = frame_rgba_prem

    @property
    def frame(self):
        return self.a[self.oy:self.oy + H, self.ox:self.ox + W]

    def clamp_edges(self, left=True, right=True, top=True, bottom=True):
        a, ox, oy = self.a, self.ox, self.oy
        if top:
            a[:oy, ox:ox + W] = a[oy:oy + 1, ox:ox + W]
        if bottom:
            a[oy + H:, ox:ox + W] = a[oy + H - 1:oy + H, ox:ox + W]
        if left:
            a[:, :ox] = a[:, ox:ox + 1]
        if right:
            a[:, ox + W:] = a[:, ox + W - 1:ox + W]

    def extend_toward(self, vx, vy, side):
        """Extend past the left or right frame edge along lines through a vanishing point (frame px)."""
        a, ox, oy = self.a, self.ox, self.oy
        src_x = 0 if side == 'left' else W - 1
        cols = range(-ox, 0) if side == 'left' else range(W, W + PAD)
        ys = np.arange(-oy, H + PAD_BOTTOM, dtype=np.float32)
        col = a[:, ox + src_x]
        for x in cols:
            t = (src_x - vx) / (x - vx)
            sy = vy + (ys + 0.5 - vy) * t - 0.5
            sy = np.clip(sy + oy, 0, a.shape[0] - 1.001)
            i0 = np.floor(sy).astype(int)
            f = (sy - i0)[:, None]
            a[:, ox + x] = col[i0] * (1 - f) + col[i0 + 1] * f


def save_element(name, prem, ox, oy, store, depth, group, min_alpha=1.0 / 255):
    """Crop a premultiplied canvas (origin at ox, oy in its own pixels) to its alpha bbox and save."""
    m = prem[..., 3] >= min_alpha
    b = bbox(m)
    y0, y1, x0, x1 = b
    crop = prem[y0:y1, x0:x1]
    a = crop[..., 3]
    rgb = np.where(a[..., None] > 0, crop[..., :3] / np.maximum(a[..., None], 1e-6), 0)
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.clip(a, 0, 1)[..., None]], -1)
    img = Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA')
    path = EL / f'{name}.webp'
    img.save(path, 'WEBP', quality=WEBP_Q, alpha_quality=100, method=6)
    rec = {'name': name, 'file': f'el/{name}.webp', 'x': int(x0 - ox), 'y': int(y0 - oy),
           'w': int(x1 - x0), 'h': int(y1 - y0), 'depth': depth, 'group': group,
           'bytes': path.stat().st_size}
    store.append(rec)
    return rec


def fit_line(t, v, iters=3, tol=1.0):
    """Robust least squares v = a + b t."""
    t, v = np.asarray(t, float), np.asarray(v, float)
    keep = np.ones(len(t), bool)
    for _ in range(iters):
        A = np.stack([np.ones(keep.sum()), t[keep]], 1)
        (a, b), *_ = np.linalg.lstsq(A, v[keep], rcond=None)
        res = np.abs(v - (a + b * t))
        keep = res < max(tol, 2.5 * np.median(res[keep]))
    return a, b, float(np.sqrt(np.mean(res[keep] ** 2)))


def fit_poly(t, v, deg=2, iters=3, tol=1.0):
    """Robust polynomial fit v = p(t); returns (coefficients for np.polyval, rms)."""
    t, v = np.asarray(t, float), np.asarray(v, float)
    keep = np.ones(len(t), bool)
    for _ in range(iters):
        p = np.polyfit(t[keep], v[keep], deg)
        res = np.abs(v - np.polyval(p, t))
        keep = res < max(tol, 2.5 * np.median(res[keep]))
    return p, float(np.sqrt(np.mean(res[keep] ** 2)))


def raster(halfplanes, y0, y1, x0, x1, ss=4):
    """Coverage of the intersection of half-planes f(x, y) >= 0 over pixels [y0:y1, x0:x1] (frame px)."""
    cov = np.zeros((y1 - y0, x1 - x0), np.float32)
    ys = np.arange(y0, y1, dtype=np.float32)[:, None]
    xs = np.arange(x0, x1, dtype=np.float32)[None, :]
    for sy in range(ss):
        for sx in range(ss):
            py, px = ys + (sy + 0.5) / ss, xs + (sx + 0.5) / ss
            inside = np.ones(cov.shape, bool)
            for f in halfplanes:
                inside &= f(px, py) >= 0
            cov += inside
    return cov / (ss * ss)


# ---------------------------------------------------------------- the layers

def main():
    EL.mkdir(parents=True, exist_ok=True)
    for old in EL.glob('*.webp'):
        old.unlink()
    els = []
    report = {}

    far = load('far.webp')[..., :3]
    mid = load('mid.webp')
    near = load('near.webp')
    yy, xx = np.mgrid[0:H, 0:W]

    # ---------------- far: hall, truss + housings, four cones, back floor
    hall = np.median(far[300:900, 1000:1800].reshape(-1, 3), 0)
    floor_col = np.median(far[1200:1600, 200:2600].reshape(-1, 3), 0)
    R, G = far[..., 0], far[..., 1]
    mint = (G > 200 / 255) & (R < 80 / 255)

    # floor line: a horizontal edge; coverage of rows 1108..1117 against the pixel above
    above = far[1104][None]
    cov_rows = unblend(far[1106:1118], floor_col[None, None], above)
    floor_y = float(1118 - cov_rows.sum(0).mean())
    report['floor_y'] = floor_y
    FLOOR_ROW = int(math.floor(floor_y))          # first row touched by the floor

    # cones: mint regions reaching the floor line; the lens on each housing stays with the truss
    seeds = np.zeros((H, W), bool)
    seeds[FLOOR_ROW - 12] = mint[FLOOR_ROW - 12]
    cone_all = geodesic(seeds, mint)
    lens = mint & ~cone_all
    runs, row, x = [], cone_all[FLOOR_ROW - 12], 0
    while x < W:
        if row[x]:
            s = x
            while x < W and row[x]:
                x += 1
            runs.append((s, x - 1))
        else:
            x += 1
    assert len(runs) == 4, runs
    cones = []
    for ci, (s, e) in enumerate(runs):
        sd = np.zeros((H, W), bool)
        sd[FLOOR_ROW - 12, s:e + 1] = True
        cm = geodesic(sd, cone_all)
        ys, xs = np.where(cm)
        core = cm & ~dilate(~cm, 2)
        M = np.median(far[core], 0)
        top = ys.min()
        # side edges, row by row (subpixel, against the colour 4 px outside)
        Lt, Lv, Rt, Rv = [], [], [], []
        for y in range(top + 24, FLOOR_ROW - 6):
            cols = np.where(cm[y])[0]
            if len(cols) < 8:
                continue
            xl, xr = cols.min(), cols.max()
            if xl >= 6:
                bk = far[y, xl - 5]
                c0 = unblend(far[y, xl - 1], M, bk)
                c1 = unblend(far[y, xl], M, bk)
                Lt.append(y + 0.5)
                Lv.append(xl + 1 - c1 - c0)
            if xr <= W - 7:
                bk = far[y, xr + 5]
                c0 = unblend(far[y, xr + 1], M, bk)
                c1 = unblend(far[y, xr], M, bk)
                Rt.append(y + 0.5)
                Rv.append(xr + c1 + c0)
        pL, eL = fit_poly(Lt, Lv)          # gently curved: a quadratic follows them within ~0.3 px
        pR, eR = fit_poly(Rt, Rv)
        xL = lambda y, p=pL: np.polyval(p, y)
        xR = lambda y, p=pR: np.polyval(p, y)
        # top cut (under the housing rim), column by column, inside the side edges
        Tt, Tv = [], []
        for x in range(xs.min(), xs.max() + 1):
            col = np.where(cm[:, x])[0]
            if len(col) == 0:
                continue
            y0 = col.min()
            if y0 > top + 60 or x < xL(y0) + 6 or x > xR(y0) - 6:
                continue
            bk = far[max(0, y0 - 5), x]
            c0 = unblend(far[y0 - 1, x], M, bk)
            c1 = unblend(far[y0, x], M, bk)
            Tt.append(x + 0.5)
            Tv.append(y0 + 1 - c1 - c0)
        t0, t1, eT = fit_line(Tt, Tv)
        cones.append(dict(i=ci, M=M, xL=xL, xR=xR, t0=t0, t1=t1, top=int(top), near=dilate(cm, 12),
                          fit_rms=(round(eL, 3), round(eR, 3), round(eT, 3)), mask=cm))

    def cone_planes(c, up, bottom):
        return [lambda X, Y, c=c: X - c['xL'](Y),
                lambda X, Y, c=c: c['xR'](Y) - X,
                lambda X, Y, c=c, up=up: Y - (c['t0'] + c['t1'] * X - up),
                lambda X, Y, bottom=bottom: bottom - Y]

    # coverage of each cone as drawn in the source (for the truss underneath)
    is_hall = np.abs(far - hall).max(-1) < 10 / 255
    mint_col = np.median(far[cone_all & ~dilate(~cone_all, 2)], 0)
    t_ = np.clip(((far - hall) * (mint_col - hall)).sum(-1) / ((mint_col - hall) ** 2).sum(), 0, 1)
    is_hall_or_mint = np.abs(far - (hall + t_[..., None] * (mint_col - hall))).max(-1) < 45 / 255   # webp chroma bleeds at mint edges
    cone_cov = np.zeros((H, W), np.float32)
    for c in cones:
        y0, y1, x0, x1 = bbox(c['mask'], 4)
        cv = raster(cone_planes(c, 0.0, floor_y), y0, y1, x0, x1)
        # check the redrawn edge against the source where the cone meets the hall only
        obs = unblend(far[y0:y1, x0:x1], c['M'], hall)
        only_hall = ~dilate(~(is_hall_or_mint[y0:y1, x0:x1]), 3) & (yy[y0:y1, x0:x1] < floor_y - 3)
        edge = only_hall & (dilate(cv > 0.5, 2) & dilate(cv < 0.5, 2))
        diff = np.abs(cv - obs)[edge]
        c['raster_err'] = (round(float(diff.mean()), 4), round(float(np.percentile(diff, 99)), 4))
        cone_cov[y0:y1, x0:x1] = np.maximum(cone_cov[y0:y1, x0:x1], cv)

    # truss: everything above the floor that is neither hall nor cone, unblended against the hall.
    # Around each cone, 4 px more count as cone (webp rings dark green past mint edges), except
    # above the cone's top cut, where the housing rim is: there the rim keeps what the cone did not cover.
    above_floor = yy < FLOOR_ROW - 1
    near_cone = dilate(cone_cov > 0.01, 4) & above_floor
    rim_band = np.zeros((H, W), bool)
    for c in cones:
        rim_band |= near_cone & c['near'] & (yy + 0.5 < c['t0'] + c['t1'] * (xx + 0.5) + 1)
    rim_band &= cone_cov < 0.95
    hole = near_cone & ~rim_band
    cvx = cone_cov[..., None]
    src = np.where(rim_band[..., None], np.clip((far - cvx * mint_col) / np.maximum(1 - cvx, 1e-3), 0, 1), far)
    is_hall_src = np.abs(src - hall).max(-1) < 10 / 255
    truss_px = above_floor & ~is_hall_src & ~hole
    core = truss_px & ~dilate(~truss_px, 1)
    Ct, _ = nearest_colour(src, core, 4)
    a_t = np.where(core, 1.0, np.where(truss_px, unblend(src, Ct, hall[None, None]), 0.0))
    a_t = np.where(rim_band & (a_t < 0.35), 0.0, a_t)     # dark ringing beside the cone, not rim
    rgb_t = np.where(core[..., None], src, Ct)
    truss_prem = premul(rgb_t, a_t)
    truss_open = truss_prem.copy()                         # cone areas still empty
    valid = above_floor & ~hole
    truss_fill, _ = onion_fill(truss_prem, valid, hole, 56)  # arms continue under the cones
    truss_fill[~above_floor] = 0
    tc = Canvas()
    tc.put(truss_fill)
    tc.clamp_edges(bottom=False)
    save_element('truss', tc.a, tc.ox, tc.oy, els, DEPTH['truss'], 'truss')

    # housings: drawn again in front of the cones, so a cone that rises slides under its lamp
    lens_boxes = []
    for c in cones:
        cx = (c['xL'](c['top']) + c['xR'](c['top'])) / 2
        cand = lens & (np.abs(xx - cx) < 260) & (yy < c['top'] + 120)
        b = bbox(cand)
        assert b, 'no lens near cone %d' % c['i']
        y0, y1, x0, x1 = b
        y0, y1, x0, x1 = max(0, y0 - 40), y1 + 70, max(0, x0 - 50), min(W, x1 + 50)
        hc = np.zeros((H, W, 4), np.float32)
        piece = truss_open[y0:y1, x0:x1].copy()
        # the cone is drawn 10 px up under the rim, so the rim keeps only the share of each pixel
        # the cone did not cover in the source
        piece *= (1 - cone_cov[y0:y1, x0:x1])[..., None]
        hc[y0:y1, x0:x1] = piece
        save_element(f'housing{c["i"]}', hc, 0, 0, els, DEPTH['truss'], 'housings')
        lens_boxes.append((x0, y0, x1, y1))

    # cones: redrawn from the fitted edges, extended 10 px up under the housing and below the floor
    for c in cones:
        x_lo = int(math.floor(min(c['xL'](c['top'] - 40), c['xL'](floor_y + 100)))) - 2
        x_hi = int(math.ceil(max(c['xR'](c['top'] - 40), c['xR'](floor_y + 100)))) + 2
        x_lo, x_hi = max(-PAD, x_lo), min(W + PAD, x_hi)
        y_lo, y_hi = c['top'] - 40, int(floor_y + 100)
        cv = raster(cone_planes(c, 10.0, floor_y + 96), y_lo, y_hi, x_lo, x_hi)
        prem = premul(np.broadcast_to(c['M'], cv.shape + (3,)), cv)
        pivot_x = (c['xL'](c['top']) + c['xR'](c['top'])) / 2
        pivot_y = c['t0'] + c['t1'] * pivot_x
        rec = save_element(f'cone{c["i"]}', prem, -x_lo, -y_lo, els, DEPTH['cones'], 'cones')
        rec['pivot'] = [round(pivot_x, 2), round(pivot_y, 2)]
        rec['phase'] = c['i'] / 4.0
        report[f'cone{c["i"]}'] = {'fit_rms_px': c['fit_rms'], 'edge_err_mean_p99': c['raster_err']}

    # back floor: the dark green floor of the far layer, its top edge unblended against what is above
    fl = np.zeros((H, W, 4), np.float32)
    rows = slice(FLOOR_ROW - 2, H)
    above_px = far[FLOOR_ROW - 5][None]
    local = far[FLOOR_ROW + 3][None]
    a_f = unblend(far[rows], local, above_px)
    a_f[4:] = 1.0
    rgb_f = np.where((a_f >= 1.0)[..., None], far[rows], np.broadcast_to(local, far[rows].shape))
    fl[rows] = premul(rgb_f, a_f)
    fc = Canvas()
    fc.put(fl)
    fc.clamp_edges(top=False)
    save_element('floor', fc.a, fc.ox, fc.oy, els, DEPTH['floor'], 'floor')

    # ---------------- mid: stand bodies in tier slices, crowd rows between them
    A = np.where(mid[..., 3] < 10 / 255, 0.0, mid[..., 3])
    rgb = mid[..., :3]
    Pm = premul(rgb, A)
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    chroma = rgb.max(-1) - rgb.min(-1)
    crowd_core = (chroma < 0.12) & (rgb.min(-1) > 0.39) & (A > 0.9)
    mint_m = (G > 0.59) & (R < 0.35) & (A > 0.8)
    crowd_region = dilate(crowd_core, 2) & (A > 0)
    # stand under the crowd: the surrounding stand (or nothing, where a head stood against the hall).
    # Unblend against everything around (the ledge included), but fill the hole from the wall only,
    # so the mint ledge under a bust does not bleed up into it.
    Sm, _ = onion_fill(Pm, ~crowd_region, crowd_region, 40)
    Sw, _ = onion_fill(Pm, ~crowd_region & ~dilate(mint_m, 1), crowd_region, 40)
    Gc, _ = nearest_colour(rgb, crowd_core, 4)
    Gm = premul(Gc, np.ones((H, W), np.float32))
    a_c = np.where(crowd_core, 1.0, np.where(crowd_region, unblend(Pm, Gm, Sm), 0.0))
    crowd_rgb = np.where(crowd_core[..., None], rgb, Gc)
    crowd_flat = np.median(rgb[crowd_core & ~dilate(~crowd_core, 3)], 0)
    stand = np.where((crowd_region & (a_c >= 0.5))[..., None], Sw, Pm)
    # stand under partly covered crowd edge pixels: what the crowd did not cover
    part = crowd_region & (a_c > 0) & (a_c < 1)
    rec_under = (Pm - a_c[..., None] * premul(crowd_rgb, np.ones((H, W), np.float32))) / np.maximum(1 - a_c, 1e-3)[..., None]
    stand[part & (a_c < 0.5)] = np.clip(rec_under[part & (a_c < 0.5)], 0, 1)

    sides = {'L': xx < W // 2, 'R': xx >= W // 2}
    for side, sm in sides.items():
        # ledges: three mint lines, gently curved; measure each ledge's top edge in every column
        lm = mint_m & sm
        cols = range(0, 1000) if side == 'L' else range(W - 1000, W)
        per = {}
        for x in cols:
            ys = np.where(lm[:, x])[0]
            if len(ys) == 0:
                continue
            groups = np.split(ys, np.where(np.diff(ys) > 3)[0] + 1)
            per[x] = [g.min() for g in groups if len(g) >= 2]
        three = {x: t for x, t in per.items() if len(t) == 3}
        assert len(three) > 500, (side, len(three))
        lines, edges = [], []
        cx_all = np.arange(-PAD, W + PAD)
        for k in range(3):
            a0, b0, _ = fit_line([x + 0.5 for x in three], [t[k] for t in three.values()], tol=4)
            t, v = [], []
            for x, tops in per.items():
                near_ = [y for y in tops if abs(y - (a0 + b0 * (x + 0.5))) < 9]
                if len(near_) != 1:
                    continue
                y0 = near_[0]
                bk = rgb[y0 - 4, x]
                Mx = rgb[y0 + 2, x]
                c0 = unblend(rgb[y0 - 1, x], Mx, bk)
                c1 = unblend(rgb[y0, x], Mx, bk)
                t.append(x + 0.5)
                v.append(y0 + 1 - c1 - c0)
            t, v = np.array(t), np.array(v)
            order = np.argsort(t)
            t, v = t[order], v[order]
            # light smoothing (median of 7) against webp noise, then interpolate per column
            vs = np.array([np.median(v[max(0, i - 3):i + 4]) for i in range(len(v))])
            lo_t, hi_t = t[0], t[-1]
            aL_, bL_, _ = fit_line(t[t < lo_t + 120], vs[t < lo_t + 120])
            aR_, bR_, _ = fit_line(t[t > hi_t - 120], vs[t > hi_t - 120])
            ctr = cx_all + 0.5
            e = np.interp(ctr, t, vs)
            e = np.where(ctr < lo_t, aL_ + bL_ * ctr, e)
            e = np.where(ctr > hi_t, aR_ + bR_ * ctr, e)
            edges.append(e)
            lines.append((a0, b0))
            report[f'ledge{side}{k + 1}'] = {'x_range': [int(lo_t), int(hi_t)],
                                             'curve_vs_line_px': round(float(np.abs(vs - (a0 + b0 * t)).max()), 2)}
        # vanishing point of the three ledges (least squares)
        A_ = np.array([[-b, 1.0] for a, b in lines])
        rhs = np.array([a for a, b in lines])
        (vx, vy), *_ = np.linalg.lstsq(A_, rhs, rcond=None)
        report[f'vanish{side}'] = [round(float(vx), 1), round(float(vy), 1)]
        Lk = [np.broadcast_to(e[PAD:PAD + W][None, :], (H, W)) for e in edges]   # edge y per column

        # crowd rows: row k sits on ledge k (between ledge k-1 and ledge k)
        row_of = np.full((H, W), 0, np.int8)
        for k in range(3):
            lo = Lk[k - 1] + 2 if k > 0 else -1e9
            row_of[(yy >= lo) & (yy <= Lk[k] + 2)] = k + 1
        for k in range(3):
            m = sm & (row_of == k + 1) & (a_c > 0)
            prem = premul(crowd_rgb, np.where(m, a_c, 0.0))
            # busts that sit on the ledge continue 28 px down behind it, so a rising row shows more
            # body, not a gap; busts drawn with a flat bottom above the ledge stay as they are
            ext = prem.copy()
            ys_, xs_ = np.where(m & (a_c > 0.5))
            if len(xs_):
                cols = np.unique(xs_)
                yb = []
                for x in cols:                        # bottom of the bust, not of a stray pixel below it
                    c_ = np.sort(ys_[xs_ == x])
                    runs_c = np.split(c_, np.where(np.diff(c_) > 1)[0] + 1)
                    yb.append(max(runs_c, key=len).max())
                yb = np.array(yb)
                gap = np.array([edges[k][PAD + x] for x in cols]) - yb
                # median of 7 within each bust (a run of adjacent columns), so noise cannot flip columns
                runs_ = np.split(np.arange(len(cols)), np.where(np.diff(cols) > 1)[0] + 1)
                use = np.zeros(len(cols), bool)
                for r_ in runs_:
                    g = np.array([np.median(gap[r_[max(0, j - 4):j + 5]]) for j in range(len(r_))])
                    j0 = int(np.argmin(g))
                    if g[j0] > 2.5:
                        continue                      # a flat-bottomed bust above the ledge
                    lo_, hi_ = j0, j0                 # grow from where it touches, one clean step
                    while lo_ > 0 and g[lo_ - 1] <= 3.0:
                        lo_ -= 1
                    while hi_ < len(r_) - 1 and g[hi_ + 1] <= 3.0:
                        hi_ += 1
                    use[r_[lo_:hi_ + 1]] = True
                for x, b_, u_ in zip(cols, yb, use):
                    if not u_:
                        continue
                    a_src = prem[b_ - 7:b_ - 1, x, 3].max()   # inner shading lines are partly see-through
                    src = np.concatenate([crowd_flat * a_src, [a_src]])   # flat grey: no streaks
                    ext[b_ - 1:int(edges[k][PAD + x]) + 28, x] = src
            report[f'crowd{side}{k + 1}_overlap_ledge_above'] = int(
                (m & (a_c > 0.5) & (k > 0) & (yy < Lk[k - 1] + 14)).sum()) if k > 0 else 0
            cc = Canvas()
            cc.put(ext)
            rec = save_element(f'crowd{side}{k + 1}', cc.a, cc.ox, cc.oy, els, DEPTH['crowd'], f'crowd{k + 1}')
            rec['phase'] = ((0 if side == 'L' else 3) + k) / 6.0

        # stand body, extended past the frame edge toward the vanishing point, then cut in tier slices
        body = np.where(sm[..., None], stand, 0.0).astype(np.float32)
        bc = Canvas()
        bc.put(body)
        bc.extend_toward(vx, vy, 'left' if side == 'L' else 'right')
        EX = 8   # each slice runs 8 px under the next one
        cy, cx = np.mgrid[-bc.oy:H + PAD_BOTTOM, -bc.ox:W + PAD]
        LkE = [np.broadcast_to(e[None, :], cx.shape) for e in edges]
        for k in range(4):
            sl = bc.a.copy()
            upper = LkE[k] + EX if k < 3 else np.full(cx.shape, 1e9)
            keep = cy < upper
            if k > 0:
                lo = LkE[k - 1]
                cov = np.clip(cy + 1 - lo, 0.0, 1.0)      # share of the pixel below the ledge's top edge
                # rows fully below the edge keep their pixels; the boundary row is the ledge colour
                # (taken two rows further down) at partial alpha, so nothing dark rims the ledge
                partial = (cov > 0) & (cov < 1)
                pr_y, pr_x = np.where(partial)
                ly = np.clip(np.floor(lo[pr_y, pr_x]).astype(int) + 2 + bc.oy, 0, sl.shape[0] - 1)
                ledge_px = sl[ly, pr_x]
                ledge_rgb = ledge_px[:, :3] / np.maximum(ledge_px[:, 3:4], 1e-6)
                a_new = cov[pr_y, pr_x] * sl[pr_y, pr_x, 3]
                sl[pr_y, pr_x, :3] = ledge_rgb * a_new[:, None]
                sl[pr_y, pr_x, 3] = a_new
                sl[cov <= 0] = 0
            sl[~keep] = 0
            save_element(f'stand{side}{k}', sl, bc.ox, bc.oy, els, DEPTH['stands'], f'stands{k}')

    # ---------------- near: court floor with lines, ring plate
    An = np.where(near[..., 3] < 10 / 255, 0.0, near[..., 3])
    rgbn = near[..., :3]
    court_top = int(np.argmax(An[:, W // 2] > 0.5))
    report['court_top'] = court_top
    Fc = np.median(rgbn[court_top + 40:court_top + 140, 40:400].reshape(-1, 3), 0)
    Rn, Gn = rgbn[..., 0], rgbn[..., 1]
    plate_core = (Gn > 0.59) & (Rn < 0.35) & (Gn - Rn > 0.4) & (An > 0.9)
    Mp = np.median(rgbn[plate_core], 0)
    region = dilate(plate_core, 2)
    a_p = np.where(plate_core, 1.0, np.where(region, unblend(rgbn, Mp, Fc[None, None]), 0.0))
    py0, py1, px0, px1 = bbox(plate_core)
    plate_c = ((px0 + px1) / 2.0, (py0 + py1) / 2.0)
    report['plate'] = {'centre': [round(plate_c[0], 1), round(plate_c[1], 1)],
                       'centre_pct': [round(plate_c[0] / W * 100, 2), round(plate_c[1] / H * 100, 2)],
                       'width_frac': round((px1 - px0) / W, 4)}
    Cm, _ = nearest_colour(rgbn, plate_core, 4)
    plate_prem = premul(np.where(plate_core[..., None], rgbn, Cm), a_p)
    save_element('plate', plate_prem, 0, 0, els, DEPTH['court'], 'court')
    els[-1]['pivot'] = [round(plate_c[0], 2), round(plate_c[1], 2)]
    court_rgb = np.where((a_p > 0)[..., None], Fc[None, None], rgbn)
    court_a = np.where(yy >= court_top, 1.0, An)
    court_a = np.where(yy < court_top - 2, 0.0, court_a)
    cc = Canvas()
    cc.put(premul(court_rgb, court_a))
    cc.clamp_edges(top=False)
    save_element('court', cc.a, cc.ox, cc.oy, els, DEPTH['court'], 'court')

    # ---------------- the still: the source layers stacked, exactly as delivered
    still = premul(far, np.ones((H, W), np.float32))
    over(still, Pm)
    over(still, premul(rgbn, An))
    Image.fromarray((np.clip(still[..., :3], 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB').save(
        SRC / 'still.webp', 'WEBP', quality=82, method=6)

    (OUT / 'elements.json').write_text(json.dumps({'width': W, 'height': H, 'hall': '#08080b',
                                                   'parallax': {'max_x': MAX_X, 'max_y': MAX_Y,
                                                                'scroll': SCROLL, 'scroll_d0': SCROLL_D0},
                                                   'elements': els, 'report': report}, indent=1) + '\n')
    write_rml(els)
    print(json.dumps(report, indent=1))
    print('elements:', len(els), 'bytes:', sum(e['bytes'] for e in els))


# ---------------------------------------------------------------- the Rive scene

def write_rml(els):
    ids = iter(range(10, 100000))
    nid = lambda: f'0:{next(ids)}'
    by = {e['name']: e for e in els}
    out = []
    w = out.append

    VM, PX, PY, SC, INST = nid(), nid(), nid(), nid(), nid()
    SM, STYLE, AB = nid(), nid(), nid()
    asset_id = {e['name']: nid() for e in els}
    conv = {}
    conv_rml = []
    for d in sorted(set(DEPTH.values())):
        cx, cy, cs = nid(), nid(), nid()
        conv[d] = (cx, cy, cs)
        tag = f'{int(round(d * 100)):02d}'
        conv_rml.append(f'<DataConverterRangeMapper minInput="-1" maxInput="1" minOutput="{MAX_X * d:.4f}" '
                        f'maxOutput="{-MAX_X * d:.4f}" name="d{tag} pointer x" id="{cx}"/>')
        conv_rml.append(f'<DataConverterRangeMapper minInput="-1" maxInput="1" minOutput="{MAX_Y * d:.4f}" '
                        f'maxOutput="{-MAX_Y * d:.4f}" name="d{tag} pointer y" id="{cy}"/>')
        conv_rml.append(f'<DataConverterRangeMapper minInput="0" maxInput="1" minOutput="0" '
                        f'maxOutput="{SCROLL * (SCROLL_D0 - d):.4f}" name="d{tag} scroll" id="{cs}"/>')

    node_ids = {}

    def image(e, x=None, y=None, nid_=None):
        i = nid_ or nid()
        node_ids[e['name']] = i
        xx = e['x'] if x is None else x
        yy = e['y'] if y is None else y
        return (f'<Image x="{xx:.2f}" y="{yy:.2f}" originX="0" originY="0" assetId="{asset_id[e["name"]]}" '
                f'name="{e["name"]}" id="{i}"/>')

    def group(name, depth, inner):
        cx, cy, cs = conv[depth]
        g = nid()
        node_ids[name] = g
        s = [f'<Node name="{name}" id="{g}">',
             f'<DataBindContext sourcePathIds="{VM}-{PX}" propertyKey="13" converterId="{cx}"/>',
             f'<DataBindContext sourcePathIds="{VM}-{PY}" propertyKey="14" converterId="{cy}"/>',
             f'<Node name="{name} scroll" id="{nid()}">',
             f'<DataBindContext sourcePathIds="{VM}-{SC}" propertyKey="14" converterId="{cs}"/>']
        s += inner
        s += ['</Node>', '</Node>']
        return s

    plate = by['plate']
    pvx, pvy = plate['pivot']
    plate_pivot = nid()
    node_ids['plate_pivot'] = plate_pivot
    court_inner = [f'<Node x="{pvx:.2f}" y="{pvy:.2f}" name="plate pivot" id="{plate_pivot}">',
                   image(plate, plate['x'] - pvx, plate['y'] - pvy), '</Node>',
                   image(by['court'])]
    body = []
    body += group('court', DEPTH['court'], court_inner)               # front
    for k in (3, 2, 1, 0):
        body += group(f'stands {k}', DEPTH['stands'], [image(by[f'standL{k}']), image(by[f'standR{k}'])])
        if k > 0:
            body += group(f'crowd {k}', DEPTH['crowd'], [image(by[f'crowdL{k}']), image(by[f'crowdR{k}'])])
    body += group('floor', DEPTH['floor'], [image(by['floor'])])
    body += group('housings', DEPTH['truss'], [image(by[f'housing{i}']) for i in range(4)])
    cone_inner = []
    for i in range(4):
        e = by[f'cone{i}']
        px_, py_ = e['pivot']
        pid = nid()
        node_ids[f'cone{i}_pivot'] = pid
        cone_inner += [f'<Node x="{px_:.2f}" y="{py_:.2f}" name="cone{i} pivot" id="{pid}">',
                       image(e, e['x'] - px_, e['y'] - py_), '</Node>']
    body += group('cones', DEPTH['cones'], cone_inner)
    body += group('truss', DEPTH['truss'], [image(by['truss'])])     # back

    # idle animations
    anims = []
    sway_id = nid()
    a = [f'<LinearAnimation loopValue="loop" duration="{SWAY_FRAMES}" name="Sway" id="{sway_id}">']
    for i in range(4):
        ph = by[f'cone{i}']['phase']
        a.append(f'<KeyedObject objectId="{node_ids[f"cone{i}_pivot"]}"><KeyedProperty property="rotation">')
        for f in range(0, SWAY_FRAMES + 1, 12):
            v = SWAY_RAD * math.sin(2 * math.pi * (f / SWAY_FRAMES + ph))
            a.append(f'<KeyFrameDouble value="{v:.6f}" frame="{f}" interpolationType="linear"/>')
        a.append('</KeyedProperty></KeyedObject>')
    a.append('</LinearAnimation>')
    anims += a
    bob_id = nid()
    a = [f'<LinearAnimation loopValue="loop" duration="{BOB_FRAMES}" name="Bob" id="{bob_id}">']
    for side in 'LR':
        for k in (1, 2, 3):
            e = by[f'crowd{side}{k}']
            a.append(f'<KeyedObject objectId="{node_ids[e["name"]]}"><KeyedProperty property="y">')
            for f in range(0, BOB_FRAMES + 1, 6):
                v = e['y'] - BOB_PX / 2 * (1 - math.cos(2 * math.pi * (f / BOB_FRAMES + e['phase'])))
                a.append(f'<KeyFrameDouble value="{v:.3f}" frame="{f}" interpolationType="linear"/>')
            a.append('</KeyedProperty></KeyedObject>')
    a.append('</LinearAnimation>')
    anims += a
    br_id = nid()
    ease = '<CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/>'
    a = [f'<LinearAnimation loopValue="loop" duration="{BREATHE_FRAMES}" name="Breathe" id="{br_id}">',
         f'<KeyedObject objectId="{plate_pivot}">']
    for prop in ('scaleX', 'scaleY'):
        a.append(f'<KeyedProperty property="{prop}">')
        for f, v in ((0, 1.0), (BREATHE_FRAMES // 2, BREATHE), (BREATHE_FRAMES, 1.0)):
            a.append(f'<KeyFrameDouble value="{v}" frame="{f}" interpolationType="cubic">{ease}</KeyFrameDouble>')
        a.append('</KeyedProperty>')
    a.append('</KeyedObject></LinearAnimation>')
    anims += a

    layers = []
    for n, (name, anim) in enumerate((('Lights', sway_id), ('Crowd', bob_id), ('Plate', br_id))):
        st = nid()
        layers += [f'<StateMachineLayer name="{name}" id="{nid()}">',
                   f'<AnyState x="{n * 600}" y="-150"/>', f'<ExitState x="{n * 600 + 300}" y="-150"/>',
                   f'<EntryState x="{n * 600}" y="0"><StateTransition stateToId="{st}"/></EntryState>',
                   f'<AnimationState x="{n * 600 + 200}" y="150" animationId="{anim}" id="{st}"/>',
                   '</StateMachineLayer>']

    w('<Rive version="1" kind="fragment">')
    w('<!-- Generated by rive/hero_split.py; edit the script, not this file. First child draws in front. -->')
    w(f'<Artboard defaultStateMachineId="{SM}" viewModelId="{VM}" viewModelInstanceId="{INST}" clip="true" '
      f'styleId="{STYLE}" width="{W}" height="{H}" name="Hero" id="{AB}">')
    w(f'<LayoutComponentStyle name="Artboard Style" id="{STYLE}"/>')
    out.extend(body)
    out.extend(anims)
    w(f'<StateMachine name="Main" id="{SM}">')
    out.extend(layers)
    w('</StateMachine>')
    w('</Artboard>')
    out.extend(conv_rml)
    w(f'<ViewModel defaultInstanceId="{INST}" name="Hero" id="{VM}">')
    w(f'<ViewModelPropertyNumber name="px" id="{PX}"/>')
    w(f'<ViewModelPropertyNumber name="py" id="{PY}"/>')
    w(f'<ViewModelPropertyNumber name="scroll" id="{SC}"/>')
    w(f'<ViewModelInstance exports="true" name="Default" id="{INST}">')
    for p in (PX, PY, SC):
        w(f'<ViewModelInstanceNumber propertyValue="0" viewModelPropertyId="{p}"/>')
    w('</ViewModelInstance>')
    w('</ViewModel>')
    for e in els:
        w(f'<ImageAsset file="{e["file"]}" name="{e["name"]}" id="{asset_id[e["name"]]}"/>')
    w('</Rive>')
    (OUT / 'scene.rml').write_text('\n'.join(out) + '\n')


if __name__ == '__main__':
    sys.exit(main())
