import { fmtFormats, identChip, notice, selectLevel } from '../fragments.js'
import {
  avatar,
  capacityOf,
  courtFill,
  courtStart,
  cur,
  esc,
  lvLabel,
  openSlots,
  P,
  waitOf,
} from '../helpers.js'
import { I } from '../icons.js'
import { DIRECTORY, MODES, S } from '../state.js'
import { dayStart, daysBetween, dtPicker, fmtWhen, plannedFor, startNeedsEnd } from '../time.js'
import { sheetShell } from './sheets.js'

export const SHEETS_ROSTER = {
  add(sh) {
    // sh.club: Saved players › Add player. Saves to the saved players only; no session, slots or waitlist.
    const club = !!sh.club,
      s = club ? null : cur()
    const inRoster = new Set(
      club ? [] : s.roster.map((r) => r.pid).concat((s.waitlist || []).map((w) => w.pid)),
    )
    const live = !club && s.status === 'active'
    const full = !club && !live && openSlots(s) === 0
    const q = (sh.q || '').toLowerCase()
    const tab = sh.tab || (club ? 'global' : 'saved')
    const primary = club ? 'Save player' : full ? 'Add to waitlist' : 'Confirm player slot'
    const levelLabel = club
      ? 'Level for this club (optional)'
      : `Level for this club${live ? ' (locks immediately)' : ''}`
    let body = `${club ? notice('', "Adding to your saved players. They won't be added to a session.") : notice('', `Adding to <b>${esc(s.title)}</b>.${live ? ' Late players get a level now, and it locks for the rest of the session.' : ''}`)}${sh.last && !sh.pick ? `<div role="status">${notice('ok', `${esc(sh.last)}${sh.added > 1 ? ` <span class="small muted">· ${sh.added} added so far</span>` : ''}`)}</div>` : ''}${full ? notice('warn', `<b>All ${capacityOf(s)} slots are taken.</b> New players go on the waitlist as #${waitOf(s).length + 1}. You can give them a slot later.`) : ''}`
    if (sh.pick) {
      const p = sh.pick.dir ? DIRECTORY.find((x) => x.id === sh.pick.id) : P(sh.pick.id)
      // Registered (claimed) profiles are tied to the player's own account, so only unclaimed ones need an in-person check,
      // whether they come from Player Information or from the club's saved players.
      const needsVerify = p.identity === 'unclaimed'
      body += `<div class="card stack"><div class="li" style="padding:0">${avatar(p)}<div class="main"><b>${esc(p.name)}</b><p class="small muted">${p.rtr ? `<span class="mono">${esc(p.rtr)}</span>` : 'Guest · no RTR ID'}</p></div>${identChip(p)}</div>
        ${
          needsVerify
            ? `<div class="stack tight"><span class="label">Confirm this is the right person</span><p class="small">Check with the player using one of these. A name match alone isn't enough.</p>
          <div class="row"><button class="btn xs" aria-pressed="${sh.verify === 'id'}" data-act="sheetSet" data-k="verify" data-v="id">RTR ID matches</button><button class="btn xs" aria-pressed="${sh.verify === 'qr'}" data-act="sheetSet" data-k="verify" data-v="qr">Scanned their QR</button><button class="btn xs" aria-pressed="${sh.verify === 'phone'}" data-act="sheetSet" data-k="verify" data-v="phone">Phone confirmed</button></div>
          ${sh.verify ? `<p class="small" style="color:var(--accent)">${I.check} Identity confirmed with the player</p>` : ''}</div>`
            : ''
        }
        ${p.phoneHidden ? '<p class="small muted">Phone hidden by player. Use their RTR ID or QR code instead.</p>' : ''}
        <div class="field"><span>Player Information suggestion</span><span class="small">${p.sugg != null ? esc(lvLabel(p.sugg)) : 'None yet'}</span></div>
        <label class="field"><span>${levelLabel}</span>${selectLevel('add-level', sh.level, 'data-bind="ui.sheet.level" data-num', !!sh.err && sh.level == null)}${sh.err ? `<span class="err">${esc(sh.err)}</span>` : ''}</label></div>`
      return sheetShell(
        needsVerify ? 'Confirm player' : 'Add player',
        body,
        `<button class="btn" data-act="sheetSet" data-k="pick" data-v="">Back</button><button class="btn primary" data-act="confirmAdd" ${needsVerify && !sh.verify ? 'disabled' : ''}>${primary}</button>`,
      )
    }
    body += `<div class="seg" role="group" aria-label="How to add">${[
      ['saved', 'Saved players'],
      ['global', 'Player Information'],
      ['new', 'New player'],
    ]
      .filter(([k]) => !club || k !== 'saved')
      .map(
        ([k, l]) =>
          `<button aria-pressed="${tab === k}" data-act="sheetSet" data-k="tab" data-v="${k}">${l}</button>`,
      )
      .join(
        '',
      )}</div>${club && sh.err && !sh.pick && tab === 'global' ? notice('bad', esc(sh.err)) : ''}`
    if (tab === 'saved') {
      // Players already on the roster or waitlist are left out of the list rather than shown greyed out.
      const list = S.players.filter(
        (p) =>
          !inRoster.has(p.id) &&
          (!q ||
            p.name.toLowerCase().includes(q) ||
            (p.nick || '').toLowerCase().includes(q) ||
            (p.rtr || '').toLowerCase().includes(q)),
      )
      const added = S.players.filter((p) => inRoster.has(p.id)).length
      body += `<label class="field"><span>Search saved players</span><input class="input" id="add-q" data-bind="ui.sheet.q" data-rerender value="${esc(sh.q || '')}" placeholder="Name, nickname or RTR ID" data-autofocus></label>
        ${added ? `<p class="small muted">${added} saved player${added > 1 ? 's are' : ' is'} already in this session and not listed.</p>` : ''}
        <div class="sel-list">${list.map((p) => `<button class="opt" data-act="pickPlayer" data-id="${p.id}">${avatar(p)}<div class="main"><b>${esc(p.name)}</b><div class="small muted">${p.rtr ? esc(p.rtr) : 'Guest'}</div></div>${identChip(p)}</button>`).join('') || (added && !q ? '<div class="empty">Every saved player is already in this session. Add someone new or search Player Information.</div>' : '<div class="empty">No saved player matches. Try Player Information or add a new player.</div>')}</div>`
    } else if (tab === 'global') {
      const list = DIRECTORY.filter(
        (p) =>
          !S.players.some((x) => x.rtr === p.rtr) &&
          (!q || p.name.toLowerCase().includes(q) || p.rtr.toLowerCase().includes(q)),
      )
      body += !S.online
        ? notice(
            'warn',
            'Player Information search needs internet. Add them as a new player now; their profile can be linked after you reconnect.',
          )
        : `<label class="field"><span>Search Player Information</span><input class="input" id="add-gq" data-bind="ui.sheet.q" data-rerender value="${esc(sh.q || '')}" placeholder="Name or RTR ID" data-autofocus></label>
        <div class="sel-list">${list.map((p) => `<button class="opt" data-act="pickPlayer" data-id="${p.id}" data-dir="1">${avatar(p)}<div class="main"><b>${esc(p.name)}</b><div class="small muted"><span class="mono">${esc(p.rtr)}</span> · ${esc(p.rank)}</div></div>${identChip(p)}</button>`).join('') || '<div class="empty">No match in Player Information.</div>'}</div>
        <p class="small muted">Results only suggest people. Confirm with the player before linking.</p>`
    } else {
      body += `<label class="field"><span>Full or display name</span><input class="input${sh.err && !(sh.name || '').trim() ? ' bad' : ''}" id="add-name" data-bind="ui.sheet.name" value="${esc(sh.name || '')}" data-autofocus></label>
        <label class="field"><span>Nickname (optional)</span><input class="input" id="add-nick" data-bind="ui.sheet.nick" value="${esc(sh.nick || '')}"></label>
        <label class="field"><span>Phone (optional)</span><input class="input" id="add-phone" type="tel" data-bind="ui.sheet.phone" value="${esc(sh.phone || '')}"><span class="hint">Without a phone they're saved as a guest. With one, ROTRA can match or create their profile when the session syncs.</span></label>
        <label class="field"><span>${levelLabel}</span>${selectLevel('add-level-new', sh.level, 'data-bind="ui.sheet.level" data-num', !!sh.err && sh.level == null)}</label>
        ${sh.err ? `<span class="err">${esc(sh.err)}</span>` : ''}`
      return sheetShell(
        'Add player',
        body,
        `<button class="btn" data-act="closeSheet">${sh.added ? 'Done' : 'Cancel'}</button><button class="btn primary" data-act="confirmNew">${primary}</button>`,
      )
    }
    return sheetShell(
      'Add player',
      body,
      `<button class="btn" data-act="closeSheet">${sh.added ? 'Done' : 'Cancel'}</button>`,
    )
  },
  start(sh) {
    const s = cur(),
      now = Date.now(),
      late = startNeedsEnd(s, now)
    const endPicker = late
      ? `${notice('warn', `This session was planned for ${plannedFor(s)}. Set a new end time to start.`)}
      ${dtPicker({
        k: 'sheet.endAt',
        label: 'New end',
        id: 'st-end',
        value: sh.endAt,
        days: daysBetween(now, now + 864e5),
        base: dayStart(now),
        ok: (t) => t > now && t <= now + 864e5,
        set: (t) => {
          sh.endAt = t
        },
        autofocus: true,
      })}`
      : ''
    return sheetShell(
      'Start session?',
      `${endPicker}<dl class="kv"><dt>Session</dt><dd>${esc(s.title)}</dd><dt>Courts</dt><dd>${s.courts.length}</dd><dt>Formats</dt><dd>${fmtFormats(s)}</dd><dt>Mode</dt><dd>${MODES[s.mode].label}</dd><dt>Minimum</dt><dd>${s.minimum} games</dd><dt>Roster</dt><dd>${s.roster.length} confirmed · ${s.roster.filter((r) => r.present).length} present${(s.waitlist || []).length ? ` · ${s.waitlist.length} on the waitlist` : ''}</dd></dl>
      ${notice('', "Every player's level locks now. Players you add later get a level when you add them, and it locks too.")}
      ${!S.online ? notice('warn', 'Starting needs an internet connection.') : ''}`,
      `<button class="btn" data-act="closeSheet">Back</button><button class="btn primary" data-act="confirmStart" ${!S.online || (late && !(sh.endAt > now)) ? 'disabled' : ''}>Start session</button>`,
    )
  },
  openEarly(sh) {
    const s = cur()
    const list = sh.ids.map((id) => s.courts.find((c) => c.id === id)).filter(Boolean)
    const one = list.length === 1 ? list[0] : null
    return sheetShell(
      one ? `Open ${esc(one.label)} now?` : 'Open all courts now?',
      `${one ? `<p>It's booked from ${fmtWhen(courtStart(s, one), { lower: true })}.</p>` : `<dl class="kv">${list.map((c) => `<dt>${esc(c.label)}</dt><dd>Booked from ${fmtWhen(courtStart(s, c), { lower: true })}</dd>`).join('')}</dl>`}
      <p>Opening early makes ${one ? 'it' : 'them'} available for matches now.${courtFill(s) === 'auto' ? ` Auto Queue puts the next ready match on ${one ? 'it' : 'each one'}.` : ''}</p>
      <p class="small muted">The booking time and costs don't change.</p>`,
      '<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="confirmOpenEarly">Open now</button>',
    )
  },
}
