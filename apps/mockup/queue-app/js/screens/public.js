import { chip, fmtFormats, notice } from '../fragments.js'
import { avatar, cur, esc, fmtDate, fmtDur, P, waitOf } from '../helpers.js'
import { I } from '../icons.js'
import { MODES, S } from '../state.js'
import { fmtRange, fmtWhen } from '../time.js'
import { slideAwards, slideOffDay, slideStandings } from './results.js'
import { joinCard } from './setup.js'
import { clubLogo } from './venues.js'

// ---------- Q-PUBLIC ----------
export function viewPublic() {
  const s = cur()
  const tab = S.ui.pubTab
  const back = s.status === 'active' ? 'console' : s.status === 'prepared' ? 'prepare' : 'history'
  const pub = s.published
  const why = (s.cancelReason || '').replace(/[.\s]+$/, '')
  return `<div class="proto-bar"><div class="in"><span>${S.ui.guest ? '<b>Guest view (prototype).</b> What a guest sees after opening your session link. Try Request to join.' : '<b>Public page preview.</b> What anyone with the session link sees, no sign-in needed.'}</span><button class="btn xs" data-act="go" data-to="${back}">${I.back} Back to Queue app</button></div></div>
  <main class="wrap narrow">
    <section class="pub-hero">
      <span class="pub-date">${fmtDate(s.start)} · ${fmtRange(s.start, s.end)}</span>
      <h1>${esc(s.title)}</h1>
      <div class="li" style="padding:0">${clubLogo('')}<div class="main"><b>${esc(S.club.name)}</b><p class="small muted">Organizer</p></div>${s.status === 'active' ? chip('Happening now', 'ok') : s.status === 'finalized' ? chip('Finished') : s.status === 'cancelled' ? chip('Cancelled') : ''}</div>
    </section>
    ${s.status === 'cancelled' ? `<section class="card stack join-card">${notice('warn', `<b>This session is cancelled.</b>${why ? ` ${esc(why)}.` : ''}`)}</section>` : joinCard(s)}
    <div class="tabs" role="tablist" style="display:flex">${[
      ['details', 'Details'],
      ['participants', `Participants · ${s.roster.length}`],
    ]
      .map(
        ([k, l]) =>
          `<button role="tab" aria-selected="${tab === k}" data-act="pubTab" data-k="${k}">${l}</button>`,
      )
      .join('')}</div>
    ${
      tab === 'details'
        ? `<section class="card stack"><dl class="kv">
      <dt>When</dt><dd>${fmtDate(s.start)}, ${fmtRange(s.start, s.end)} (${fmtDur(s.start, s.end)})</dd>
      <dt>Venue</dt><dd>${esc(s.venue)}${s.address ? `<br><span class="muted small">${esc(s.address)}</span>` : ''}</dd>
      <dt>Courts</dt><dd>${s.courts.length} · ${s.courts.map((c) => esc(c.label)).join(', ')}</dd>
      <dt>Formats</dt><dd>${fmtFormats(s)}</dd>
      <dt>Mode</dt><dd>${MODES[s.mode].label} · <span class="muted">${MODES[s.mode].text}</span></dd>
      <dt>Minimum</dt><dd>${s.minimum} games per player</dd></dl>
      ${s.notes ? `<p>${esc(s.notes)}</p>` : ''}
      <p class="small muted">Slots are confirmed by the Queue Master. Last updated ${fmtWhen(S.lastSync, { lower: true })}${S.pending ? '. Recent changes from the venue haven’t synced yet.' : '.'}</p></section>`
        : `<section class="stack">${
            s.roster.length
              ? `<div class="pgrid">${s.roster
                  .map((r) => {
                    const p = P(r.pid)
                    return `<div class="pcard">${avatar(p)}<div style="min-width:0"><b>${esc(p.name)}</b>${p.identity === 'registered' || p.identity === 'unclaimed' ? '<p class="small muted">Has a ROTRA profile</p>' : ''}</div></div>`
                  })
                  .join('')}</div>`
              : '<div class="card empty">Players have not been added yet.</div>'
          }${
            (s.waitlist || []).length
              ? `<h3>Waitlist · ${s.waitlist.length}</h3><ol class="pub-wait">${waitOf(s)
                  .map((w) => `<li>${esc(P(w.pid).name)}</li>`)
                  .join(
                    '',
                  )}</ol><p class="small muted">Waitlisted players get a slot if one opens. Ask the Queue Master.</p>`
              : ''
          }</section>`
    }
    ${
      s.status === 'finalized'
        ? pub
          ? `<section class="stack"><h2>Results</h2>${pub.slides.includes(0) ? slideStandings(s) : ''}${pub.slides.includes(1) ? slideAwards(s) : ''}${pub.offDay ? slideOffDay(s, true) : ''}</section>`
          : '<section class="card empty">Results for this session have not been shared.</section>'
        : ''
    }
  </main>`
}
