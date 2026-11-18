import { chip, notice } from '../fragments.js'
import {
  all,
  avatar,
  busyOf,
  esc,
  gamesOf,
  listNames,
  P,
  queuedCount,
  R,
  short,
  waiting,
} from '../helpers.js'
import { I } from '../icons.js'
import { attention } from '../rules/court-fill.js'
import { splitTeams } from '../rules/matchmaking.js'
import { FORMAT_LABEL, S } from '../state.js'
import { DRAFT_TILE_MIN, queueCard, queueCols, restInfo } from './console-board.js'

export const AUTO_MODES = {
  available: 'Available Players',
  ahead: 'Plan Ahead',
  wait: 'Longest Wait',
  fewest: 'Fewest Games',
  catchup: 'Catch Up',
}
export function autoState(s) {
  if (!S.ui.autoDraft || S.ui.autoDraft.sid !== s.id)
    S.ui.autoDraft = {
      sid: s.id,
      tab: 'available',
      batches: {},
      selected: [],
      count: null,
      target: '',
      next: 1,
    }
  return S.ui.autoDraft
}
export function queueFingerprint(s) {
  return JSON.stringify([s.status, s.singles, s.doubles, s.roster, s.courts, s.matches])
}
const AUTO_DESCRIPTIONS = {
  available: 'Matches from players who are here and not on a court right now.',
  ahead:
    'Also uses players who are on court or mid-game. Their matches wait until their current game ends.',
  wait: 'Puts the players who have waited longest since their last game first.',
  fewest: 'Puts the players with the fewest games (played + already queued) first.',
  catchup: 'Helps players who are behind reach a number of games you choose.',
}
export function autoWorkspace(s) {
  const a = autoState(s),
    tab = a.tab,
    batch = a.batches[tab] || { cards: [] }
  const stale = batch.fingerprint && batch.fingerprint !== queueFingerprint(s)
  const validTarget = Number.isSafeInteger(+a.target) && +a.target > 0
  const generationHint = !a.count
    ? 'Choose how many matches first.'
    : tab === 'catchup' && !validTarget
      ? a.target === ''
        ? 'Choose a game target first.'
        : 'Enter a whole number of games, 1 or more.'
      : ''
  const draftsHint = !batch.cards.length
    ? 'Generate matches in this tab first to replace or remove drafts, or add them to the Main Queue.'
    : ''
  const selectionHint = !a.selected.length
    ? 'Select one or more drafts first to add a selection to the Main Queue.'
    : ''
  const disabled = (reason, id) =>
    reason ? `disabled title="${esc(reason)}" aria-describedby="${id}"` : ''
  const eligible = s.roster.some((r) => r.present && (tab === 'ahead' || !busyOf(s, r.pid)))
  const empty = !eligible
    ? tab === 'ahead'
      ? 'No present players. Mark arrivals present in Players.'
      : 'No one is free to play right now. Try Plan Ahead to include players who are mid-game.'
    : tab === 'catchup' && !validTarget
      ? 'Choose a game target, then Generate.'
      : !a.count
        ? 'Choose how many matches, then Generate.'
        : 'Generate matches to see suggestions here.'
  return `<div class="seg" role="group" aria-label="Queue workspace"><button data-act="queueWorkspace" data-k="main">Main Queue</button><button aria-pressed="true">Generate matches</button></div>
    <div class="between"><h2>Generate matches</h2><span class="small muted">Drafts are suggestions. Nothing joins the Main Queue until you add it.</span></div>
    <div class="seg" role="group" aria-label="Generation strategy">${Object.entries(AUTO_MODES)
      .map(
        ([k, label]) =>
          `<button id="auto-tab-${k}" data-act="autoTab" data-k="${k}" aria-pressed="${tab === k}">${label}</button>`,
      )
      .join('')}</div>
    <p class="small muted">${AUTO_DESCRIPTIONS[tab]}</p>
    <div class="field"><span>How many matches?</span><div class="row">${[2, 3, 4, 6].map((n) => `<button id="auto-count-${n}" class="btn sm" data-act="autoCount" data-n="${n}" aria-pressed="${a.count === n}">${n}</button>`).join('')}</div></div>
    ${tab === 'catchup' ? `<label class="field"><span>Games each player should reach</span><input id="auto-target" aria-label="Games each player should reach" class="input${a.target !== '' && !validTarget ? ' bad' : ''}" style="max-width:320px" type="number" min="1" step="1" placeholder="e.g. ${s.minimum}" data-bind="ui.autoDraft.target" data-rerender value="${esc(String(a.target))}" aria-describedby="auto-target-hint${a.target !== '' && !validTarget ? ' auto-target-error' : ''}" ${a.target !== '' && !validTarget ? 'aria-invalid="true"' : ''}><span class="hint" id="auto-target-hint">Players below this number get matches first. Games already played and games already planned in the Main Queue both count. Earlier drafts in this batch count too. Example: with 3, a player who has played 1 and is queued for 1 needs 1 more match. This is separate from the session minimum (Min ${s.minimum} game${s.minimum === 1 ? '' : 's'}).</span>${a.target !== '' && !validTarget ? '<span class="err" id="auto-target-error" aria-live="polite">Enter a whole number of games, 1 or more.</span>' : ''}</label>` : ''}
    ${generationHint ? `<p class="small muted" id="auto-generate-hint">${generationHint}</p>` : ''}
    ${draftsHint ? `<p class="small muted" id="auto-drafts-hint">${draftsHint}</p>` : ''}
    <div class="row"><button class="btn primary" data-act="${batch.cards.length ? 'autoRegenerate' : 'autoGenerate'}" ${disabled(generationHint, 'auto-generate-hint')}>${batch.cards.length ? 'Generate again' : a.count ? `Generate ${a.count} matches` : 'Generate matches'}</button>${autoMoreMenu(batch, draftsHint || generationHint, draftsHint)}</div>
    ${a.error ? notice('warn', esc(a.error)) : ''}${stale ? notice('warn', 'The Main Queue changed since these were made. Check them before adding, or generate again.') : ''}${batch.stop ? (/^Made (\d+) of \1 matches\.$/.test(batch.stop) ? `<div><span class="chip">${esc(batch.stop)}</span></div>` : notice('', esc(batch.stop))) : ''}
    ${batch.cards.length ? `<div class="qgrid" style="grid-template-columns:repeat(${queueCols(DRAFT_TILE_MIN)}, minmax(0, 1fr))">${batch.cards.map((m) => draftTile(s, m, batch, a.selected)).join('')}</div>` : eligible && (batch.stop || a.error) ? '' : `<div class="card empty">${empty}</div>`}
    ${a.selected.length || batch.cards.length ? autoSelectionBar(s, a, batch) : ''}`
}
// The ⋯ menu beside Generate: the secondary draft actions, each with what it does.
function autoMoreMenu(batch, replaceWhy, draftsWhy) {
  const open = S.ui.courtMenu === 'auto-more'
  const item = (act, label, text, why, cls = '') =>
    `<button role="menuitem" class="${cls}" data-act="${act}" ${why ? 'disabled' : ''}><span>${label}</span><span class="why">${why || text}</span></button>`
  return `<div class="cmenu"><button class="btn sm ghost icon-btn" data-act="toggleCourtMenu" data-id="auto-more" aria-haspopup="menu" aria-expanded="${open}" aria-label="More draft actions" ${batch.cards.length ? '' : 'disabled'}>${I.more}</button>${
    open
      ? `<div class="cmenu-list" role="menu" aria-label="More draft actions">
    ${item('autoRegenerateUnselected', 'Replace unselected', 'Keeps the drafts you picked and makes new ones for the rest.', replaceWhy)}
    ${item('autoClearUnselected', 'Remove unselected', 'Keeps only the drafts you picked.', draftsWhy)}
    ${item('autoClear', 'Clear this tab', 'Removes every draft in this tab.', draftsWhy, 'danger')}
  </div>`
      : ''
  }</div>`
}
// A draft as a queue tile: same head, faces, VS and status line; tap anywhere to pick it.
function draftTile(s, m, batch, selected) {
  const pick = selected.indexOf(m.draftId) + 1
  const attention = all(m).some((p) => !R(s, p) || !R(s, p).present)
  const playing = all(m).some((p) => busyOf(s, p))
  const status = attention
    ? `<span class="status-line warn">${I.alert} A player is no longer present. Generate again.</span>`
    : playing
      ? `<span class="status-line muted">${I.info} A player is on court or playing now; this match waits until they are free.</span>`
      : `<span class="status-line muted">${I.info} ${esc(m.reason || 'Suggested by Generate matches')}</span>`
  const chips = (p) => {
    const played = gamesOf(s, p),
      queued = queuedCount(s, p),
      suggested = batch.cards.filter((d) => all(d).includes(p)).length
    return [
      played ? `<span class="qchip">${played} played</span>` : '',
      queued ? `<span class="qchip">${queued} queued</span>` : '',
      suggested > 1 ? `<span class="qchip">${suggested} suggested</span>` : '',
      busyOf(s, p)
        ? `<span class="qchip warn">${busyOf(s, p).status === 'oncourt' ? 'On court' : 'Playing now'}</span>`
        : '',
    ].join('')
  }
  const faces = (ids) =>
    `<div class="qfaces">${ids.map((p) => `<div class="qf">${avatar(P(p))}<span class="qf-n">${esc(short(p))}</span><span class="qchips">${chips(p)}</span></div>`).join('')}</div>`
  return `<article class="qtile draft ${attention ? 'attn' : ''}" role="button" tabindex="0" aria-pressed="${pick > 0}" data-act="autoToggle" data-id="${m.draftId}" aria-label="Draft ${esc(FORMAT_LABEL[m.format])}: ${esc(listNames(m.teamA))} vs ${esc(listNames(m.teamB))}${pick ? `, picked ${pick}` : ''}">
    ${pick ? `<span class="sel-badge" aria-hidden="true">${pick}</span>` : ''}
    <div class="qt-head">${chip('Draft')}${chip(FORMAT_LABEL[m.format], 'solid')}</div>
    ${faces(m.teamA)}<div class="vs">VS</div>${faces(m.teamB)}
    ${status}
  </article>`
}
// The Players tab's selection bar, reused for drafts: faces, "N selected", Clear and one primary.
function autoSelectionBar(s, a, batch) {
  const cards = Object.values(a.batches).flatMap((b) => b.cards)
  const faces = [
    ...new Set(
      a.selected.flatMap((id) => {
        const m = cards.find((c) => c.draftId === id)
        return m ? all(m) : []
      }),
    ),
  ]
  return `<div class="selbar" role="region" aria-label="Selected drafts">
    <div class="row" style="gap:6px;flex-wrap:nowrap;min-width:0"><span class="sel-faces">${faces
      .slice(0, 5)
      .map((pid) => avatar(P(pid)))
      .join(
        '',
      )}</span><span class="small"><b aria-live="polite">${a.selected.length} selected</b> · ${a.selected.length ? 'added in the order you picked' : 'tap drafts to pick them'}</span></div>
    <div class="row" style="flex-wrap:wrap"><button class="btn sm ghost" data-act="autoUnselect" ${a.selected.length ? '' : 'disabled'}>Clear</button><button class="btn sm" data-act="autoAddTab" ${batch.cards.length ? '' : 'disabled'}>Add all ${batch.cards.length}</button><button class="btn sm primary" data-act="autoReview" ${a.selected.length ? '' : 'disabled'}>Add ${a.selected.length} to Main Queue</button></div></div>`
}

export function generateDrafts(s, tab, count, target, fixed) {
  const players = s.roster
    .filter((r) => r.present && (tab === 'ahead' || !busyOf(s, r.pid)))
    .map((r) => r.pid)
  const formats = [...(s.doubles ? ['doubles'] : []), ...(s.singles ? ['singles'] : [])]
  if (!formats.length) return { error: 'Enable Singles or Doubles before generating.' }
  if (tab === 'catchup' && (!Number.isInteger(+target) || +target < 1 || target === ''))
    return { error: 'Enter a whole number of games, 1 or more.' }
  const load = Object.fromEntries(players.map((p) => [p, gamesOf(s, p) + queuedCount(s, p)]))
  fixed.forEach((m) =>
    all(m).forEach((p) => {
      if (p in load) load[p]++
    }),
  )
  const out = []
  let stop = ''
  for (let i = 0; i < count; i++) {
    if (tab === 'catchup' && players.every((p) => load[p] >= +target)) {
      stop = players.length
        ? `Everyone available reaches ${target} game${+target === 1 ? '' : 's'} with these matches.`
        : `Made 0 of ${count}: not enough free players for another match.`
      break
    }
    const fmt =
      formats.length === 2
        ? players.length >= 4 && i % 3 !== 2
          ? 'doubles'
          : 'singles'
        : formats[0]
    const size = fmt === 'doubles' ? 4 : 2
    if (players.length < size) {
      stop = `Made ${out.length} of ${count}: not enough ${tab === 'ahead' ? 'present' : 'free'} players for another match.`
      break
    }
    const sorted = players.slice().sort((x, y) => {
      const wait = restInfo(s, y).mins - restInfo(s, x).mins
      const priority =
        tab === 'catchup'
          ? (load[x] < +target ? 0 : 1) - (load[y] < +target ? 0 : 1) || load[x] - load[y]
          : tab === 'wait'
            ? load[x] - gamesOf(s, x) - (load[y] - gamesOf(s, y)) || wait
            : tab === 'ahead'
              ? Number(!!busyOf(s, x)) - Number(!!busyOf(s, y)) || load[x] - load[y]
              : load[x] - load[y]
      return priority || wait || players.indexOf(x) - players.indexOf(y)
    })
    const pick = sorted.slice(0, size)
    if (tab === 'catchup' && !pick.some((p) => load[p] < +target)) {
      stop = `Made ${out.length} of ${count}: no other match helps anyone reach ${target} game${+target === 1 ? '' : 's'}.`
      break
    }
    out.push({ format: fmt, ...splitTeams(s, pick, fmt) })
    pick.forEach((p) => load[p]++)
  }
  stop ||= `Made ${out.length} of ${count} match${count === 1 ? '' : 'es'}.`
  if (tab === 'catchup') {
    const remaining = players.reduce((sum, p) => sum + Math.max(0, +target - load[p]), 0)
    if (players.length && remaining === 0)
      stop = `Everyone available reaches ${target} game${+target === 1 ? '' : 's'} with these matches.`
    else if (remaining > 0)
      stop += ` ${remaining} more game${remaining === 1 ? ' is' : 's are'} still needed to reach ${target}.`
  }
  return { matches: out, stop }
}

// One row of the next queued matches on the Session tab; the last tile opens the full Queue tab.
export function upcomingPane(s) {
  const list = waiting(s)
  const cols = queueCols()
  const shown = list.slice(0, Math.max(1, cols - 1))
  const rest = list.length - shown.length
  const att = attention(s).length
  return `<div class="between"><h2>Upcoming queued matches</h2><span class="small muted">${list.length} waiting${att ? ` · <span style="color:var(--warn)">${att} need attention</span>` : ''}</span></div>
    <div class="qgrid" style="grid-template-columns:repeat(${cols}, minmax(0, 1fr))">
      ${shown.length ? shown.map((m, i) => queueCard(s, m, i, list.length, cols)).join('') : `<div class="card empty" style="grid-column:span ${Math.max(1, cols - 1)}">No matches queued yet.</div>`}
      <button class="qtile qmore" data-act="pane" data-k="queue" aria-label="More queues: open the Queue tab"><span class="plus" aria-hidden="true">→</span><b>More queues</b><span class="small muted">${rest > 0 ? `+${rest} more waiting` : list.length ? 'Reorder, add or regenerate' : 'Add or generate matches'}</span></button>
    </div>`
}
// Queue grid columns from the content width (window − rail − side padding): tiles of 220 px or more, 10 px gaps, no upper limit.
// Drafts carry chips under each name, so they need wider tiles to keep a doubles team on one row.
