import { chip, notice } from '../fragments.js'
import { esc, sessionCourtStart } from '../helpers.js'
import { S } from '../state.js'
import { fmtWhenRange } from '../time.js'
import { clubLogo } from './venues.js'

// ---------- Q-LOGIN ----------
export function viewLogin() {
  const L = S.ui.login
  return `<main class="login"><form class="card" data-form="login" novalidate>
    <div class="stack tight"><div class="mark">ROTR<b>A</b></div><p class="muted">Run the game.</p></div>
    <h1 style="font-size:22px">Club login</h1>
    ${L.err ? notice('bad', esc(L.err)) : ''}
    <label class="field"><span>Username</span><input class="input" id="login-user" autocomplete="username" data-bind="ui.login.user" value="${esc(L.user)}"><span class="hint">Your club account username, not a player phone or email.</span></label>
    <div class="field"><label for="login-pass" style="font-size:13px;font-weight:600;color:var(--fg2)">Password</label>
      <div class="row" style="flex-wrap:nowrap"><input class="input" id="login-pass" type="${L.show ? 'text' : 'password'}" autocomplete="current-password" data-bind="ui.login.pass" value="${esc(L.pass)}" placeholder="Any password works in this prototype">
      <button type="button" class="btn sm" data-act="togglePass" aria-pressed="${!!L.show}" aria-label="${L.show ? 'Hide password' : 'Show password'}">${L.show ? 'Hide' : 'Show'}</button></div></div>
    <button class="btn primary block" type="submit" id="login-submit" ${L.pending ? 'disabled' : ''}>${L.pending ? 'Signing in…' : 'Sign in'}</button>
    <p class="small muted">Club access is set up and licensed by the ROTRA platform owner.</p>
  </form></main>`
}

// ---------- Q-ACCESS ----------
export function viewAccess() {
  const act = S.sessions.find((s) => s.status === 'active')
  return `<main class="wrap narrow"><section class="card stack">
    <div class="li" style="padding:0">${clubLogo('lg')}<div class="main"><h1>${esc(S.club.name)}</h1></div>${chip('License expired', 'bad')}</div>
    <p>Your club's license has ended. New sessions, saved players and past reports are unavailable until it's renewed.</p>
    <p class="muted small">Licenses are monthly or yearly and are activated manually by the ROTRA platform owner. Contact them to renew.</p>
    ${act ? `<div class="card hl stack"><span class="label">You can still finish this session</span><h3>${esc(act.title)}</h3><p class="small muted">${fmtWhenRange(sessionCourtStart(act), act.end)} · ${esc(act.venue)}</p><p class="small">This lets you finish and sync it. It doesn't let you start another session.</p><div><button class="btn primary" data-act="go" data-to="console" data-id="${act.id}">Continue active session</button></div></div>` : ''}
  </section></main>`
}
