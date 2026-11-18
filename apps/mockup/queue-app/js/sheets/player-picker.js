import { avatar, busyOf, courtsOf, esc, gamesOf, lvLabel, nm, P, R, short } from '../helpers.js'
import { restInfo } from '../screens/console-board.js'
import { sheetShell } from './sheets.js'

// ---------- Player picker ----------
export function playerTile(
  s,
  pid,
  { attrs = '', pressed = false, disabled = false, note = '' } = {},
) {
  const p = P(pid),
    r = R(s, pid),
    a = busyOf(s, pid)
  const status =
    note ||
    (a
      ? `${a.status === 'oncourt' ? 'On court' : 'Playing'} · ${courtsOf(s, a)}`
      : !r.present
        ? 'Not present'
        : `Resting ${restInfo(s, pid).mins} min`)
  return `<button class="ptile ${a ? 'busy' : ''} ${r.present ? '' : 'away'} ${!a && r.present && !note ? 'fresh' : ''}" ${attrs} aria-pressed="${pressed}" ${disabled ? 'disabled' : ''}>
    ${avatar(p, 'xl')}<span class="pt-name">${esc(p.name)}</span><span class="pt-lv">${esc(lvLabel(r.level))}</span>
    <span class="pt-meta">${gamesOf(s, pid)}/${s.minimum} games</span><span class="pt-st">${esc(status)}</span></button>`
}
export function pickerSheet(s, sh) {
  const pk = sh.picking
  const current = sh[pk.team][pk.i]
  const others = sh.teamA.concat(sh.teamB).filter((p, idx) => p && p !== current)
  const f = sh.pf || 'avail'
  const q = (sh.pq || '').trim().toLowerCase()
  let list = s.roster.filter(
    (r) => !q || nm(r.pid).toLowerCase().includes(q) || short(r.pid).toLowerCase().includes(q),
  )
  if (f === 'avail') list = list.filter((r) => r.present && !busyOf(s, r.pid))
  if (f === 'present') list = list.filter((r) => r.present)
  list.sort(
    (a, b) =>
      (busyOf(s, a.pid) ? 1 : 0) - (busyOf(s, b.pid) ? 1 : 0) ||
      (b.present ? 1 : 0) - (a.present ? 1 : 0) ||
      gamesOf(s, a.pid) - gamesOf(s, b.pid) ||
      restInfo(s, b.pid).mins - restInfo(s, a.pid).mins,
  )
  const title = `Choose Team ${pk.team === 'teamA' ? 'A' : 'B'} · player ${pk.i + 1}`
  return sheetShell(
    title,
    `
    <label class="field"><span>Search players</span><input class="input" id="pick-q" data-bind="ui.sheet.pq" data-rerender value="${esc(sh.pq || '')}" placeholder="Name or nickname" data-autofocus></label>
    <div class="seg" role="group" aria-label="Show">${[
      ['avail', 'Available now'],
      ['present', 'All present'],
      ['all', 'Everyone'],
    ]
      .map(
        ([k, l]) =>
          `<button aria-pressed="${f === k}" data-act="sheetSet" data-k="pf" data-v="${k}">${l}</button>`,
      )
      .join('')}</div>
    ${
      list.length
        ? `<div class="pick-grid">${list.map((r) => playerTile(s, r.pid, { attrs: `data-act="choosePick" data-id="${r.pid}"`, pressed: r.pid === current, disabled: others.includes(r.pid), note: others.includes(r.pid) ? 'Already in this match' : '' })).join('')}</div>`
        : `<div class="empty">${f === 'avail' ? 'No one is free right now. Try All present.' : 'No player matches.'}</div>`
    }
    <p class="small muted">Fewest games first. A player who is playing now can go into a later match, but it can't start until they're free.</p>`,
    '<button class="btn" data-act="pickBack">Back to lineup</button>',
    true,
  )
}
