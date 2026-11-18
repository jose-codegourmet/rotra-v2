import {
  chip,
  estimateGames,
  faceBtn,
  fmtFormats,
  formatMixLabel,
  notice,
  perGameOf,
  playerCountOf,
  selectLevel,
  sessionEstimate,
  sw,
} from '../fragments.js'
import {
  capacityOf,
  courtStart,
  courtUntil,
  esc,
  fmtDate,
  fmtDur,
  hhmm,
  initials,
  lvLabel,
  openSlots,
  P,
  perCourtOf,
  waitOf,
} from '../helpers.js'
import { addDays, fmtLongDate, I, ymdToTime } from '../icons.js'
import { LEVELS, MODES, S, todayAt } from '../state.js'
import {
  courtDuration,
  dayDiff,
  daysBetween,
  dtPicker,
  fmtRange,
  fmtWhen,
  fmtWhenRange,
} from '../time.js'
import { financeCalc, financeDraft, financePanel, peso, resultText } from './financials.js'

// ---------- Q-SETUP ----------
// `day` (midnight of a calendar date) pre-fills the date when a session is created from the calendar.
export function draftFrom(s, day) {
  const pad = (n) => String(n).padStart(2, '0')
  const d = new Date(s ? s.start : day || todayAt(19, 0) + 864e5)
  const dstr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const t = (x) => {
    const z = new Date(x)
    return `${pad(z.getHours())}:${pad(z.getMinutes())}`
  }
  return s
    ? {
        id: s.id,
        title: s.title,
        date: dstr,
        start: t(s.start),
        end: t(s.end),
        venue: s.venue,
        address: s.address,
        venueId: ((S.venues || []).find((v) => v.name === s.venue) || {}).id || null,
        courts: s.courts.map((c) => c.label),
        endDay: dayDiff(s.start, s.end),
        courtStarts: s.courts.map((c) => (c.startsAt ? t(c.startsAt) : '')),
        courtStartDays: s.courts.map((c) => (c.startsAt ? dayDiff(s.start, c.startsAt) : 0)),
        courtEnds: s.courts.map((c) => (c.until ? t(c.until) : '')),
        courtEndDays: s.courts.map((c) => (c.until ? dayDiff(s.start, c.until) : 0)),
        dayAware: true,
        singles: s.singles,
        doubles: s.doubles,
        mode: s.mode,
        minimum: s.minimum,
        minAuto: s.minAuto !== false,
        expected: s.expected || '',
        expectedAuto: !s.expected,
        perCourt: perCourtOf(s),
        notes: s.notes,
        ...financeDraft(s),
      }
    : {
        id: null,
        title: '',
        date: dstr,
        start: '19:00',
        end: '22:00',
        endDay: 0,
        venue: '',
        address: '',
        venueId: null,
        courts: ['Court 1', 'Court 2'],
        courtStarts: ['', ''],
        courtStartDays: [0, 0],
        courtEnds: ['', ''],
        courtEndDays: [0, 0],
        dayAware: true,
        singles: false,
        doubles: true,
        mode: 'fair',
        minimum: 4,
        minAuto: true,
        expected: 2 * (S.club.perCourt || 8),
        expectedAuto: true,
        perCourt: S.club.perCourt || 8,
        notes: '',
        ...financeDraft(null),
      }
}
// Three pages, each holding two sections, so a session can be set up quickly. Only page 1 has required fields;
// "Create session" works from any page and fills the rest with defaults.
export const WIZ_STEPS = ['Date, venue and courts', 'Formats, mode and minimum', 'Costs and review']
const WIZ_PARTS = [
  'Details',
  'Courts',
  'Formats and mode',
  'Minimum games',
  'Financials',
  'Notes and review',
]
export const WIZ_FIELD_STEP = {
  title: 0,
  venue: 0,
  when: 0,
  end: 0,
  expected: 1,
  minimum: 1,
  courtFee: 2,
  entryFee: 2,
  payFee: 2,
}
// Recurring sessions. Every date is checked against the club's other sessions: overlapping times at another venue
// is a time clash, overlapping times at the same venue a venue clash. Clashing dates are never created.
const REPEATS = {
  none: 'Does not repeat',
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
}
// A setup time is a clock time plus its day: 0 is the session date, 1 the next day. The day is chosen, never guessed.
export function draftAt(d, hm, day = 0) {
  const [y, mo, da] = d.date.split('-').map(Number),
    [h, mi] = hm.split(':').map(Number)
  return new Date(y, mo - 1, da + (day || 0), h, mi).getTime()
}
export const draftTimes = (d) => ({ start: draftAt(d, d.start), end: draftAt(d, d.end, d.endDay) })
export const draftEndOk = (t) => t.end > t.start && t.end - t.start <= 864e5
function clashOf(d, start, end) {
  const other = S.sessions
    .filter(
      (x) =>
        x.id !== d.id &&
        x.status !== 'invalid' &&
        x.status !== 'cancelled' &&
        x.start < end &&
        start < x.end,
    )
    .sort((a, b) => (b.venue === d.venue) - (a.venue === d.venue))[0]
  if (!other) return null
  const when = fmtRange(other.start, other.end)
  return d.venue && other.venue === d.venue
    ? {
        kind: 'venue',
        id: other.id,
        text: `Venue clash: ${other.venue} is already booked for ${other.title}, ${when}`,
      }
    : {
        kind: 'time',
        id: other.id,
        text: `Time clash: ${other.title} runs ${when} at ${other.venue}`,
      }
}
export function occurrences(d) {
  const { start, end } = draftTimes(d)
  const n =
    !d.id && d.repeat && d.repeat !== 'none' ? Math.max(2, Math.min(12, +d.repeatCount || 4)) : 1
  const out = []
  for (let i = 0; i < n; i++) {
    const t = new Date(start)
    if (d.repeat === 'weekly') t.setDate(t.getDate() + 7 * i)
    else if (d.repeat === 'biweekly') t.setDate(t.getDate() + 14 * i)
    else if (d.repeat === 'monthly') {
      const day = t.getDate()
      t.setDate(1)
      t.setMonth(t.getMonth() + i)
      t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()))
    }
    const s0 = t.getTime(),
      s1 = s0 + (end - start)
    out.push({ start: s0, end: s1, clash: clashOf(d, s0, s1) })
  }
  return out
}
export function whenError(d) {
  const occ = occurrences(d)
  if (occ.some((o) => !o.clash)) return null
  return occ.length > 1
    ? 'Every date clashes with another session. Change the start date, time or venue.'
    : `${occ[0].clash.text}. Pick another date or time.`
}
function repeatPanel(d, e) {
  const occ = occurrences(d)
  const rep = !d.id && d.repeat && d.repeat !== 'none'
  const clashes = occ.filter((o) => o.clash).length
  const list = rep
    ? `<div class="occ-list" aria-label="Session dates">${occ
        .map(
          (o) => `<div class="occ ${o.clash ? 'bad' : ''}">
      <span>${o.clash ? I.alert : I.check}</span><div class="main"><b>${fmtDate(o.start)}</b> <span class="small muted">${fmtRange(o.start, o.end)}</span>${o.clash ? `<div class="small">${esc(o.clash.text)} · <b>skipped</b> <button class="btn xs" data-act="peekSession" data-id="${o.clash.id}">View it</button></div>` : ''}</div></div>`,
        )
        .join('')}</div>
    <p class="small ${clashes ? '' : 'muted'}">${occ.length - clashes} session${occ.length - clashes === 1 ? '' : 's'} will be created${clashes ? `; ${clashes} clashing date${clashes > 1 ? 's are' : ' is'} skipped` : ''}. They're separate sessions you can edit one by one.</p>`
    : ''
  return `${
    d.id
      ? ''
      : `<div class="fgrid">
      <label class="field"><span>Repeats</span><select class="input" id="f-repeat" data-act-change="draftSel" data-k="repeat">${Object.entries(
        REPEATS,
      )
        .map(
          ([k, l]) =>
            `<option value="${k}" ${(d.repeat || 'none') === k ? 'selected' : ''}>${l}</option>`,
        )
        .join('')}</select></label>
      ${rep ? `<div class="field"><span>Number of sessions</span><div class="row"><button class="btn sm icon-btn" data-act="repeatCount" data-d="-1" aria-label="Fewer sessions" ${(+d.repeatCount || 4) <= 2 ? 'disabled' : ''}>−</button><b class="tnum" style="font-size:20px;min-width:28px;text-align:center" aria-live="polite">${Math.max(2, Math.min(12, +d.repeatCount || 4))}</b><button class="btn sm icon-btn" data-act="repeatCount" data-d="1" aria-label="More sessions" ${(+d.repeatCount || 4) >= 12 ? 'disabled' : ''}>+</button></div></div>` : ''}
    </div>`
  }
    ${e.when ? `<span class="err">${esc(e.when)}</span>` : !rep && occ[0].clash ? notice('bad', `${esc(occ[0].clash.text)}. Pick another date or time. <button class="btn xs" data-act="peekSession" data-id="${occ[0].clash.id}">View it</button>`) : ''}
    ${list}`
}
// Any step can be opened from the step bar. A step glows green once it has been visited (every step counts as
// visited when editing a saved session) and its required fields are valid; a visited step missing details shows "!".
function wizStepState(d, i) {
  const rosterN = d.id ? (S.sessions.find((x) => x.id === d.id) || { roster: [] }).roster.length : 0
  const okInt = (v, min) => v !== '' && v != null && Number.isInteger(+v) && +v >= min
  const valid = [
    () =>
      !!d.title.trim() &&
      !!d.venue.trim() &&
      draftEndOk(draftTimes(d)) &&
      !whenError(d) &&
      d.courts.length >= 1,
    () =>
      (rosterN > 0 || d.expected === '' || okInt(d.expected, 1)) &&
      (d.minAuto || okInt(d.minimum, 0)),
    () =>
      (d.courtFee === '' || +d.courtFee >= 0) &&
      (d.entryFee === '' || +d.entryFee >= 0) &&
      (!d.custom || (d.payFee !== '' && +d.payFee >= 0)),
  ][i]()
  if (!d.id && !(d.visited || []).includes(i)) return 'todo'
  return valid ? 'done' : 'warn'
}
export const markVisited = (d) => {
  d.visited = [...new Set([...(d.visited || []), d.step])]
}
export function viewSetup() {
  const d = S.ui.draft
  const e = S.ui.errors
  if (d.step == null) d.step = 0
  if (!d.wiz3) {
    const m = [0, 0, 1, 1, 2, 2]
    d.step = m[d.step] ?? 0
    d.visited = [...new Set((d.visited || []).map((i) => m[i] ?? 0))]
    d.wiz3 = true
  }
  if (d.maxStep == null) d.maxStep = d.id ? WIZ_STEPS.length - 1 : 0
  d.courtStarts ||= d.courts.map(() => '')
  d.courtEnds ||= d.courts.map(() => '')
  if (!d.dayAware) {
    // A draft saved before times carried their day: read it the way it was entered (an earlier clock time was the next day).
    const m = (t) => {
      const [h, mi] = (t || '0:0').split(':').map(Number)
      return h * 60 + mi
    }
    d.endDay = m(d.end) <= m(d.start) ? 1 : 0
    d.courtStartDays = d.courtStarts.map((v) => (v && m(v) < m(d.start) ? 1 : 0))
    d.courtEndDays = d.courtEnds.map((v) => (v && m(v) < m(d.start) ? 1 : 0))
    d.dayAware = true
  }
  d.courtStartDays ||= d.courts.map(() => 0)
  d.courtEndDays ||= d.courts.map(() => 0)
  if (!Array.isArray(d.shuttles))
    Object.assign(d, financeDraft(d.id ? S.sessions.find((x) => x.id === d.id) : null))
  const span = draftTimes(d),
    base = ymdToTime(d.date),
    endOk = draftEndOk(span)
  const durMins = endOk ? Math.round((span.end - span.start) / 60000) : 0
  const dayOf = (hm, day) => (hm ? draftAt(d, hm, day) : null)
  const clearErr = (k) => {
    delete S.ui.errors[k]
  }
  const courtDays = endOk ? daysBetween(span.start, span.end) : [base]
  const courtPickers = (i) => {
    const cs = dayOf(d.courtStarts[i], d.courtStartDays[i]),
      ce = dayOf(d.courtEnds[i], d.courtEndDays[i])
    return (
      dtPicker({
        k: `draft.cs.${i}`,
        label: 'Planned start',
        id: `f-cs-${i}`,
        value: cs,
        fallback: span.start,
        days: courtDays,
        base,
        emptyLabel: 'Session start',
        hint: 'Empty means session start',
        ok: (t) => t >= span.start && t < span.end,
        set: (t) => {
          d.courtStarts[i] = t == null ? '' : hhmm(t)
          d.courtStartDays[i] = t == null ? 0 : dayDiff(base, t)
          clearErr('courts')
        },
      }) +
      dtPicker({
        k: `draft.ce.${i}`,
        label: 'Planned end',
        id: `f-ce-${i}`,
        value: ce,
        fallback: span.end,
        days: courtDays,
        base,
        emptyLabel: 'Session end',
        hint: 'Empty follows session end',
        ok: (t) => t > (cs ?? span.start) && t <= span.end,
        set: (t) => {
          d.courtEnds[i] = t == null ? '' : hhmm(t)
          d.courtEndDays[i] = t == null ? 0 : dayDiff(base, t)
          clearErr('courts')
        },
      })
    )
  }
  const rosterN = d.id ? (S.sessions.find((x) => x.id === d.id) || { roster: [] }).roster.length : 0
  const slots = d.courts.length * (+d.perCourt || 8)
  // Untouched Expected players follows the slot budget; a typed number sticks.
  if (d.expectedAuto) d.expected = slots
  const nPlayers = rosterN || +d.expected || slots
  const per = perGameOf(d)
  const est = estimateGames(d.courts.length, durMins, nPlayers, per)
  const last = WIZ_STEPS.length - 1
  const stepErr = Object.keys(e).some((k) => WIZ_FIELD_STEP[k] === d.step)
  const parts = [
    `<label class="field"><span>Session title</span><input class="input${e.title ? ' bad' : ''}" id="f-title" data-bind="ui.draft.title" value="${esc(d.title)}" placeholder="e.g. Thursday Open Play">${e.title ? `<span class="err">${e.title}</span>` : ''}</label>
      <div class="fgrid">
        <div class="field"><span>Date</span><button type="button" class="input date-btn" id="f-date" data-act="openDatePicker" aria-haspopup="dialog" aria-label="Date, ${esc(fmtLongDate(ymdToTime(d.date)))}. Change date">${I.cal}<span>${esc(fmtLongDate(ymdToTime(d.date)))}</span></button></div>
        ${dtPicker({
          k: 'draft.start',
          label: 'Starts',
          id: 'f-start',
          value: span.start,
          days: [base],
          ok: () => true,
          set: (t) => {
            d.start = hhmm(t)
            clearErr('end')
          },
        })}
        ${dtPicker({
          k: 'draft.end',
          label: 'Ends',
          id: 'f-end',
          value: span.end,
          days: [base, addDays(base, 1)],
          base,
          ok: (t) => t > span.start && t <= span.start + 864e5,
          set: (t) => {
            d.end = hhmm(t)
            d.endDay = dayDiff(base, t)
            clearErr('end')
          },
          err: e.end || (endOk ? '' : 'Choose an end after the start.'),
          hint: `${d.endDay ? 'Ends the next day · ' : ''}${courtDuration(durMins)}`,
        })}
      </div>
      ${repeatPanel(d, e)}
      <div class="field"><span>Venue</span><button type="button" class="input date-btn${e.venue ? ' bad' : ''}" id="f-venue" data-act="openVenue" aria-haspopup="dialog" aria-label="Venue: ${esc(d.venue || 'none chosen')}. Choose venue">${I.pin}<span class="stack tight" style="gap:0;min-width:0">${d.venue ? `<b>${esc(d.venue)}</b>${d.address ? `<span class="small muted">${esc(d.address)}</span>` : ''}` : '<span class="muted">Choose or add a venue</span>'}</span></button>${e.venue ? `<span class="err">${e.venue}</span>` : ''}</div>
      <p class="hint">The venue can differ from where your club was founded. It doesn't change your club's founding address.</p>`,
    `<div class="between"><span>How many courts did you book?</span><div class="row"><button class="btn sm icon-btn" data-act="courtCount" data-d="-1" aria-label="Remove a court" ${d.courts.length <= 1 ? 'disabled' : ''}>−</button><b class="tnum" style="font-size:22px;min-width:28px;text-align:center" aria-live="polite">${d.courts.length}</b><button class="btn sm icon-btn" data-act="courtCount" data-d="1" aria-label="Add a court">+</button></div></div>
      <div class="stack">${d.courts.map((c, i) => `<div class="fgrid"><label class="field"><span>Court ${i + 1} label</span><input class="input" id="f-court-${i}" data-bind="ui.draft.courts.${i}" value="${esc(c)}"></label>${courtPickers(i)}</div>`).join('')}</div>${e.courts ? `<span class="err">${esc(e.courts)}</span>` : ''}
      <div class="between"><div><span>Players per court</span><p class="hint">How many players you budget for each court you reserve.</p></div><div class="row"><button class="btn sm icon-btn" data-act="perCourt" data-d="-1" aria-label="Fewer players per court" ${(+d.perCourt || 8) <= 2 ? 'disabled' : ''}>−</button><b class="tnum" style="font-size:22px;min-width:28px;text-align:center" aria-live="polite">${+d.perCourt || 8}</b><button class="btn sm icon-btn" data-act="perCourt" data-d="1" aria-label="More players per court" ${(+d.perCourt || 8) >= 20 ? 'disabled' : ''}>+</button></div></div>
      ${notice('ok', `<b>${d.courts.length * (+d.perCourt || 8)} slots</b>: ${d.courts.length} court${d.courts.length > 1 ? 's' : ''} × ${+d.perCourt || 8} players. Anyone added after that goes on the waitlist.`)}
      ${(() => {
        const ex = d.id && S.sessions.find((x) => x.id === d.id),
          cap = d.courts.length * (+d.perCourt || 8)
        if (!ex || ex.status !== 'prepared') return ''
        if (ex.roster.length > cap)
          return notice(
            'warn',
            `<b>${ex.roster.length} players already have a slot.</b> With ${cap} slots, the last ${ex.roster.length - cap} added move to the front of the waitlist when you save, in the order they joined.`,
          )
        const n = Math.min(cap - ex.roster.length, (ex.waitlist || []).length)
        return n
          ? notice(
              '',
              `When you save, the first ${n} on the waitlist get the new slot${n > 1 ? 's' : ''}.`,
            )
          : ''
      })()}
      <p class="hint">You can still add or remove free courts during the session; slots follow the court count.</p>`,
    `<div class="li" style="padding:0"><div class="main"><h3>Singles</h3><p class="small muted">Include standard singles when generating matches.</p></div>${sw(d.singles, 'toggleDraft', 'data-k="singles"', 'Singles')}</div>
      <div class="li" style="padding:0"><div class="main"><h3>Doubles</h3><p class="small muted">Include standard doubles when generating matches.</p></div>${sw(d.doubles, 'toggleDraft', 'data-k="doubles"', 'Doubles')}</div>
      ${!d.singles && !d.doubles ? notice('warn', 'With both formats off, Generate matches has nothing to make. Only manual fun games would be possible.') : ''}
      <div class="field"><span>Mode</span><div class="choices">${Object.entries(MODES)
        .map(
          ([k, m]) =>
            `<button class="choice" data-act="setDraft" data-k="mode" data-v="${k}" aria-pressed="${d.mode === k}"><b>${m.label}</b><span class="small muted">${m.text}</span></button>`,
        )
        .join('')}</div>
      <span class="hint">An easy game means that player's team is favored to win. Modes are flexible pairing presets. You can always change a match yourself.</span></div>`,
    `<div class="between"><span>Minimum completed games per player</span>${d.minAuto ? chip('Calculated', 'ok') : chip('Set by you')}</div>
      <div class="fgrid">
        ${
          rosterN
            ? `<div class="field"><span>Players</span><span>${rosterN} on the roster</span><span class="hint">Updates as you add or remove players.</span></div>`
            : `<label class="field"><span>Expected players</span><input class="input${e.expected ? ' bad' : ''}" id="f-expected" type="number" min="1" step="1" inputmode="numeric" data-bind="ui.draft.expected" data-num data-rerender value="${esc(d.expected)}" placeholder="${slots}">${e.expected ? `<span class="err">${e.expected}</span>` : `<span class="hint">${d.expectedAuto ? `Follows your ${slots} slots until you change it.` : `Your best guess. Clear it to follow your ${slots} slots again.`} The roster replaces it once you add players.</span>`}</label>`
        }
        <div class="field"><span>Estimate</span><span><b class="tnum" style="font-size:20px">${nPlayers ? `${est.low}–${est.high}` : '—'}</b> games each</span><span class="hint">${est.usable} of ${d.courts.length} court${d.courts.length > 1 ? 's' : ''} × ${courtDuration(durMins)} of ${formatMixLabel(d)} at 15–20 min a game. About ${Math.min(nPlayers, Math.round(est.usable * per))} of ${nPlayers || '?'} players are on court at once${per < 4 ? ', so each player gets fewer turns than in doubles' : ''}.</span></div>
        <label class="field"><span>Minimum</span><input class="input${e.minimum ? ' bad' : ''}" id="f-min" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.draft.minimum" data-num value="${esc(d.minAuto ? est.low : d.minimum)}" ${d.minAuto ? 'disabled' : ''}>${e.minimum ? `<span class="err">${e.minimum}</span>` : `<span class="hint">${d.minAuto ? 'Uses the 20-minute end so everyone can reach it.' : `Estimate suggests ${est.low}.`}</span>`}</label>
      </div>
      <div class="row">${d.minAuto ? '<button class="btn xs" data-act="manualMinimum">Set it yourself</button>' : '<button class="btn xs" data-act="useEstimate">Use the estimate</button>'}</div>
      <p class="hint">Full fun games count toward it. Partial games don’t, unless you give a substitute the game; invalid games never do. It’s a target, not a guarantee.</p>`,
    financePanel(d, durMins, nPlayers, e),
    `<label class="field"><span>Notes (optional)</span><textarea class="input" id="f-notes" data-bind="ui.draft.notes">${esc(d.notes)}</textarea><span class="hint">Shown on the public session page.</span></label>
      <div class="card stack" style="background:var(--bg)"><span class="label">Review</span>
        <dl class="kv">
          <dt>Session</dt><dd>${esc(d.title || 'Untitled')} <button class="btn xs ghost" data-act="wizGo" data-k="0">Edit</button></dd>
          <dt>When</dt><dd>${esc(d.date)} · ${endOk ? `${fmtRange(span.start, span.end)} (${courtDuration(durMins)})` : 'Choose an end after the start'}</dd>
          ${
            !d.id && d.repeat && d.repeat !== 'none'
              ? (
                  () => {
                    const occ = occurrences(d),
                      ok = occ.filter((o) => !o.clash).length
                    return `<dt>Repeats</dt><dd>${REPEATS[d.repeat]} · ${ok} session${ok === 1 ? '' : 's'}${occ.length - ok ? ` <span class="small" style="color:var(--warn)">(${occ.length - ok} clashing date${occ.length - ok > 1 ? 's' : ''} skipped)</span>` : ''}</dd>`
                  }
                )()
              : ''
          }
          <dt>Venue</dt><dd>${esc(d.venue || '—')}${d.address ? `<br><span class="small muted">${esc(d.address)}</span>` : ''}</dd>
          <dt>Courts</dt><dd>${d.courts.map((c) => esc(c)).join(', ')} · ${+d.perCourt || 8} per court (${d.courts.length * (+d.perCourt || 8)} slots) <button class="btn xs ghost" data-act="wizGo" data-k="0">Edit</button></dd>
          <dt>Formats</dt><dd>${fmtFormats(d)} · ${MODES[d.mode].label} <button class="btn xs ghost" data-act="wizGo" data-k="1">Edit</button></dd>
          <dt>Minimum</dt><dd>${d.minAuto ? est.low : esc(d.minimum)} games per player ${d.minAuto ? '(calculated)' : ''} <button class="btn xs ghost" data-act="wizGo" data-k="1">Edit</button></dd>
          <dt>Costs</dt><dd>${(() => {
            const c = financeCalc(d, d.courts.length, durMins, nPlayers)
            return `${peso(c.total)} total · players pay ${peso(c.perHead)}${c.custom ? ' (custom)' : ' (break-even)'} · ${resultText(c)}`
          })()}</dd>
        </dl></div>`,
  ]
  return `<main class="wrap narrow">
    <div class="crumb"><button class="btn sm ghost" data-act="cancelSetup">${I.back} ${d.id ? 'Back to preparation' : 'Home'}</button></div>
    <div class="stack tight"><h1>${d.id ? 'Edit preparation' : 'Create session'}</h1><p class="muted small">For ${esc(S.club.name)}. Saving needs an internet connection.</p></div>
    <div class="stack tight"><ol class="wiz-steps" aria-label="Steps">${WIZ_STEPS.map((t, i) => {
      const here = i === d.step,
        st = here ? '' : wizStepState(d, i)
      return `<li><button class="${st}" ${here ? 'aria-current="step"' : ''} data-act="wizGo" data-k="${i}" aria-label="Step ${i + 1}, ${t}${here ? ', current step' : st === 'done' ? ', complete' : st === 'warn' ? ', needs details' : ''}"><span class="num">${st === 'done' ? '✓' : st === 'warn' ? '!' : i + 1}</span><span class="lbl">${t}</span></button></li>`
    }).join('')}</ol>
    <p class="hint">${d.id ? 'Tap any step to jump to it.' : 'Only page 1 is required; the rest uses sensible defaults you can change later. Create session is on page 3.'} Finished steps glow green.</p></div>
    ${!S.online ? notice('warn', "You're offline. You can fill this in, but it isn't saved until you reconnect. A draft can't be run offline.") : ''}
    ${stepErr ? notice('bad', 'Fix the highlighted fields to continue.') : ''}
    <section class="card stack" aria-labelledby="wiz-title"><div><span class="label">Step ${d.step + 1} of ${WIZ_STEPS.length}</span><h2 id="wiz-title">${WIZ_STEPS[d.step]}</h2></div>
      ${[d.step * 2, d.step * 2 + 1].map((k, n) => `<div class="wiz-part${n ? ' next' : ''}"><h3>${WIZ_PARTS[k]}</h3>${parts[k]}</div>`).join('')}</section>
    <div class="between">
      <button class="btn" data-act="${d.step === 0 ? 'cancelSetup' : 'wizBack'}">${d.step === 0 ? 'Cancel' : 'Back'}</button>
      <div class="row">${d.step === last ? `<button class="btn primary" data-act="saveSetup" ${!S.online ? 'disabled' : ''}>${d.id ? 'Save changes' : 'Create session'}</button>` : '<button class="btn primary" data-act="wizNext">Next</button>'}</div>
    </div>
  </main>`
}

// Waitlist panel, shared by preparation and the live Players view.
// Slots used against the budget, so the operator sees how many more fit before the waitlist starts.
// How the club's level compares with the Player Information suggestion: higher (may be too high), lower (may be too low), or the same.
export function levelDiff(level, sugg, id) {
  if (level == null || level === '' || sugg == null) return ''
  const d = +level - sugg,
    n = Math.abs(d)
  if (!d) return `<span class="lv-diff same" id="${id}">${I.check} Matches suggestion</span>`
  return `<span class="lv-diff ${d > 0 ? 'up' : 'down'}" id="${id}"><b aria-hidden="true">${d > 0 ? '▲' : '▼'}</b> ${d > 0 ? 'May be too high' : 'May be too low'} · ${n} level${n > 1 ? 's' : ''} ${d > 0 ? 'above' : 'below'} suggestion</span>`
}
// Session link and guest join requests. The public session page doubles as the invite link: guests read the details
// and can send a quick request; nothing is admitted until the Queue Master confirms it in preparation or the console.
export const sessionLink = (s) =>
  window.mountPrototypeRouter
    ? `${location.origin}/queue/s/${encodeURIComponent(s.id)}`
    : `https://rotra.app/s/${s.id
        .replace(/[^a-z0-9]/gi, '')
        .slice(-6)
        .toLowerCase()}`
export const pendingReqs = (s) =>
  (s.requests || []).filter((r) => r.status === 'pending').sort((a, b) => a.at - b.at)
export const BAND_CHOICES = [
  ['Beginner', 'Beginner'],
  ['Intermediate', 'Intermediate'],
  ['Advanced', 'Advanced'],
  ['unsure', 'Not sure'],
]
export const bandMid = (band) => {
  const ix = LEVELS.map((l, i) => [l, i])
    .filter(([l]) => l.band.startsWith(band))
    .map(([, i]) => i)
  return ix.length ? ix[Math.floor(ix.length / 2)] : null
}
function linkCard(s) {
  const n = pendingReqs(s).length,
    on = s.acceptReq !== false
  return `<section class="card stack" id="session-link"><div class="between"><div><h2>Session link</h2><p class="small muted">Share it in your Facebook post or group chat. Anyone with it sees the public page; guests can send a join request, and nobody gets a slot until you confirm them.</p></div>${n ? chip(`${n} join request${n > 1 ? 's' : ''}`, 'warn') : ''}</div>
    <div class="invite-link"><input class="input" id="session-link-in" readonly value="${sessionLink(s)}" aria-label="Session link"><button class="btn sm primary" data-act="copyLink">Copy link</button></div>
    <div class="row acts"><button class="btn sm" data-act="openGuest">Open as a guest</button><button class="btn sm" data-act="go" data-to="public">Preview public page</button></div>
    <div class="li" style="padding:0"><div class="main"><b>Accept join requests</b><p class="small muted">${on ? 'Guests can request a slot from the public page.' : 'The public page says to contact the Queue Master instead.'}</p></div>${sw(on, 'toggleAcceptReq', '', 'Accept join requests')}</div>
  </section>`
}
export function requestsPanel(s, inSheet) {
  const list = pendingReqs(s),
    done = (s.requests || []).filter((r) => r.status !== 'pending')
  const full = s.status !== 'active' && openSlots(s) === 0
  if (!list.length)
    return `<section class="${inSheet ? '' : 'card '}stack" id="join-requests"><h2>Join requests</h2><p class="small muted">No requests waiting.${done.length ? ` ${done.filter((r) => r.status === 'confirmed').length} confirmed, ${done.filter((r) => r.status === 'declined').length} declined so far.` : ' Guests who open the session link can ask for a slot; they show up here.'}</p></section>`
  return `<section class="${inSheet ? '' : 'card '}stack" id="join-requests"><div><h2>Join requests · ${list.length}</h2><p class="small muted">Check each one is a real person you expect (ask at the door, or match their name and phone) before confirming. Oldest first.${full ? ' Slots are full, so confirmed guests go on the waitlist.' : ''}</p></div>
    <div class="list">${list
      .map((r) => {
        const lv = r.level ?? (r.band !== 'unsure' ? bandMid(r.band) : null)
        return `<div class="req-row">
      <div class="li" style="padding:0"><span class="avatar" aria-hidden="true">${esc(initials(r.name))}</span><div class="main"><b>${esc(r.name)}${r.nick ? ` <span class="muted">“${esc(r.nick)}”</span>` : ''}</b>
        <p class="small muted">${r.phone ? esc(r.phone) : 'No phone given'} · says ${r.band === 'unsure' ? 'not sure of level' : esc(r.band)} · requested ${fmtWhen(r.at, { lower: true })}</p></div>${chip('Guest request', 'warn')}</div>
      <div class="req-actions">${selectLevel(`req-lv-${r.id}`, lv, `data-act-change="reqLevel" data-id="${r.id}" aria-label="Level for ${esc(r.name)}"`, r.err && lv == null)}
        <div class="row"><button class="btn sm" data-act="declineReq" data-id="${r.id}">Decline</button><button class="btn sm primary" data-act="confirmReq" data-id="${r.id}">${full ? 'Confirm to waitlist' : 'Confirm guest'}</button></div></div>
      ${r.err ? `<span class="err">${esc(r.err)}</span>` : ''}</div>`
      })
      .join('')}</div></section>`
}
export function joinCard(s) {
  if (s.status !== 'prepared' && s.status !== 'active') return ''
  const mine =
    S.ui.guestReq && S.ui.guestReq.sid === s.id
      ? (s.requests || []).find((r) => r.id === S.ui.guestReq.id)
      : null
  if (mine) {
    const wl = mine.pid ? waitOf(s).findIndex((w) => w.pid === mine.pid) : -1
    const [cls, title, text] =
      mine.status === 'pending'
        ? [
            'warn',
            'Request sent',
            `Thanks, ${esc(mine.name)}. The Queue Master confirms every guest, usually at the venue. Your slot isn't held until they do.`,
          ]
        : mine.status === 'declined'
          ? [
              'bad',
              'Request not accepted',
              "The Queue Master didn't confirm this request. Contact them if you think it's a mistake.",
            ]
          : wl >= 0
            ? [
                'ok',
                `Confirmed · waitlist #${wl + 1}`,
                "You're on the waitlist. Ask the Queue Master about a slot.",
              ]
            : [
                'ok',
                'Confirmed · you have a slot',
                'See you on court. Your name is now in Participants.',
              ]
    return `<section class="card stack join-card">${notice(cls, `<b>${title}</b><br>${text}`)}</section>`
  }
  const open = openSlots(s)
  if (s.acceptReq === false)
    return '<section class="card join-card"><p class="small muted">This session isn\'t taking requests online. Contact the Queue Master to play.</p></section>'
  return `<section class="card stack join-card"><div class="between"><div><h2>Want to play?</h2><p class="small muted">${s.status === 'active' ? 'The Queue Master can admit additional players.' : open ? `${open} of ${capacityOf(s)} slots open.` : 'All slots are taken; confirmed guests join the waitlist.'} Send a quick request and the Queue Master confirms it.</p></div>
    <button class="btn primary" data-act="openJoin">Request to join</button></div></section>`
}
export function slotMeter(s) {
  const n = s.roster.length,
    cap = capacityOf(s),
    open = cap - n,
    wl = (s.waitlist || []).length
  const state = open <= 0 ? 'full' : open <= 2 ? 'near' : 'ok'
  const text =
    s.status === 'active'
      ? `${open < 0 ? `${-open} over budget` : open === 0 ? 'Budget full' : `${open} within budget`} · additional players can be admitted`
      : open > 0
        ? `${open} left before the waitlist`
        : open === 0
          ? 'Full · new players go on the waitlist'
          : `${-open} over budget · new players go on the waitlist`
  return `<div class="slot-meter ${state}"><div class="sm-top"><b class="tnum">${n}/${cap}</b><span>slots · ${text}${wl ? ` · ${wl} on the waitlist` : ''}</span></div>
    <div class="sm-bar" role="meter" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${Math.min(n, cap)}" aria-label="Slots used: ${n} of ${cap}"><i style="width:${Math.min(100, cap ? (n / cap) * 100 : 100)}%"></i></div></div>`
}
export function waitlistPanel(s) {
  const wl = waitOf(s),
    open = openSlots(s),
    cap = capacityOf(s)
  return `<section class="card stack" id="waitlist"><div class="between"><div><h2>Waitlist${wl.length ? ` · ${wl.length}` : ''}</h2><p class="small muted">Slots: <b>${s.roster.length} of ${cap}</b> used (${s.courts.length} court${s.courts.length > 1 ? 's' : ''} × ${perCourtOf(s)} players)${open ? ` · ${open} open` : ' · full'}. ${s.status === 'active' ? 'Choose any player to admit.' : 'First come, first served.'}</p></div>
      ${wl.length && open ? `<button class="btn sm primary" data-act="fillSlots">Fill ${Math.min(open, wl.length)} open slot${Math.min(open, wl.length) > 1 ? 's' : ''}</button>` : ''}</div>
    ${
      wl.length
        ? `<div class="list">${wl
            .map((w, i) => {
              const p = P(w.pid)
              return `<div class="li wait-row"><span class="qt-pos">#${i + 1}</span>${faceBtn(p)}<div class="main"><b>${esc(p.name)}</b><p class="small muted">${esc(lvLabel(w.level))} · waiting since ${fmtWhen(w.at, { lower: true })}</p></div>
      <button class="btn xs ${s.status === 'active' || open ? 'primary' : ''}" data-act="giveSlot" data-pid="${w.pid}" ${s.status === 'active' || open ? '' : 'title="Over your slot budget"'}>${s.status === 'active' ? 'Admit player' : open ? 'Give slot' : 'Give slot anyway'}</button><button class="btn xs ghost icon-btn" data-act="removeWait" data-pid="${w.pid}" aria-label="Remove ${esc(p.name)} from the waitlist">${I.x}</button></div>`
            })
            .join('')}</div>`
        : `<p class="small muted">${s.status === 'active' || open ? 'Nobody is waiting.' : 'Nobody is waiting. Players added from now on join the waitlist.'}</p>`
    }
  </section>`
}

// Preparation Overview tab: setup summary, this device, and the session link.
export function prepOverview(s) {
  const est = sessionEstimate(s)
  const live = s.status === 'active'
  const courtWindowText = (c) => {
    return `${fmtWhenRange(courtStart(s, c), courtUntil(s, c))}${c.until ? ' · set time' : ' · follows session end'}`
  }
  const present = s.roster.filter((r) => r.present).length
  const dl = {
    none: ['Not downloaded on this device', ''],
    downloading: ['Downloading…', 'warn'],
    ready: ['Ready on this device', 'ok'],
  }[s.download]
  return `    <div class="${live ? 'stack' : 'grid2'}">
      <section class="card stack${live ? ' live-settings' : ''}"><h2>Setup</h2><dl class="kv">
        <dt>Courts</dt><dd>${s.courts.map((c) => (live ? `${esc(c.label)} · ${courtWindowText(c)}` : esc(c.label))).join(live ? '<br>' : ', ')}</dd>
        <dt>Formats</dt><dd>${fmtFormats(s)}${live ? ' · <span class="small muted">Fixed after start</span>' : ''}</dd>
        <dt>Mode</dt><dd>${MODES[s.mode].label} · <span class="muted">${MODES[s.mode].text}</span>${live ? ' · <span class="small muted">Fixed after start</span>' : ''}</dd>
        <dt>Minimum</dt><dd>${s.minimum} completed games per player<br><span class="small muted">${live ? `Fixed after start · ${s.minAuto !== false ? 'Calculated before start' : 'Set by you'}.` : s.minAuto !== false ? `Calculated: ${playerCountOf(s)} players on ${est.usable} court${est.usable > 1 ? 's' : ''} for ${fmtDur(s.start, s.end)} gives about ${est.low}–${est.high} games each. Updates as the roster changes.` : `Set by you. The estimate suggests ${est.low}–${est.high}.`}</span></dd>
        <dt>Roster</dt><dd>${s.roster.length} confirmed · ${present} present</dd>
        ${
          s.finance
            ? (
                () => {
                  const c = financeCalc(
                    s.finance,
                    s.courts.length,
                    Math.round((s.end - s.start) / 60000),
                    s.roster.length || s.expected,
                  )
                  return `<dt>Costs</dt><dd>${peso(c.total)} estimated · ${peso(c.share)} a player to break even<br><span class="small muted">Players pay ${peso(c.perHead)}${c.custom ? ' (custom amount)' : ' (break-even)'}</span> · ${resultText(c)}</dd>`
                }
              )()
            : ''
        }${live && s.notes ? `<dt>Notes</dt><dd>${esc(s.notes)}</dd>` : ''}</dl>
      ${live ? `<div class="row acts"><button class="btn sm" data-act="openAdjust">Courts and time</button><button class="btn sm" data-act="openAdd">Add player</button><button class="btn sm" data-act="openRequests">Join requests · ${pendingReqs(s).length}</button><button class="btn sm" data-act="openPayments">Payments</button></div>` : ''}</section>
      ${
        !live
          ? `<section class="card stack"><div class="between"><h2>This device</h2>${chip(dl[0], dl[1])}</div>
        <p class="small muted">Download the session so this device can keep running it if the venue's internet drops. A download on one device doesn't prepare any other device.</p>
        <div class="row"><button class="btn sm" data-act="download" ${!S.online || s.download === 'downloading' ? 'disabled' : ''}>${s.download === 'ready' ? 'Update download' : 'Download for offline use'}</button></div>
        ${!S.online ? '<p class="small muted">Downloading needs an internet connection.</p>' : ''}</section>`
          : ''
      }
    </div>
    ${linkCard(s)}`
}
