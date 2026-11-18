import { chip, notice } from '../fragments.js'
import { esc, fmtTime } from '../helpers.js'
import { fmtLongDate, I, monthStart } from '../icons.js'
import { calendarEvents, dayKey } from '../screens/home.js'
import { PAST, S } from '../state.js'
import { sheetShell } from './sheets.js'

export const SHEETS_CALENDAR = {
  datePicker(sh) {
    const today = new Date().setHours(0, 0, 0, 0)
    const view = new Date(sh.view)
    const lead = view.getDay()
    const daysIn = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const busy = new Set(
      S.sessions
        .filter((x) => x.id !== (S.ui.draft || {}).id && x.status !== 'cancelled')
        .map((x) => dayKey(x.start)),
    )
    const cells = []
    // One day button is in the tab order: the selected day, or the first selectable day of another month.
    let tabStop = monthStart(sh.sel) === sh.view ? sh.sel : null
    for (let i = 0; i < lead; i++)
      cells.push('<span class="dp-day other" aria-hidden="true"></span>')
    for (let n = 1; n <= daysIn; n++) {
      const t = new Date(view.getFullYear(), view.getMonth(), n).getTime()
      const sel = t === sh.sel,
        past = t < today && !sel
      const has = busy.has(dayKey(t))
      if (tabStop == null && !past) tabStop = t
      cells.push(`<button class="dp-day ${t === today ? 'today' : ''}" id="dp-${t}" data-act="dpPick" data-k="${t}" aria-pressed="${sel}" ${past ? 'disabled' : ''} tabindex="${t === tabStop ? 0 : -1}"
        aria-label="${esc(fmtLongDate(t))}${t === today ? ', today' : ''}${has ? ', your club has a session' : ''}">${n}${has ? '<i class="dp-dot" aria-hidden="true"></i>' : ''}</button>`)
    }
    const prevOff = monthStart(today) >= sh.view
    return sheetShell(
      'Choose a date',
      `
      <div class="dp-sel"><span class="label">Session date</span><b>${esc(fmtLongDate(sh.sel))}</b>${sh.sel === today ? '<span class="small muted">Today</span>' : ''}</div>
      <div class="dp-head">
        <button class="btn sm icon-btn" data-act="dpMove" data-d="-1" aria-label="Previous month" ${prevOff ? 'disabled' : ''}>${I.back}</button>
        <h3 aria-live="polite">${view.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h3>
        <button class="btn sm icon-btn" data-act="dpMove" data-d="1" aria-label="Next month"><span style="display:inline-flex;transform:rotate(180deg)">${I.back}</span></button>
      </div>
      <div class="dp-grid" role="group" aria-label="Dates">${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => `<span class="dp-wd" aria-hidden="true">${w}</span>`).join('')}${cells.join('')}</div>
      <div class="between small muted"><span><i class="cal-key prep"></i>Your club already has a session</span><button class="btn xs" data-act="dpToday">Today</button></div>
      <p class="small muted">Use the arrow keys to move between days.</p>`,
      `<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="dpApply">Set date</button>`,
    )
  },
  calDay(sh) {
    const k = dayKey(sh.t)
    const evs = calendarEvents().filter((e) => dayKey(e.t) === k)
    const isToday = k === dayKey(Date.now())
    const past = sh.t < new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    return sheetShell(
      `${esc(new Date(sh.t).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))}${isToday ? ' · Today' : ''}`,
      evs.length
        ? `<p class="small muted">${evs.length} session${evs.length > 1 ? 's' : ''} this day.</p>
        <div class="stack tight">${evs.map((e) => `<button class="opt" ${e.act}><i class="cal-key ${e.kind}" style="margin:0"></i><div class="main"><b>${esc(e.title)}</b><div class="small muted">${fmtTime(e.t)} · ${esc(e.venue)}</div></div>${chip(e.label, e.kind === 'live' ? 'ok' : e.kind === 'bad' ? 'bad' : '')}</button>`).join('')}</div>`
        : '<div class="empty">No sessions this day.</div>',
      `<button class="btn" data-act="closeSheet">Close</button>${past ? '' : `<button class="btn primary" data-act="newSession" data-k="${sh.t}">Create session${isToday ? ' today' : ' on this day'}</button>`}`,
    )
  },
  past(sh) {
    const h = PAST.find((x) => x.id === sh.id)
    return sheetShell(
      esc(h.title),
      `<p class="muted">${esc(h.when)} · ${esc(h.venue)}</p>
      ${
        h.status === 'invalid'
          ? notice(
              'bad',
              `<b>Invalid session.</b> ${esc(h.reason)} It doesn't count toward player records or rankings, and has no leaderboard or result slides.`,
            )
          : `<dl class="kv"><dt>Games</dt><dd>${h.games}</dd><dt>Players</dt><dd>${h.players}</dd><dt>Results</dt><dd>${esc(h.results)}</dd></dl><p class="small muted">Older sessions open read-only. Their slides aren't part of this prototype. Finish tonight's session to see results.</p>`
      }`,
      '<button class="btn" data-act="closeSheet">Close</button>',
    )
  },
}
