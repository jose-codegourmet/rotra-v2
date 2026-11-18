import { isDemoLive, LIVE_SCENARIOS } from '../demo-sessions.js'
import { chip, identChip, notice, sw } from '../fragments.js'
import { avatar, cur, esc, fmtDate, fmtTime, hashStr, lvLabel, P } from '../helpers.js'
import { I } from '../icons.js'
import { fillPost, postSample, postTemplate } from '../screens/club-settings.js'
import { peso } from '../screens/financials.js'
import { addedAt, canInvite, regCity } from '../screens/saved-players.js'
import { paymentsPanel } from '../screens/session-record.js'
import { BAND_CHOICES, requestsPanel } from '../screens/setup.js'
import { S } from '../state.js'
import { fmtRange, fmtWhen } from '../time.js'
import { sheetShell } from './sheets.js'

export const SHEETS_ACCOUNT = {
  signOut() {
    const live = S.sessions.find((x) => x.status === 'active')
    const notes = [
      S.pending
        ? notice(
            'warn',
            `<b>${S.pending} change${S.pending > 1 ? "s haven't" : " hasn't"} synced yet.</b> ${S.pending > 1 ? 'They stay' : 'It stays'} on this device and ${S.pending > 1 ? 'sync' : 'syncs'} after you sign back in here.`,
          )
        : '',
      live
        ? notice(
            '',
            `<b>${esc(live.title)}</b> is still live. Signing out doesn't end it; sign back in to continue running it.`,
          )
        : '',
      !S.online
        ? notice(
            'warn',
            "You're offline. Signing back in needs an internet connection, so you can't get back in until you reconnect.",
          )
        : '',
    ].join('')
    return sheetShell(
      'Sign out?',
      `<p>You'll need the club username and password to sign in again.</p>${notes}`,
      '<button class="btn" data-act="closeSheet" data-autofocus>Stay signed in</button><button class="btn primary" data-act="signOut">Sign out</button>',
    )
  },
  demo() {
    return sheetShell(
      'Prototype controls',
      `
      <p class="small muted">Fake data for a fictional club. Your changes stay in this browser.</p>
      <div class="li" style="padding:0"><div class="main"><h3>Simulate offline</h3><p class="small muted">See how the app behaves when the venue's internet drops.</p></div>${sw(!S.online, 'toggleOnline', '', 'Simulate offline')}</div>
      <div class="li" style="padding:0"><div class="main"><h3>Simulate expired license</h3><p class="small muted">Shows the license gate on the home screen.</p></div>${sw(S.licenseExpired, 'toggleLicense', '', 'Simulate expired license')}</div>
      ${S.club.nameRequest ? `<div class="li" style="padding:0"><div class="main"><h3>Approve name change</h3><p class="small muted">Act as the platform owner approving “${esc(S.club.nameRequest.name)}” in Admin.</p></div><button class="btn sm" data-act="approveNameRequest">Approve</button></div>` : ''}
      ${(() => {
        const s =
          S.sessions.find((x) => x.status === 'active') ||
          S.sessions.filter((x) => x.status === 'prepared').sort((a, b) => a.start - b.start)[0]
        return s
          ? `<div class="li" style="padding:0"><div class="main"><h3>Guest join request</h3><p class="small muted">Open ${esc(s.title)}'s link as a guest, or drop in a sample request.</p></div><div class="row"><button class="btn sm" data-act="openGuest" data-id="${s.id}">Open as guest</button><button class="btn sm" data-act="fakeReq" data-id="${s.id}">Add sample</button></div></div>`
          : ''
      })()}
      ${(() => {
        // Prototype only: swap which example is live. Never two live sessions; a session you started yourself stays put.
        const live = S.sessions.find((x) => x.status === 'active'),
          mine = live && !isDemoLive(live) ? live : null
        const on = live ? live.demo || (/^flex-([a-z]+)-/.exec(live.id) || [])[1] : null
        return `<div class="stack tight"><div><div class="row" style="gap:8px"><h3>Demo scenarios</h3>${chip('Prototype only', 'warn')}</div><p class="small muted">Load a live example session. It replaces the live example running now, so only one session is live at a time.</p></div>
          <div class="row">${Object.entries(LIVE_SCENARIOS)
            .map(
              ([k, v]) =>
                `<button class="btn sm" data-act="demoScenario" data-k="${k}" aria-pressed="${on === k}" ${mine ? 'disabled' : ''}>${esc(v.label)}</button>`,
            )
            .join(
              '',
            )}<button class="btn sm" data-act="demoScenario" data-k="none" aria-pressed="${!live}" ${mine ? 'disabled' : ''}>No live example</button></div>
          ${mine ? notice('warn', `<b>${esc(mine.title)}</b> is live. One session at a time: finish it with Session done to load a demo scenario.`) : ''}</div>`
      })()}
      ${S.screen !== 'login' ? '<button class="btn" data-act="openSignOut">Sign out</button>' : ''}
      <button class="btn danger" data-act="reset">Reset demo data</button>`,
      '<button class="btn" data-act="closeSheet">Close</button>',
    )
  },
  peek(sh) {
    const x = S.sessions.find((y) => y.id === sh.id)
    const st = {
      active: ['Live now', 'ok'],
      prepared: ['Prepared', 'warn'],
      finalized: ['Completed', ''],
      invalid: ['Invalid', 'bad'],
      cancelled: ['Cancelled', ''],
    }[x.status] || ['Prepared', 'warn']
    const to = x.status === 'active' ? 'console' : x.status === 'prepared' ? 'prepare' : 'history'
    return sheetShell(
      esc(x.title),
      `<div class="row">${chip(st[0], st[1])}</div><dl class="kv"><dt>When</dt><dd>${fmtDate(x.start)}, ${fmtRange(x.start, x.end)}</dd><dt>Venue</dt><dd>${esc(x.venue)}</dd><dt>Courts</dt><dd>${x.courts.length}</dd><dt>Roster</dt><dd>${x.roster.length} player${x.roster.length === 1 ? '' : 's'}</dd></dl>
      ${S.screen === 'setup' ? '<p class="small muted">Your setup stays as it is if you go back.</p>' : ''}`,
      `<button class="btn" data-act="closeSheet">${S.screen === 'setup' ? 'Back to setup' : 'Close'}</button><button class="btn primary" data-act="go" data-to="${to}" data-id="${x.id}">Open ${x.status === 'active' ? 'live session' : x.status === 'prepared' ? 'preparation' : 'session record'}</button>`,
    )
  },
  requests() {
    return sheetShell(
      'Join requests',
      requestsPanel(cur(), true).replace(/<h2>Join requests[^<]*<\/h2>/, ''),
      '<button class="btn" data-act="closeSheet">Done</button>',
      true,
    )
  },
  join(sh) {
    const s = cur(),
      e = sh.err || {}
    return sheetShell(
      'Request to join',
      `<p class="small muted">${esc(s.title)} · ${fmtDate(s.start)}, ${fmtTime(s.start)} · ${esc(s.venue)}</p>
      <label class="field"><span>Your name</span><input class="input${e.name ? ' bad' : ''}" id="join-name" data-bind="ui.sheet.name" value="${esc(sh.name || '')}" autocomplete="name" data-autofocus>${e.name ? `<span class="err">${e.name}</span>` : ''}</label>
      <label class="field"><span>Nickname (optional)</span><input class="input" id="join-nick" data-bind="ui.sheet.nick" value="${esc(sh.nick || '')}"></label>
      <label class="field"><span>Phone (optional)</span><input class="input${e.phone ? ' bad' : ''}" id="join-phone" type="tel" inputmode="tel" data-bind="ui.sheet.phone" value="${esc(sh.phone || '')}" autocomplete="tel">${e.phone ? `<span class="err">${e.phone}</span>` : '<span class="hint">Helps the club recognise you and link your ROTRA profile. Only the club sees it.</span>'}</label>
      <div class="field"><span>Your level</span><div class="seg" role="group" aria-label="Your level">${BAND_CHOICES.map(([v, l]) => `<button aria-pressed="${sh.band === v}" data-act="sheetSet" data-k="band" data-v="${v}">${l}</button>`).join('')}</div>${e.band ? `<span class="err">${e.band}</span>` : '<span class="hint">Your best guess. The Queue Master sets your level for the night.</span>'}</div>
      ${notice('', 'This is a request, not a booking. The Queue Master confirms each guest before giving a slot.')}`,
      '<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="sendJoin">Send request</button>',
    )
  },
  payments() {
    return sheetShell(
      'Payments',
      paymentsPanel(cur()).replace(
        /^<section class="card stack" id="payments">/,
        '<section class="stack" id="payments">',
      ),
      '<button class="btn" data-act="closeSheet">Done</button>',
      true,
    )
  },
  postPreview() {
    const smp = postSample()
    // Preview the editor's unsaved text too, filled in from the current or next session.
    const old = { d: S.club.description, r: S.club.courtRules }
    S.club.description = S.ui.postDesc ?? S.club.description
    S.club.courtRules = S.ui.postRules ?? S.club.courtRules
    const out = fillPost(S.ui.postTpl ?? postTemplate(), smp)
    S.club.description = old.d
    S.club.courtRules = old.r
    const unsaved = S.ui.postTpl != null || S.ui.postDesc != null || S.ui.postRules != null
    return sheetShell(
      'Post preview',
      `<p class="small muted">Filled in from <b>${esc(smp.title)}</b>, ${fmtDate(smp.start)}.${unsaved ? ' Includes your unsaved changes.' : ''}</p><pre class="tpl-preview">${esc(out)}</pre>`,
      '<button class="btn primary" data-act="closeSheet">Back to editing</button>',
    )
  },
  post() {
    const s = cur()
    const text = fillPost(postTemplate(), s)
    return sheetShell(
      'Facebook post',
      `
      <p class="small muted">Filled in from ${esc(s.title)} and your club's template. Copy it and paste it into your Facebook group or page.</p>
      <textarea class="input mono tpl" id="post-text" rows="18" readonly aria-label="Facebook post text">${esc(text)}</textarea>
      <p class="small muted">${s.roster.length} player${s.roster.length === 1 ? '' : 's'} listed. Copy it again after you add players to get the latest list. <button class="btn xs ghost" data-act="goClub" data-k="post">Edit template</button></p>`,
      '<button class="btn" data-act="closeSheet">Close</button><button class="btn primary" data-act="copyPost">Copy post</button>',
      true,
    )
  },
  venue(sh) {
    const d = S.ui.draft || {}
    if (sh.mode === 'form') {
      const editing = sh.editId != null
      return sheetShell(
        editing ? 'Edit venue' : 'New venue',
        `
        <label class="field"><span>Venue name</span><input class="input${sh.err ? ' bad' : ''}" id="vn-name" data-bind="ui.sheet.name" maxlength="80" value="${esc(sh.name || '')}" data-autofocus>${sh.err ? `<span class="err">${esc(sh.err)}</span>` : ''}</label>
        <label class="field"><span>Address (optional)</span><input class="input" id="vn-address" data-bind="ui.sheet.address" maxlength="160" value="${esc(sh.address || '')}"></label>
        <label class="field"><span>Court fee per hour, per court (optional)</span><div class="money"><span>₱</span><input class="input${sh.feeErr ? ' bad' : ''}" id="vn-fee" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.sheet.fee" value="${esc(sh.fee ?? '')}" placeholder="0"></div>${sh.feeErr ? `<span class="err">${esc(sh.feeErr)}</span>` : '<span class="hint">Fills in the Financials step when you pick this venue. You can still change it for each session.</span>'}</label>
        <label class="field"><span>Entrance fee per head (optional)</span><div class="money"><span>₱</span><input class="input${sh.entryErr ? ' bad' : ''}" id="vn-entry" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.sheet.entry" value="${esc(sh.entry ?? '')}" placeholder="No entrance fee"></div>${sh.entryErr ? `<span class="err">${esc(sh.entryErr)}</span>` : '<span class="hint">If this venue charges each player to get in. Picking the venue turns on the session\'s entrance fee with this amount; you can still change it.</span>'}</label>
        <p class="small muted">Saved to your club's venues so you can pick it next time.</p>`,
        `<button class="btn" data-act="${sh.manage ? 'closeSheet' : 'venueBack'}">${sh.manage ? 'Cancel' : 'Back'}</button><button class="btn primary" data-act="venueSave">Save venue</button>`,
      )
    }
    const q = (sh.q || '').trim()
    const ql = q.toLowerCase()
    const list = (S.venues || []).filter(
      (v) =>
        !ql || v.name.toLowerCase().includes(ql) || (v.address || '').toLowerCase().includes(ql),
    )
    const exact = (S.venues || []).some((v) => v.name.toLowerCase() === ql)
    return sheetShell(
      'Choose a venue',
      `
      <label class="field"><span>Search your venues</span><input class="input" id="venue-q" data-bind="ui.sheet.q" data-rerender value="${esc(sh.q || '')}" placeholder="Venue name or area" data-autofocus></label>
      <div class="venue-opts">${list.map((v) => `<div class="venue-row"><button class="opt" data-act="venuePick" data-id="${v.id}" aria-pressed="${d.venueId === v.id}"><span class="venue-pin">${I.pin}</span><div class="main"><b>${esc(v.name)}</b><div class="small muted">${v.address ? esc(v.address) : 'No address'} · ${v.courtFee != null ? `${peso(v.courtFee)}/h per court` : 'No court fee set'}${v.entranceFee != null ? ` · ${peso(v.entranceFee)} entrance` : ''}</div></div></button><button class="btn xs ghost" data-act="venueEdit" data-id="${v.id}" aria-label="Edit ${esc(v.name)}">Edit</button></div>`).join('')}
        ${q && !exact ? `<button class="opt add" data-act="venueNew">+ Add “${esc(q)}” as a new venue</button>` : ''}
        ${!list.length && !q ? '<div class="empty">No saved venues yet.</div>' : ''}
        ${!q ? '<button class="opt add" data-act="venueNew">+ Add a new venue</button>' : ''}</div>`,
      '<button class="btn" data-act="closeSheet">Close</button>',
    )
  },
  profile(sh) {
    const p = P(sh.id)
    const city = regCity(p)
    const status = {
      registered: 'Registered ROTRA player',
      unclaimed: 'Profile exists but not claimed yet',
      guest: 'Guest, no ROTRA profile',
      pending: 'Profile lookup after the session syncs',
    }[p.identity]
    return sheetShell(
      esc(p.name),
      `
      <div class="li" style="padding:0">${avatar(p, 'xl')}<div class="main stack tight"><div class="row">${identChip(p)}</div><span class="small muted">${status}</span></div></div>
      <dl class="kv">
        <dt>Nickname</dt><dd>${p.nick ? esc(p.nick) : '—'}</dd>
        <dt>Level suggestion</dt><dd>${p.sugg != null ? esc(lvLabel(p.sugg)) : 'None yet'}</dd>
        <dt>Registered in</dt><dd>${city ? esc(city) : 'Not registered yet'}</dd>
        <dt>RTR ID</dt><dd>${p.rtr ? `<span class="mono small">${esc(p.rtr)}</span>` : 'None yet'}</dd>
        <dt>Added to club</dt><dd>${new Date(addedAt(p)).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</dd>
        <dt>Sessions here</dt><dd>${p.prior}</dd>
        <dt>Phone</dt><dd>${p.phoneHidden ? 'Hidden by player' : p.identity === 'guest' ? 'None on file' : 'Kept private; confirmed in person when adding them to a session'}</dd>
      </dl>
      <p class="small muted">Levels are set per session while preparing a roster, not here.</p>`,
      `${sh.back ? `<button class="btn" data-act="profileBack">Back to ${{ suggest: 'suggestion', payments: 'payments', dispatch: 'match', match: 'match', onCourt: 'match', invalid: 'match' }[sh.back.type] || 'previous'}</button>` : '<button class="btn" data-act="closeSheet">Close</button>'}${canInvite(p) ? `<button class="btn primary" data-act="openInvite" data-id="${p.id}">Invite</button>` : ''}`,
    )
  },
  invite(sh) {
    const p = P(sh.id)
    const claim = p.identity === 'unclaimed'
    const code = (hashStr(`${p.id}${p.name}`) >>> 0)
      .toString(36)
      .toUpperCase()
      .padStart(7, 'X')
      .slice(0, 7)
    const link = `https://rotra.example/join/${code}`
    return sheetShell(
      claim ? `Invite ${esc(p.name)} to claim their profile` : `Invite ${esc(p.name)} to ROTRA`,
      `
      <p>${claim ? 'They already have a ROTRA profile from playing here. This link lets them claim it' : 'This link lets them create a ROTRA account'} with their phone and email, so their games and rank follow them to every club.</p>
      ${
        S.online
          ? `<div class="field"><span>Invite link</span><div class="invite-link"><input class="input" id="invite-link" readonly value="${link}" aria-label="Invite link"><button class="btn sm primary" data-act="copyInvite" data-v="${link}">Copy link</button></div><span class="hint">Send it any way you like, such as Messenger or SMS. Sample link in this prototype.</span></div>`
          : notice('warn', 'Making an invite link needs an internet connection.')
      }
      <p class="small muted">The link only sets up their account. It doesn't book them into a session; you still add players to each session yourself.</p>`,
      `<button class="btn" data-act="closeSheet">Done</button>`,
    )
  },
  sync() {
    const log = S.syncLog || []
    const wait = log.filter((x) => !x.synced)
    const done = log.filter((x) => x.synced).slice(0, 15)
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
    const groups = (items, cls) => {
      const by = {}
      items.forEach((x) => {
        ;(by[x.area] = by[x.area] || []).push(x)
      })
      return Object.entries(by)
        .map(
          ([
            area,
            xs,
          ]) => `<div class="sync-grp ${cls}"><div class="between"><b>${esc(area)}</b><span class="small muted tnum">${plural(xs.length, 'change')}</span></div>
        <ul class="sync-list">${xs.map((x) => `<li><span>${esc(x.text)}</span><span class="small muted tnum">${fmtWhen(x.at)}</span></li>`).join('')}</ul></div>`,
        )
        .join('')
    }
    const [cls, title, text] = S.syncing
      ? ['sync', 'Syncing…', `Uploading ${plural(wait.length, 'change')} from this device.`]
      : !S.online
        ? [
            'off',
            'Working offline',
            wait.length
              ? `${plural(wait.length, 'change')} saved on this device, waiting for internet. They sync automatically when you reconnect.`
              : 'Nothing is waiting. New changes save on this device until you reconnect.',
          ]
        : [
            '',
            'Online and synced',
            `Everything on this device synced. Last sync ${fmtWhen(S.lastSync, { lower: true })}.`,
          ]
    return sheetShell(
      'Sync status',
      `
      <div class="sync-head ${cls}"><i aria-hidden="true"></i><div><b>${title}</b><p class="small muted">${text}</p></div></div>
      ${wait.length ? `<section class="stack tight"><span class="label">Waiting to sync · ${wait.length}</span>${groups(wait, 'wait')}</section>` : ''}
      <section class="stack tight"><span class="label">Synced from this device</span>${done.length ? groups(done, '') : '<p class="small muted">Nothing has synced from this device yet. Changes you make appear here.</p>'}</section>
      <p class="small muted">Shows changes made on this device only. Another device's changes appear after it syncs, and the public session page updates only from synced data.</p>`,
      '<button class="btn" data-act="closeSheet">Close</button>',
    )
  },
}
