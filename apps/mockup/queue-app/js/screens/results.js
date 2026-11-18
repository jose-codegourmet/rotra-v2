import { chip } from '../fragments.js'
import { counted, cur, esc, fmtDate, nm, P, R, sideOf } from '../helpers.js'
import { I } from '../icons.js'
import { S } from '../state.js'
import { clubLogo } from './venues.js'

// ---------- Results (Q-RESULTS) ----------
export function standings(s) {
  const done = s.matches.filter((m) => m.status === 'done')
  const rows = s.roster
    .map((r) => {
      let w = 0,
        l = 0
      done.forEach((m) => {
        if (counted(m, r.pid)) {
          const onA = sideOf(m, r.pid) === 'A'
          if ((m.winner === 'A') === onA) w++
          else l++
        }
      })
      return { pid: r.pid, name: nm(r.pid), w, l, g: w + l }
    })
    .filter((x) => x.g > 0)
  const h2h = (a, b) => {
    let aw = 0,
      bw = 0
    done.forEach((m) => {
      const aA = sideOf(m, a.pid) === 'A',
        bA = sideOf(m, b.pid) === 'A'
      if (!counted(m, a.pid) || !counted(m, b.pid) || aA === bA) return
      if ((m.winner === 'A') === aA) aw++
      else bw++
    })
    return bw - aw
  }
  rows.sort((a, b) => b.w - a.w || a.l - b.l || h2h(a, b) || a.name.localeCompare(b.name))
  return rows
}
export function awards(s) {
  const done = s.matches.filter((m) => m.status === 'done')
  const lv = (p) => (R(s, p) && R(s, p).level != null ? R(s, p).level : 4)
  const avg = (ids) => ids.reduce((t, p) => t + lv(p), 0) / ids.length
  const perf = s.roster
    .map((r) => {
      let score = 0,
        g = 0,
        w = 0
      done.forEach((m) => {
        if (!counted(m, r.pid)) return
        const onA = sideOf(m, r.pid) === 'A'
        const mine = avg(onA ? m.teamA : m.teamB),
          opp = avg(onA ? m.teamB : m.teamA)
        const expected = 1 / (1 + 10 ** ((opp - mine) / 2))
        const won = (m.winner === 'A') === onA
        score += (won ? 1 : 0) - expected
        g++
        if (won) w++
      })
      return { pid: r.pid, score, g, rate: g ? w / g : 0, p: P(r.pid) }
    })
    .filter((x) => x.g >= 2)
  const mvp = perf.slice().sort((a, b) => b.score - a.score)[0] || null
  const hist = perf
    .filter((x) => x.p.prior >= 5 && x.p.base != null)
    .map((x) => ({ ...x, delta: x.rate - x.p.base }))
  const improved = hist.filter((x) => x.delta >= 0.15).sort((a, b) => b.delta - a.delta)[0] || null
  const offDay = hist.filter((x) => x.delta <= -0.3).sort((a, b) => a.delta - b.delta)
  return { mvp, improved, offDay }
}
function slideFrame(s, inner, title) {
  return `<div class="slide"><div class="sh">${clubLogo('lg')}<div><div class="label">${esc(S.club.name)}</div><h2>${esc(title)}</h2><p class="small muted">${esc(s.title)} · ${fmtDate(s.start)}</p></div></div>${inner}<div class="foot"><span>${esc(s.venue)}</span><b>powered by rotra</b></div></div>`
}
export function slideStandings(s) {
  const st = standings(s)
  return slideFrame(
    s,
    st.length
      ? `<table class="st-table"><thead><tr><th>#</th><th>Player</th><th class="n">W</th><th class="n">L</th><th class="n">G</th></tr></thead><tbody>${st.map((r, i) => `<tr><td class="tnum">${i + 1}</td><td>${esc(r.name)}</td><td class="n">${r.w}</td><td class="n">${r.l}</td><td class="n">${r.g}</td></tr>`).join('')}</tbody></table>`
      : '<p class="empty">No counted games were recorded in this session.</p>',
    'Standings',
  )
}
export function slideAwards(s) {
  const a = awards(s)
  return slideFrame(
    s,
    `<div class="stack">
    <div class="award"><span class="label">MVP</span>${a.mvp ? `<span class="big">${esc(a.mvp.p.name)}</span><span class="small muted">Won more than expected for their level, partners and opponents.</span>` : '<span class="muted">Not enough counted games to name an MVP.</span>'}</div>
    <div class="award"><span class="label">Most Improved</span>${a.improved ? `<span class="big">${esc(a.improved.p.name)}</span><span class="small muted">Played above their last ${a.improved.p.prior} sessions at this club.</span>` : '<span class="muted">Not enough recent club-session history.</span>'}</div>
    <p class="small muted">Prototype formula. ROTRA hasn't settled the award maths yet.</p></div>`,
    'Awards',
  )
}
export function slideOffDay(s, isPublic) {
  const a = awards(s)
  return slideFrame(
    s,
    `${isPublic ? '' : `<div class="private-band">${I.lock} Private · not included in sharing</div>`}
    ${a.offDay.length ? `<div class="stack tight">${a.offDay.map((x) => `<div class="award"><b>${esc(x.p.name)}</b><span class="small muted">Below their usual results across their last ${x.p.prior} club sessions.</span></div>`).join('')}</div>` : '<p class="empty">No one had an off day by the recent-history measure.</p>'}
    <p class="small muted">Only players with 5+ sessions here in the last 3 months are compared. Prototype formula.</p>`,
    'Off Day',
  )
}
export function viewResults() {
  const s = cur()
  const slides = [
    ['Standings', slideStandings],
    ['Awards', slideAwards],
    ['Off Day', slideOffDay],
  ]
  const i = S.ui.slide
  return `<main class="wrap">
    <div class="crumb"><button class="btn sm ghost" data-act="go" data-to="home">${I.back} Home</button></div>
    <div class="between"><div class="stack tight"><span class="label">Session results · private</span><h1>${esc(s.title)}</h1><p class="muted small">${fmtDate(s.start)} · ${esc(s.venue)} · ${s.matches.filter((m) => m.status === 'done').length} games</p></div>
      <div class="row"><button class="btn sm" data-act="go" data-to="history">Match history</button><button class="btn sm" data-act="go" data-to="public">View public page</button><button class="btn sm" data-act="openExport">Download images</button><button class="btn sm primary" data-act="openPublish">${s.published ? 'Update publication' : 'Publish results'}</button></div></div>
    <div class="row">${chip(`${I.check} Player records and ranks updated`, 'ok')}${chip(s.published ? 'Club results published' : 'Club results private', s.published ? 'ok' : '')}${chip(s.published && s.published.offDay ? 'Off Day shared' : 'Off Day private', 'warn')}</div>
    <p class="small muted">Player profiles and ranks updated when the session finished. Publishing is separate and only affects the session page. Results are read-only.</p>
    <div class="slides-nav" role="tablist" aria-label="Result slides">${slides.map(([l], k) => `<button class="btn sm ${k === i ? 'primary' : ''}" role="tab" aria-selected="${k === i}" data-act="slide" data-k="${k}">${k + 1}. ${l}</button>`).join('')}</div>
    ${slides[i][1](s)}
  </main>`
}

// ---------- Q-FINALIZE-PROGRESS ----------
export function viewFinalizing() {
  const st = S.ui.finalStage || 0
  const steps = [
    'Checking session records',
    'Finishing the session',
    'Updating player records',
    'Preparing result slides',
  ]
  return `<main class="wrap narrow"><section class="card stack"><h1>Finishing ${esc(cur().title)}</h1>
    <ol class="list" style="list-style:none;padding:0;margin:0">${steps.map((t, k) => `<li class="li"><span style="width:18px;${k < st ? 'color:var(--accent)' : 'color:var(--fg2)'}">${k < st ? I.check : k === st ? '…' : '·'}</span><span class="main ${k <= st ? '' : 'muted'}">${t}</span></li>`).join('')}</ol>
    <p class="small muted" aria-live="polite">${st >= steps.length ? 'Done.' : steps[st] + '…'}</p></section></main>`
}
