import { notice } from './fragments.js'
import { courtStart, esc, fmtDate, fmtTime, sessionCourtStart } from './helpers.js'
import { addDays } from './icons.js'

// ---------- Times and days ----------
// Every time shows its day. Today is a plain time; yesterday and tomorrow get a word (lower-case mid-sentence:
// "started yesterday 10:42 PM"); other days get the date ("Sat, Nov 1 · 9:00 PM"). Device time is club time here.
export const dayStart = (t) => new Date(t).setHours(0, 0, 0, 0)
export const dayDiff = (a, b) => Math.round((dayStart(b) - dayStart(a)) / 864e5)
export function fmtWhen(t, { lower = false } = {}) {
  const n = dayDiff(Date.now(), t)
  if (n === 0) return fmtTime(t)
  if (n === 1 || n === -1) {
    const w = n < 0 ? 'Yesterday' : 'Tomorrow'
    return `${lower ? w.toLowerCase() : w} ${fmtTime(t)}`
  }
  return `${fmtDate(t)} · ${fmtTime(t)}`
}
// Mid-sentence: "at 9:00 PM" today, "tomorrow 1:00 AM" or "Sat, Nov 1 · 9:00 PM" on another day.
export const atWhen = (t) =>
  dayDiff(Date.now(), t) === 0 ? `at ${fmtTime(t)}` : fmtWhen(t, { lower: true })
// A range marks an end that falls after the day of `base` (the range start, or a date shown next to it).
export const laterDay = (base, t) => {
  const n = dayDiff(base, t)
  return n === 1 ? ' · next day' : n > 1 ? ` · ${fmtDate(t)}` : ''
}
export const fmtRange = (a, b, base = a) => `${fmtTime(a)}–${fmtTime(b)}${laterDay(base, b)}`
// Where no date is shown: the start carries its day word, the end its "· next day".
export const fmtWhenRange = (a, b, opts) => `${fmtWhen(a, opts)}–${fmtTime(b)}${laterDay(a, b)}`
// Time left until the planned end, or how long ago it passed. The session never closes by itself.
export function endStatus(s, now = Date.now()) {
  if (now < s.end)
    return {
      over: false,
      text: `${courtDuration(Math.max(1, Math.ceil((s.end - now) / 60000)))} left`,
    }
  return {
    over: true,
    text: `Planned end passed ${courtDuration(Math.max(1, Math.floor((now - s.end) / 60000)))} ago`,
  }
}
// Start session late (after the planned end) or on another day than planned: a new end is required first.
export const startNeedsEnd = (s, now = Date.now()) =>
  now > s.end || dayStart(now) !== dayStart(s.start)
// "6:00–9:00 PM yesterday", or "Sat, Nov 1, 6:00–9:00 PM" further away. The first AM/PM drops when both share it.
export function plannedFor(s) {
  const a = fmtTime(s.start),
    b = fmtTime(s.end),
    ma = a.match(/\s?([AP]M)$/i),
    mb = b.match(/\s?([AP]M)$/i)
  const range = `${ma && mb && ma[1] === mb[1] && !dayDiff(s.start, s.end) ? a.slice(0, -ma[0].length) : a}–${b}${laterDay(s.start, s.end)}`
  const n = dayDiff(Date.now(), s.start)
  return n === 0
    ? range
    : n === -1
      ? `${range} yesterday`
      : n === 1
        ? `${range} tomorrow`
        : `${fmtDate(s.start)}, ${range}`
}
export const ceil15 = (t) => {
  const d = new Date(t),
    m = d.getMinutes()
  const exact = m % 15 === 0 && !d.getSeconds() && !d.getMilliseconds()
  d.setSeconds(0, 0)
  if (!exact) d.setMinutes(m - (m % 15) + 15)
  return d.getTime()
}
export const daysBetween = (a, b) => {
  const out = []
  for (let t = dayStart(a); t <= dayStart(b) && out.length < 3; t = addDays(t, 1)) out.push(t)
  return out
}

// One date-and-time picker for every time field: day buttons for the days the field can fall on (shown when there
// is more than one), then a list of only the valid times on the chosen day, in 15-minute steps. A saved value off
// the grid (a court that opened at 10:42 PM) stays in the list so it can be kept. Values carry their day; nothing
// is guessed. `ok(t)` holds the field's rules; `set(t)` stores a choice (null = the empty option).
export const DT = {} // the pickers on screen, by key, for the day and time handlers
const dtTimes = (day, ok) => {
  const d = new Date(day),
    out = []
  for (let i = 0; i < 96; i++) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, i * 15).getTime()
    if (ok(t)) out.push(t)
  }
  return out
}
export function dtPicker(p) {
  DT[p.k] = p
  const base = p.base ?? p.days[0]
  const shown = p.days.includes(dayStart(p.value ?? p.fallback ?? p.days[0]))
    ? dayStart(p.value ?? p.fallback ?? p.days[0])
    : p.days[0]
  const times = dtTimes(shown, p.ok)
  if (p.value != null && dayStart(p.value) === shown && !times.includes(p.value)) {
    times.push(p.value)
    times.sort((a, b) => a - b)
  }
  const id = p.id || `dt-${p.k.replace(/\W/g, '-')}`
  const dayLabel = (t) => `${fmtDate(t)}${dayDiff(base, t) === 1 ? ' · next day' : ''}`
  return `<div class="field">${p.hideLabel ? '' : `<span>${esc(p.label)}</span>`}
    ${p.days.length > 1 ? `<div class="seg" role="group" aria-label="${esc(p.label)}: day">${p.days.map((t, i) => `<button type="button" id="${id}-d${i}" aria-pressed="${t === shown}" data-act="dtDay" data-k="${p.k}" data-v="${t}" ${p.disabled || !dtTimes(t, p.ok).length ? 'disabled' : ''}>${dayLabel(t)}</button>`).join('')}</div>` : ''}
    <select class="input${p.err ? ' bad' : ''}" id="${id}" data-act-change="dtTime" data-k="${p.k}" aria-label="${esc(p.label)}: time" ${p.disabled ? 'disabled' : ''} ${p.autofocus ? 'data-autofocus' : ''} ${p.err ? `aria-invalid="true" aria-describedby="${id}-error"` : ''}>
      ${p.emptyLabel != null ? `<option value="" ${p.value == null ? 'selected' : ''}>${esc(p.emptyLabel)}</option>` : ''}${times.map((t) => `<option value="${t}" ${t === p.value ? 'selected' : ''}>${fmtTime(t)}</option>`).join('')}${!times.length && p.emptyLabel == null ? '<option value="" selected disabled>No times left on this day</option>' : ''}
    </select>${p.err ? `<span class="err" id="${id}-error" aria-live="polite">${esc(p.err)}</span>` : p.hint ? `<span class="hint">${p.hint}</span>` : ''}</div>`
}
// A day button keeps the chosen clock time on the new day when it's valid there, else takes that day's first valid time.
export function dtPickDay(k, day) {
  const p = DT[k]
  if (!p) return
  const was = p.value ?? p.fallback
  if (was != null && dayStart(was) === day) return
  const ref = new Date(was ?? day),
    want = new Date(day)
  want.setHours(ref.getHours(), ref.getMinutes(), 0, 0)
  const t = p.ok(want.getTime()) ? want.getTime() : dtTimes(day, p.ok)[0]
  if (t != null) p.set(t)
}

// Q-ADD-COURT mirrors @rotra/schema/court-window, including submit's validation.
// Its window: within the session; the start is fixed once the court hosted a match; the end follows the session end or a set time.
export const addCourtStart = (s, existing) =>
  existing ? Math.min(sessionCourtStart(s), courtStart(s, existing)) : sessionCourtStart(s)
export function addCourtWindow(s, sh, now = Date.now()) {
  const existing = sh.id && s.courts.find((c) => c.id === sh.id)
  const used = existing && s.matches.some((m) => (m.courts || []).includes(existing.id))
  const sessionStart = addCourtStart(s, existing)
  const start = used ? courtStart(s, existing) : (sh.startAt ?? sessionStart)
  const end = sh.mode === 'end' ? s.end : (sh.untilAt ?? NaN)
  const fail = (error, field) => ({ error, field })
  if (sh.mode === 'time' && sh.untilAt == null) return fail('Choose a closing time.', 'end')
  if (![start, end, sessionStart, s.end].every(Number.isFinite))
    return fail('Enter valid booking times.', 'end')
  if (end > s.end)
    return fail(
      `That's after the session ends ${atWhen(s.end)}. Pick an earlier time, or extend the session first.`,
      'end',
    )
  if (start < sessionStart || start >= s.end)
    return fail('Choose a planned start within the session.', 'start')
  if (end <= start) return fail('Choose an end after the planned start.', 'end')
  return {
    opensAt: start,
    closesAt: end,
    lengthMin: Math.round((end - start) / 60000),
    opensInMin: start > now ? Math.max(1, Math.round((start - now) / 60000)) : null,
  }
}
export function courtDuration(minutes) {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60
  return [hours ? `${hours} h` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ') || '0 min'
}
export function addCourtPreview(s, sh, preview, now) {
  if (preview.error) return ''
  const label = `<b>${esc((sh.label || '').trim() || `Court ${s.courts.length + 1}`)}</b>`
  const time = (t) => `<b>${fmtWhen(t, { lower: true })}</b>`,
    at = (t) => (dayDiff(Date.now(), t) === 0 ? `at ${time(t)}` : time(t))
  const duration = courtDuration(preview.lengthMin)
  const follows = sh.mode === 'end' ? ' Moves if the session end changes.' : ''
  let copy
  if (preview.closesAt <= now)
    copy = `${label} booking ended ${at(preview.closesAt)} (${duration} booking).${follows}`
  else if (preview.opensInMin === null)
    copy = `${label} is open now until ${sh.mode === 'end' ? `the session ends ${at(preview.closesAt)}` : time(preview.closesAt)} (about ${courtDuration(Math.max(1, Math.round((preview.closesAt - now) / 60000)))} left).${follows}`
  else if (sh.mode === 'end')
    copy = `${label} opens ${time(preview.opensAt)} and stays open until the session ends ${at(preview.closesAt)} (${duration}). Moves if the session end changes. Opens in ${courtDuration(preview.opensInMin)}.`
  else
    copy = `${label} opens ${time(preview.opensAt)} and closes ${time(preview.closesAt)} (${duration} booking). Opens in ${courtDuration(preview.opensInMin)}.`
  return notice(preview.closesAt <= now ? '' : 'ok', copy)
}
