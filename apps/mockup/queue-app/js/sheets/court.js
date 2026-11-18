import { chip, faceTeam, notice } from '../fragments.js'
import {
  all,
  avatar,
  busyOf,
  courtOpen,
  courtStart,
  courtsNeeded,
  courtsOf,
  cur,
  esc,
  freeCourts,
  gamesOf,
  listNames,
  lvLabel,
  nm,
  P,
  R,
  short,
  subLine,
  waiting,
} from '../helpers.js'
import { blockOf, swapCandidate } from '../rules/court-fill.js'
import { restInfo } from '../screens/console-board.js'
import { FORMAT_LABEL, FUN } from '../state.js'
import { fmtWhen } from '../time.js'
import { playerTile } from './player-picker.js'
import { sheetShell } from './sheets.js'

export const SHEETS_COURT = {
  dispatch(sh) {
    const s = cur()
    const m = s.matches.find((x) => x.id === sh.id)
    const need = courtsNeeded(m)
    const sel = sh.courts || []
    const b = blockOf(s, m)
    return sheetShell(
      `Put match ${m.seq} on court`,
      `<div class="row">${chip(FORMAT_LABEL[m.format], 'solid')}${FUN.includes(m.format) ? chip('Fun game') : ''}</div>
      <div class="qteams">${faceTeam(s, m.teamA, 'Team A', `m:${m.id}`)}<span class="vs">VS</span>${faceTeam(s, m.teamB, 'Team B', `m:${m.id}`)}</div>
      <p class="small muted">Drag a player onto someone on the other team to switch sides.</p>
      <div class="field"><span>${need === 2 ? 'Choose two free courts' : 'Court'}</span><div class="row">${
        freeCourts(s)
          .map(
            (c) =>
              `<button class="btn sm" aria-pressed="${sel.includes(c.id)}" data-act="pickCourt" data-id="${c.id}">${esc(c.label)}</button>`,
          )
          .join('') || '<span class="small muted">No court is free.</span>'
      }</div>${need === 2 ? '<span class="hint">5v5 uses two courts as one match.</span>' : ''}</div>
      ${
        s.courts.some((c) => !courtOpen(s, c))
          ? `<div class="field"><span>Not open yet</span>${s.courts
              .filter((c) => !courtOpen(s, c))
              .map(
                (c) =>
                  `<div class="between"><span class="small">${esc(c.label)} <span class="muted">· Opens ${fmtWhen(courtStart(s, c), { lower: true })}</span></span><button class="btn xs" data-act="dispatchOpenEarly" data-id="${c.id}">Start anyway</button></div>`,
              )
              .join(
                '',
              )}<span class="hint">Start anyway opens the court now. The booking time and costs don't change.</span></div>`
          : ''
      }
      ${b ? notice('bad', esc(b.text)) : ''}
      <p class="small muted">The match goes on court getting ready. Its time starts when you tap Start match.</p>`,
      `<button class="btn" data-act="closeSheet">Back</button><button class="btn primary" data-act="confirmDispatch" ${sel.length !== need || b ? 'disabled' : ''}>Put on court</button>`,
    )
  },
  // Q-ON-COURT: placed, not started. Lineup changes here are plain edits: no substitution record, no credit question.
  onCourt(sh) {
    const s = cur()
    const m = s.matches.find((x) => x.id === sh.id)
    const b = blockOf(s, m)
    return sheetShell(
      `Match ${m.seq} · ${esc(courtsOf(s, m))} · Getting ready`,
      `<div class="row">${chip(FORMAT_LABEL[m.format], 'solid')}${FUN.includes(m.format) ? chip('Fun game') : ''}${chip('Getting ready')}</div>
      <div class="qteams">${faceTeam(s, m.teamA, 'Team A', `m:${m.id}`)}<span class="vs">VS</span>${faceTeam(s, m.teamB, 'Team B', `m:${m.id}`)}</div>
      <p class="small muted">Drag a player onto someone on the other team to switch sides. Placed ${fmtWhen(m.placedAt, { lower: true })}; the time starts when you tap Start match.</p>
      ${b ? notice('bad', `${esc(b.text)}. Replace the player or send the match back to the queue.`) : ''}
      ${(() => {
        const n = swapCandidate(s, m),
          at = n ? waiting(s).indexOf(n) + 1 : 0
        return `<div class="row"><button class="btn sm" data-act="openReplace" data-id="${m.id}">Replace player</button><button class="btn sm" data-act="openMoveCourt" data-id="${m.id}">Move to another court</button><button class="btn sm" data-act="openSwap" data-id="${m.id}" ${n ? '' : 'disabled'}>${n ? `Swap with #${at}` : 'Swap with the queue'}</button></div>
      <p class="small muted">${n ? `Swap: Match ${n.seq} (${esc(listNames(n.teamA))} vs ${esc(listNames(n.teamB))}) goes on ${esc(courtsOf(s, m))}, and this match takes its place at #${at} in the queue.` : 'Swap: no other waiting match is ready for this court.'}</p>`
      })()}`,
      `<button class="btn" data-act="sendBack" data-id="${m.id}">Send back to queue</button><button class="btn primary" data-act="startOnCourt" data-id="${m.id}" ${b ? 'disabled' : ''}>Start match</button>`,
    )
  },
  // Swap confirmation: what is on the court and in the queue slot now, and after the swap. Nothing starts.
  swap(sh) {
    const s = cur(),
      m = s.matches.find((x) => x.id === sh.id),
      n = s.matches.find((x) => x.id === sh.with)
    const at = waiting(s).indexOf(n) + 1,
      where = courtsOf(s, m)
    // Each face shows its games this session (badge) and minutes since the player's last game, colored like the queue cards.
    const face = (p) => {
      const mins = restInfo(s, p).mins,
        g = gamesOf(s, p)
      return `<div class="qf" aria-label="${esc(nm(p))}, ${g} of ${s.minimum} games, waiting ${mins} min"><span class="pf-face">${avatar(P(p))}<span class="pf-g tnum" aria-hidden="true">${g}</span></span><span class="qf-n">${esc(short(p))}</span><span class="qf-w tnum ${mins >= 16 ? 'err' : mins >= 10 ? 'warn' : ''}">${mins} min</span></div>`
    }
    const faces = (ids) => `<div class="qfaces">${ids.map(face).join('')}</div>`
    const card = (x, after) =>
      `<div class="swap-card ${after ? 'after' : ''}"><span class="small ${after ? '' : 'muted'}"><b>Match ${x.seq}</b>${after ? ' · after' : ' · now'}</span>${faces(x.teamA)}<span class="vs">VS</span>${faces(x.teamB)}</div>`
    const row = (label, now, after) =>
      `<div class="swap-row"><span class="label">${label}</span><div class="swap-pair">${card(now)}<span class="swap-arr" aria-hidden="true">→</span>${card(after, true)}</div></div>`
    return sheetShell(
      `Swap match ${m.seq} with #${at}?`,
      `<p class="small muted">Match ${n.seq} goes on ${esc(where)}, getting ready. Match ${m.seq} takes its place at #${at} in the queue. Nothing starts until you tap Start match.</p>
      <div class="swap-pv">${row(esc(where), m, n)}</div>`,
      `<button class="btn" data-act="${sh.back ? 'openMatch' : 'closeSheet'}" data-id="${m.id}">${sh.back ? 'Back to match' : 'Cancel'}</button><button class="btn primary" data-act="confirmSwap">Swap matches</button>`,
    )
  },
  replace(sh) {
    const s = cur()
    const m = s.matches.find((x) => x.id === sh.id)
    const lineup = new Set(all(m))
    const cand = s.roster.filter((r) => r.present && !lineup.has(r.pid) && !busyOf(s, r.pid))
    return sheetShell(
      `Replace a player in match ${m.seq}`,
      `
      <div class="field"><span>Who's coming out?</span><div class="pick-grid">${all(m)
        .map((p) =>
          playerTile(s, p, {
            attrs: `data-act="sheetSet" data-k="out" data-v="${p}"`,
            pressed: sh.out === p,
            note: `Team ${m.teamA.includes(p) ? 'A' : 'B'}${R(s, p) && R(s, p).present ? '' : ' · not present'}`,
          }),
        )
        .join('')}</div></div>
      <div class="field"><span>Replacement</span>${cand.length ? `<div class="pick-grid">${cand.map((r) => playerTile(s, r.pid, { attrs: `data-act="sheetSet" data-k="in" data-v="${r.pid}"`, pressed: sh.in === r.pid })).join('')}</div>` : '<p class="small muted">No present player is free right now.</p>'}</div>
      <p class="small muted">The match hasn't started, so this is a lineup change. The replacement plays the whole game; it isn't recorded as a substitution.</p>`,
      `<button class="btn" data-act="openMatch" data-id="${m.id}">Back</button><button class="btn primary" data-act="confirmReplace" ${sh.out && sh.in ? '' : 'disabled'}>Replace player</button>`,
    )
  },
  moveCourt(sh) {
    const s = cur()
    const m = s.matches.find((x) => x.id === sh.id)
    const need = courtsNeeded(m)
    const sel = sh.courts || []
    return sheetShell(
      `Move match ${m.seq}`,
      `<p class="small muted">Now on ${esc(courtsOf(s, m))}. It stays getting ready on the new court.</p>
      <div class="field"><span>${need === 2 ? 'Choose two free courts' : 'Move to'}</span><div class="row">${
        freeCourts(s)
          .map(
            (c) =>
              `<button class="btn sm" aria-pressed="${sel.includes(c.id)}" data-act="pickCourt" data-id="${c.id}">${esc(c.label)}</button>`,
          )
          .join('') || '<span class="small muted">No other court is free.</span>'
      }</div>${need === 2 ? '<span class="hint">5v5 uses two courts as one match.</span>' : ''}</div>`,
      `<button class="btn" data-act="openMatch" data-id="${m.id}">Back</button><button class="btn primary" data-act="confirmMove" ${sel.length !== need ? 'disabled' : ''}>Move match</button>`,
    )
  },
  match(sh) {
    const s = cur()
    const m = s.matches.find((x) => x.id === sh.id)
    const mins = Math.max(0, Math.round((Date.now() - m.startedAt) / 60000))
    return sheetShell(
      `Match ${m.seq} · ${esc(courtsOf(s, m))}`,
      `
      <p class="small muted">${FORMAT_LABEL[m.format]} · started ${fmtWhen(m.startedAt, { lower: true })} · ${mins} min in</p>
      <div class="qteams">${faceTeam(s, m.teamA, 'Team A')}<span class="vs">VS</span>${faceTeam(s, m.teamB, 'Team B')}</div>
      ${(m.subs || []).map((x) => `<p class="small muted">Substitution: ${esc(subLine(x, m))}.</p>`).join('')}
      <p class="small muted">The court stays in use until you confirm a winner or mark the match invalid. Closing this doesn't end the game.</p>`,
      `<button class="btn danger" data-act="openInvalid" data-id="${m.id}">Mark invalid</button><button class="btn" data-act="openSub" data-id="${m.id}">Substitute player</button><button class="btn primary" data-act="openResult" data-id="${m.id}">Match done</button>`,
    )
  },
  result(sh) {
    const s = cur()
    const m = s.matches.find((x) => x.id === sh.id)
    const mode = sh.mode || 'winner'
    if (sh.step === 'review') {
      const w = sh.winner
      return sheetShell(
        'Confirm match result',
        `
        <div class="card stack"><span class="label">Winner</span><h2>Team ${w}: ${esc(listNames(w === 'A' ? m.teamA : m.teamB))}</h2>
        <p class="small muted">Against Team ${w === 'A' ? 'B' : 'A'}: ${esc(listNames(w === 'A' ? m.teamB : m.teamA))}</p>
        ${mode === 'scores' ? `<p class="tnum"><b>${esc(sh.a)}–${esc(sh.b)}</b> <span class="muted small">(Team A–Team B)</span></p>` : '<p class="small muted">No score entered</p>'}
        <p class="small muted">${esc(courtsOf(s, m))}</p></div>
        ${notice('warn', `<b>This result cannot be changed after confirmation.</b> ${m.courts.length > 1 ? 'Both courts' : 'The court'} will become available.`)}`,
        `<button class="btn" data-act="sheetSet" data-k="step" data-v="">Back to result</button><button class="btn primary" data-act="confirmResult">Confirm Team ${w} wins</button>`,
      )
    }
    const hasScore = (sh.a !== '' && sh.a != null) || (sh.b !== '' && sh.b != null)
    const body = `<span class="label">Pick the winner</span>
      <div class="choices">${['A', 'B'].map((t) => `<button class="choice" aria-pressed="${sh.winner === t}" data-act="sheetSet" data-k="winner" data-v="${t}"><span class="label">Team ${t}</span><b>${esc(listNames(t === 'A' ? m.teamA : m.teamB))}</b></button>`).join('')}</div>
      <div class="or-sep" role="separator"><span>OR</span></div>
      <span class="label">Enter the final score</span>
      <div class="score-row">
        <label class="field"><span>Team A · ${esc(listNames(m.teamA))}</span><input class="input tnum" id="score-a" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.sheet.a" value="${esc(sh.a ?? '')}" placeholder="0"></label>
        <span class="vs" style="padding-bottom:12px">–</span>
        <label class="field"><span>Team B · ${esc(listNames(m.teamB))}</span><input class="input tnum" id="score-b" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.sheet.b" value="${esc(sh.b ?? '')}" placeholder="0"></label>
      </div>
      <div class="between">${sh.err ? `<span class="err">${esc(sh.err)}</span>` : '<span class="hint">Scores are optional. If you enter them, the higher score wins.</span>'}${hasScore ? '<button class="btn xs ghost" data-act="clearScores">Clear scores</button>' : ''}</div>`
    return sheetShell(
      `Match ${m.seq} result`,
      body,
      `<button class="btn" data-act="openMatch" data-id="${m.id}">Back</button><button class="btn primary" data-act="reviewResult">Review result</button>`,
    )
  },
  sub(sh) {
    const s = cur()
    const m = s.matches.find((x) => x.id === sh.id)
    const lineup = new Set(all(m))
    const cand = s.roster.filter((r) => r.present && !lineup.has(r.pid) && !busyOf(s, r.pid))
    const credit = sh.credit || 'none'
    const mins = Math.max(0, Math.round((Date.now() - m.startedAt) / 60000))
    if (sh.step === 'confirm') {
      const who = credit === 'in' ? sh.in : credit === 'out' ? sh.out : null,
        other = credit === 'in' ? sh.out : sh.in
      return sheetShell(
        'Confirm substitution',
        `<dl class="kv"><dt>Out</dt><dd>${esc(nm(sh.out))}</dd><dt>In</dt><dd>${esc(nm(sh.in))} · ${esc(lvLabel(R(s, sh.in).level))}</dd><dt>Team</dt><dd>Team ${m.teamA.includes(sh.out) ? 'A' : 'B'}</dd><dt>Gets this game</dt><dd>${who ? `${esc(nm(who))} (QM choice)` : 'Nobody'}</dd></dl>
        ${notice('warn', who ? `${esc(nm(who))} gets this game: it counts toward their games, minimum and session wins/losses. ${esc(nm(other))} gets nothing from it. Long-term rank never counts it.` : "Neither player's partial game will count toward their minimum or long-term performance.")}`,
        '<button class="btn" data-act="sheetSet" data-k="step" data-v="">Back</button><button class="btn primary" data-act="confirmSub">Confirm substitution</button>',
      )
    }
    return sheetShell(
      `Substitute in match ${m.seq}`,
      `
      <div class="field"><span>Who's coming off?</span><div class="pick-grid">${all(m)
        .map((p) =>
          playerTile(s, p, {
            attrs: `data-act="sheetSet" data-k="out" data-v="${p}"`,
            pressed: sh.out === p,
            note: `Team ${m.teamA.includes(p) ? 'A' : 'B'}`,
          }),
        )
        .join('')}</div></div>
      <div class="field"><span>Replacement</span>${cand.length ? `<div class="pick-grid">${cand.map((r) => playerTile(s, r.pid, { attrs: `data-act="sheetSet" data-k="in" data-v="${r.pid}"`, pressed: sh.in === r.pid })).join('')}</div>` : '<p class="small muted">No present player is free right now.</p>'}</div>
      <div class="field"><span id="sub-credit-label">Who gets this game?</span>
        <div class="choices" role="group" aria-labelledby="sub-credit-label">${[
          ['none', 'Nobody', 'Usual'],
          [
            'in',
            sh.in ? `${esc(P(sh.in).name)} (coming in)` : 'Player coming in',
            'Counts as a full game for them',
          ],
          [
            'out',
            sh.out ? `${esc(P(sh.out).name)} (going off)` : 'Player going off',
            'Counts as a full game for them',
          ],
        ]
          .map(([k, label, note]) => {
            const off = (k === 'in' && !sh.in) || (k === 'out' && !sh.out)
            return `<button class="choice" aria-pressed="${credit === k}" data-act="sheetSet" data-k="credit" data-v="${k}" ${off ? 'disabled' : ''}><b>${label}</b><span class="small muted">${note}</span></button>`
          })
          .join('')}</div>
        <span class="hint">Started ${mins} min ago. At most one person gets this game; it never counts toward long-term rank.</span></div>`,
      `<button class="btn" data-act="openMatch" data-id="${m.id}">Back</button><button class="btn primary" data-act="sheetSet" data-k="step" data-v="confirm" ${sh.out && sh.in ? '' : 'disabled'}>Review substitution</button>`,
    )
  },
  // Delete a planned session nobody is confirmed in. Needs internet; confirmed players block it (Open roster instead).
}
