import { chip, notice, sw } from '../fragments.js'
import { esc, fmtDate, fmtTime } from '../helpers.js'
import { I, ymdToTime } from '../icons.js'
import { S } from '../state.js'
import { DEFAULT_RULES, POST_KEYS, POST_TABS, postSample, postTemplate } from './club-settings.js'
import { peso } from './financials.js'
import { viewAccess } from './login.js'

// ---------- Venues ----------
export function viewVenues() {
  if (S.licenseExpired) return viewAccess()
  const vs = S.venues || []
  const now = Date.now()
  return `<main class="wrap">
    <div class="crumb"><button class="btn sm ghost" data-act="go" data-to="home">${I.back} Home</button></div>
    <div class="between"><div><h1>Venues</h1><p class="small muted">Places your club books. Picking one in session setup fills in the address and court fee.</p></div><button class="btn sm primary" data-act="venueNew" data-manage="1">Add venue</button></div>
    ${
      vs.length
        ? `<div class="venue-grid">${vs
            .map((v) => {
              const here = S.sessions.filter((x) => x.venue === v.name && x.status !== 'cancelled')
              const next = here
                .filter((x) => x.start > now && x.status === 'prepared')
                .sort((a, b) => a.start - b.start)[0]
              return `<article class="venue-card">
        <div class="venue-head"><span class="venue-icon">${I.pin}</span><div class="main" style="min-width:0"><b class="venue-name">${esc(v.name)}</b><p class="small muted">${v.address ? esc(v.address) : 'No address'}</p></div></div>
        <div class="venue-stats"><div><b class="tnum">${v.courtFee != null ? peso(v.courtFee) : '—'}</b><span>per court, per hour</span></div><div><b class="tnum">${v.entranceFee != null ? peso(v.entranceFee) : '—'}</b><span>entrance per head</span></div><div><b class="tnum">${here.length}</b><span>session${here.length === 1 ? '' : 's'} here</span></div></div>
        <p class="small muted">${next ? `Next: ${esc(next.title)} · ${fmtDate(next.start)}` : 'Nothing booked here yet'}</p>
        <div class="row" style="margin-top:auto"><button class="btn sm primary" data-act="newSessionAt" data-id="${v.id}">Create session here</button><button class="btn sm" data-act="venueEdit" data-id="${v.id}" data-manage="1">Edit</button></div>
      </article>`
            })
            .join('')}</div>`
        : '<div class="card empty">No venues yet. Add one here, or when you create a session.</div>'
    }
  </main>`
}

// Club logo: an uploaded image when there is one, otherwise the club's initials.
export const clubLogo = (cls) =>
  S.club.logo
    ? `<span class="avatar ${cls} club-logo"><img src="${S.club.logo}" alt="${esc(S.club.name)} logo"></span>`
    : `<div class="avatar ${cls}" aria-hidden="true">${esc(S.club.initials)}</div>`
// License history recorded by the platform owner when activating a term. Amounts are sample values: prices aren't set.
export const LICENSE_PAYMENTS = [
  {
    paid: '2026-04-01',
    plan: 'Yearly',
    from: '2026-04-01',
    to: '2027-03-31',
    amount: 15000,
    ref: 'LIC-0004',
  },
  {
    paid: '2026-03-02',
    plan: 'Monthly',
    from: '2026-03-01',
    to: '2026-03-31',
    amount: 1500,
    ref: 'LIC-0003',
  },
  {
    paid: '2026-02-01',
    plan: 'Monthly',
    from: '2026-02-01',
    to: '2026-02-28',
    amount: 1500,
    ref: 'LIC-0002',
  },
  {
    paid: '2026-01-05',
    plan: 'Monthly',
    from: '2026-01-05',
    to: '2026-01-31',
    amount: 1500,
    ref: 'LIC-0001',
  },
]
const fmtYmd = (v) =>
  new Date(ymdToTime(v)).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
const CLUB_TABS = [
  [
    'Club',
    [
      ['identity', 'Club identity'],
      ['defaults', 'Session defaults'],
      ['post', 'Facebook post'],
    ],
  ],
  ['License', [['license', 'License and payments']]],
  ['This device', [['device', 'Downloads']]],
  ['Account', [['account', 'Account']]],
]
export function viewClub() {
  if (S.licenseExpired) return viewAccess()
  const downloaded = S.sessions.filter((s) => s.download === 'ready' && s.status !== 'cancelled')
  const until = ymdToTime(LICENSE_PAYMENTS[0].to)
  const daysLeft = Math.max(0, Math.ceil((until - Date.now()) / 864e5))
  const nameDraft = S.ui.clubName ?? S.club.name
  const want = S.ui.clubTab === 'payments' ? 'license' : S.ui.clubTab
  const tab = CLUB_TABS.some(([, items]) => items.some(([k]) => k === want)) ? want : 'identity'
  const ptab = POST_TABS.some(([k]) => k === S.ui.postTab) ? S.ui.postTab : 'tpl'
  const pw = S.ui.pw || (S.ui.pw = { cur: '', next: '', confirm: '', show: false, err: {} })
  const pwField = (k, label, ac, hint) =>
    `<div class="field"><label for="pw-${k}" style="font-size:13px;font-weight:600;color:var(--fg2)">${label}</label><input class="input${pw.err[k] ? ' bad' : ''}" id="pw-${k}" type="${pw.show ? 'text' : 'password'}" autocomplete="${ac}" data-bind="ui.pw.${k}" data-rerender value="${esc(pw[k])}" ${pw.err[k] ? `aria-invalid="true" aria-describedby="pw-${k}-e"` : ''}>${pw.err[k] ? `<span class="err" id="pw-${k}-e">${esc(pw.err[k])}</span>` : hint ? `<span class="hint">${hint}</span>` : ''}</div>`
  if (!S.online)
    return `<main class="wrap">
    <div class="crumb"><button class="btn sm ghost" data-act="go" data-to="home">${I.back} Home</button></div>
    <h1>Club settings</h1>
    <section class="card stack" style="max-width:560px">${notice('warn', "<b>Club settings need an internet connection.</b> Your club details, license and account are kept online, so they can't be viewed or changed while you're offline.")}
      <p class="small muted">Sessions downloaded to this device still run offline, and their changes sync when you reconnect.</p>
      <div><button class="btn" data-act="go" data-to="home">Back to home</button></div></section>
  </main>`
  const html = `
    <section class="card stack" id="club-identity"><h2>Club identity</h2>
      <div class="logo-edit">${clubLogo('xxl')}<div class="stack tight"><b>Club logo</b><p class="small muted">Shown on the dashboard, the public session page and result images. A square image works best.</p>
        <div class="row"><label class="btn sm" for="logo-file">${S.club.logo ? 'Replace logo' : 'Upload logo'}</label><input type="file" id="logo-file" class="sr-only" accept="image/*">${S.club.logo ? '<button class="btn sm ghost" data-act="removeLogo">Remove</button>' : ''}</div></div></div>
      ${
        S.club.nameRequest
          ? `<div class="field"><span style="font-size:13px;font-weight:600;color:var(--fg2)">Club name</span><b>${esc(S.club.name)}</b>
        ${notice('warn', `<b>Name change requested: “${esc(S.club.nameRequest.name)}”</b> · sent ${fmtDate(S.club.nameRequest.at)}, ${fmtTime(S.club.nameRequest.at)}. The ROTRA platform owner reviews it in Admin. Your club keeps its current name everywhere until it's approved.`)}
        <div><button class="btn sm" data-act="cancelNameRequest">Cancel request</button></div></div>`
          : `<div class="field"><label for="club-name" style="font-size:13px;font-weight:600;color:var(--fg2)">Club name</label>
        <div class="row field-row"><input class="input${S.ui.clubNameErr ? ' bad' : ''}" id="club-name" data-bind="ui.clubName" data-rerender maxlength="60" value="${esc(nameDraft)}"><button class="btn" data-act="saveClubName" ${!S.online || nameDraft.trim() === S.club.name ? 'disabled' : ''}>Request change</button></div>
        ${S.ui.clubNameErr ? `<span class="err">${esc(S.ui.clubNameErr)}</span>` : `<span class="hint">${S.online ? 'Name changes need approval from the ROTRA platform owner. Nothing changes until they approve it.' : 'Sending a request needs an internet connection.'}</span>`}</div>`
      }
      <dl class="kv"><dt>Founding address</dt><dd>${esc(S.club.founding.replace(/^Founded at /, ''))}</dd><dt>City code</dt><dd><span class="mono">PH-CEB</span> · used in new players' RTR IDs</dd></dl>
      <p class="small muted">The founding address and city code are fixed. Playing at a different venue doesn't change them.</p></section>
    <section class="card stack" id="club-post"><div><h2>Facebook post</h2><p class="small muted">The announcement you copy from a session with “Copy Facebook post”. Write it once with {{ keys }}; each session fills them in.</p></div>
      <div class="tabs" role="tablist" aria-label="Facebook post">${POST_TABS.map(([k, l]) => `<button role="tab" id="ptab-${k}" aria-selected="${ptab === k}" aria-controls="ppanel" data-act="postTab" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="stack" id="ppanel" role="tabpanel" aria-labelledby="ptab-${ptab}">${
        ptab === 'desc'
          ? `
      <label class="field"><span>Club description</span><textarea class="input" id="club-desc" rows="4" data-bind="ui.postDesc" data-rerender maxlength="300" placeholder="One or two lines about your club">${esc(S.ui.postDesc ?? (S.club.description || ''))}</textarea><span class="hint">Fills {{ club_description }}.</span></label>`
          : ptab === 'rules'
            ? `
      <label class="field"><span>Court rules</span><textarea class="input" id="club-rules" rows="10" data-bind="ui.postRules" data-rerender maxlength="800">${esc(S.ui.postRules ?? (S.club.courtRules != null ? S.club.courtRules : DEFAULT_RULES))}</textarea><span class="hint">Fills {{ court_rules }}.</span></label>`
            : `
      <div class="field"><span>Template</span>
        <div class="tpl-edit">
          <div class="tpl-keys" role="group" aria-label="Insert a key">${POST_KEYS.map(([k, l]) => `<button class="tpl-key" data-act="insertKey" data-k="${k}" aria-label="Insert {{ ${k} }}: ${esc(l)}"><span class="mono">{{ ${k} }}</span><span class="small muted">${esc(l)}</span></button>`).join('')}</div>
          <textarea class="input mono tpl" id="tpl" rows="18" data-bind="ui.postTpl" data-rerender spellcheck="false" aria-label="Post template">${esc(S.ui.postTpl ?? postTemplate())}</textarea>
        </div>
        <span class="hint">Click a key on the left to insert it where your cursor is in the template. Keys that don't exist are left as typed.</span></div>`
      }</div>
      <div class="row"><button class="btn" data-act="openPostPreview" ${postSample() ? '' : 'disabled title="Create a session first to preview the post"'}>Preview</button><span class="grow"></span><button class="btn primary" data-act="savePost" ${S.ui.postTpl == null && S.ui.postDesc == null && S.ui.postRules == null ? 'disabled' : ''}>Save post template</button><button class="btn ghost" data-act="resetPost">Reset template to default</button></div>
    </section>
    <section class="card stack" id="club-defaults"><div><h2>Session defaults</h2><p class="small muted">Used to fill in new sessions. You can still change them in each session.</p></div>
      <div class="li" style="padding:0"><div class="main"><b>Players per court</b><p class="small muted">Your slot budget: ${S.club.perCourt || 8} players for each court you reserve, so 3 courts give ${3 * (S.club.perCourt || 8)} slots. The rest go on the waitlist.</p></div><div class="row" style="flex-wrap:nowrap"><button class="btn sm icon-btn" data-act="clubPerCourt" data-d="-1" aria-label="Fewer players per court" ${(S.club.perCourt || 8) <= 2 ? 'disabled' : ''}>−</button><b class="tnum" style="font-size:20px;min-width:28px;text-align:center" aria-live="polite">${S.club.perCourt || 8}</b><button class="btn sm icon-btn" data-act="clubPerCourt" data-d="1" aria-label="More players per court" ${(S.club.perCourt || 8) >= 20 ? 'disabled' : ''}>+</button></div></div>
      <div class="li" style="padding:0"><div class="main"><b>Entrance fee per head</b><p class="small muted">${S.club.entranceFee != null ? `New sessions list a ${peso(S.club.entranceFee)} entrance fee per head, unless the venue has its own.` : 'New sessions start with no entrance fee, unless the venue has one.'} A misc cost, shown for transparency.</p></div>${sw(S.ui.feeOn ?? S.club.entranceFee != null, 'toggleClubFee', '', 'Add an entrance fee per head by default')}</div>
      ${(S.ui.feeOn ?? S.club.entranceFee != null) ? `<div class="field"><label for="club-fee" style="font-size:13px;font-weight:600;color:var(--fg2)">Amount per person</label><div class="row" style="flex-wrap:nowrap"><div class="money" style="flex:1"><span>₱</span><input class="input${S.ui.clubFeeErr ? ' bad' : ''}" id="club-fee" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.clubFee" value="${esc(S.ui.clubFee ?? S.club.entranceFee ?? '')}" placeholder="0"></div><button class="btn" data-act="saveClubFee">Save</button></div>${S.ui.clubFeeErr ? `<span class="err">${esc(S.ui.clubFeeErr)}</span>` : '<span class="hint">It\'s added to each session\'s costs, so the payment per player covers it.</span>'}</div>` : ''}
    </section>
    <section class="card stack" id="club-license"><div class="between"><h2>License</h2>${chip('Active', 'ok')}</div>
      <div class="tiles4">
        <div class="card"><span class="label">Plan</span><b class="big">Yearly</b></div>
        <div class="card"><span class="label">Active since</span><b>${fmtYmd(LICENSE_PAYMENTS[0].from)}</b></div>
        <div class="card"><span class="label">Active until</span><b>${fmtYmd(LICENSE_PAYMENTS[0].to)}</b></div>
        <div class="card"><span class="label">Days left</span><b class="big tnum">${daysLeft}</b></div>
      </div>
      <p class="small muted">Licenses are monthly or yearly. The ROTRA platform owner activates and renews them by hand after you pay outside ROTRA, so contact them to renew or change plans. If it lapses, a session already running can still be finished and synced.</p></section>
    <section class="card stack" id="club-payments"><div class="between"><div><h2>Payment history</h2><p class="small muted">Recorded by the platform owner each time a license is activated.</p></div><button class="btn sm" data-act="exportPayments">Export CSV</button></div>
      <div class="lb-wrap"><table class="lb stack-table"><thead><tr><th>Paid</th><th>Plan</th><th>Covers</th><th class="n">Amount</th><th>Reference</th></tr></thead><tbody>
        ${LICENSE_PAYMENTS.map((x) => `<tr><td data-label="Paid">${fmtYmd(x.paid)}</td><td data-label="Plan">${x.plan}</td><td class="small" data-label="Covers">${fmtYmd(x.from)} – ${fmtYmd(x.to)}</td><td class="n tnum" data-label="Amount">${peso(x.amount)}</td><td class="mono small" data-label="Reference">${x.ref}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small muted">Sample amounts. License prices haven't been decided yet.</p></section>
    <section class="card stack" id="club-device"><h2>This device</h2>
      ${downloaded.length ? `<div class="list">${downloaded.map((s) => `<div class="li"><div class="main"><b>${esc(s.title)}</b><p class="small muted">${fmtDate(s.start)} · ready for offline use</p></div>${chip('Ready', 'ok')}</div>`).join('')}</div>` : '<p class="small muted">No sessions downloaded on this device yet. Download one from its preparation page.</p>'}
      <p class="small muted">Downloads are per device. A session downloaded on a laptop isn't ready on a phone.</p></section>
    <section class="card stack" id="club-account"><h2>Account</h2>
      <dl class="kv"><dt>Username</dt><dd class="mono">${esc(S.ui.login.user || 'lahug.smash')}</dd></dl>
      <form class="stack" data-form="password" novalidate><div><h3>Change password</h3><p class="small muted">Enter your current password to set a new one. It changes for every device that signs in to this club account.</p></div>
        ${pwField('cur', 'Current password', 'current-password')}
        ${pwField('next', 'New password', 'new-password', 'At least 8 characters.')}
        ${pwField('confirm', 'Confirm new password', 'new-password')}
        <div class="row"><button class="btn primary" type="submit" ${!pw.cur || !pw.next || !pw.confirm ? 'disabled' : ''}>Change password</button><button class="btn sm ghost" type="button" data-act="togglePw" aria-pressed="${!!pw.show}">${pw.show ? 'Hide passwords' : 'Show passwords'}</button></div>
        <p class="small muted">Forgot your current password? The ROTRA platform owner can reset it for you.</p></form>
      <div style="border-top:1px solid var(--border);padding-top:14px"><button class="btn sm" data-act="openSignOut">Sign out</button></div></section>`
  // Show only the chosen section; the left menu switches between them. License payments sit on the License page.
  const shown = html.replace(/<section class="card stack" id="club-([a-z]+)"/g, (m, k) =>
    (k === 'payments' ? 'license' : k) === tab ? m : `${m} hidden`,
  )
  return `<main class="wrap">
    <div class="crumb"><button class="btn sm ghost" data-act="go" data-to="home">${I.back} Home</button></div>
    <h1>Club settings</h1>
    <div class="settings ${S.ui.setOpen ? 'set-open' : ''}">
      <button class="settings-trigger" data-act="openSettingsMenu" aria-controls="settings-menu" aria-expanded="${!!S.ui.setOpen}"><span class="row" style="gap:10px">${I.n_menu}<span>${esc((CLUB_TABS.flatMap(([, items]) => items).find(([k]) => k === tab) || ['', 'Club identity'])[1])}</span></span><span class="small muted">All settings</span></button>
      <div class="set-scrim" data-act="closeSettingsMenu" aria-hidden="true"></div>
      <nav class="settings-nav card" id="settings-menu" aria-label="Club settings"><div class="sn-head"><b>Club settings</b><button class="btn xs ghost icon-btn" data-act="closeSettingsMenu" aria-label="Close settings menu">${I.x}</button></div>${CLUB_TABS.map(([group, items]) => `<div class="sn-group"><span class="label">${group}</span>${items.map(([k, l]) => `<button class="side-link ${k === tab ? 'on' : ''}" data-act="clubTab" data-k="${k}" ${k === tab ? 'aria-current="page"' : ''}><span>${l}</span></button>`).join('')}</div>`).join('')}
        <button class="side-link sn-signout" data-act="openSignOut">${I.n_logout}<span>Sign out</span></button></nav>
      <div class="settings-body">${shown}</div>
    </div>
  </main>`
}
