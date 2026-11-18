import { chip, faceTeam, notice, SWAP_TIP } from '../fragments.js'
import {
  active,
  all,
  avatar,
  busyOf,
  courtLabel,
  courtMatches,
  courtStart,
  courtsNeeded,
  courtsOf,
  cur,
  esc,
  fmtDate,
  gamesOf,
  listNames,
  lvLabel,
  nm,
  onCourt,
  P,
  R,
  sessionCourtStart,
  short,
  waiting,
} from '../helpers.js'
import { I } from '../icons.js'
import { blockOf } from '../rules/court-fill.js'
import { autoState } from '../screens/console-auto.js'
import { awards, standings } from '../screens/results.js'
import { pendingReqs } from '../screens/setup.js'
import { FORMAT_LABEL, FORMATS, FUN, MODES, S } from '../state.js'
import {
  addCourtPreview,
  addCourtStart,
  addCourtWindow,
  dayStart,
  daysBetween,
  dtPicker,
  endStatus,
  fmtRange,
  fmtWhen,
  fmtWhenRange,
} from '../time.js'
import { pickerSheet } from './player-picker.js'
import { sheetShell } from './sheets.js'

export const SHEETS_SESSION = {
  deleteSession(sh) {
    const s = cur(),
      conf = s.roster.length,
      wl = (s.waitlist || []).length,
      rq = pendingReqs(s).length
    const roster = `${conf} confirmed${wl ? ` · ${wl} on the waitlist` : ''}${rq ? ` · ${rq} join request${rq === 1 ? '' : 's'}` : ''}`
    const kv = `<dl class="kv"><dt>Session</dt><dd>${esc(s.title)}</dd><dt>When</dt><dd>${fmtDate(s.start)} · ${fmtRange(s.start, s.end)}</dd><dt>Venue</dt><dd>${esc(s.venue)}</dd><dt>Roster</dt><dd>${roster}</dd></dl>`
    if (conf)
      return sheetShell(
        "Can't delete this session",
        `${kv}
      <p>${conf} player${conf === 1 ? ' is' : 's are'} confirmed for this session. Remove every confirmed player from the roster first, then delete the session.</p>`,
        '<button class="btn" data-act="closeSheet" data-autofocus>Back</button><button class="btn primary" data-act="deleteOpenRoster">Open roster</button>',
      )
    return sheetShell(
      'Delete session?',
      `${kv}
      ${!S.online ? notice('warn', "You're offline. Connect to delete this session.") : ''}
      <p>The session, its public link, its waitlist and any join requests are removed. This cannot be undone.</p>`,
      `<button class="btn" data-act="closeSheet" data-autofocus>Keep session</button><button class="btn danger" data-act="confirmDeleteSession" ${!S.online ? 'disabled' : ''}>Delete session</button>`,
    )
  },
  // Cancel a planned session (before Start session only). Final: the record keeps its roster, waitlist and payment marks.
  cancelSession(sh) {
    const s = cur(),
      pay = s.payments || {}
    const paidN = s.roster.filter((r) => pay[r.pid]).length,
      wl = (s.waitlist || []).length
    return sheetShell(
      `Cancel ${esc(s.title)}?`,
      `<p>${fmtDate(s.start)} · ${fmtRange(s.start, s.end)}</p>
      <p class="small muted">${s.roster.length} player${s.roster.length === 1 ? '' : 's'} joined · ${wl} on the waitlist</p>
      ${paidN ? notice('warn', `${paidN} player${paidN === 1 ? ' is' : 's are'} marked paid. Refunds happen outside ROTRA.`) : ''}
      <label class="field"><span>Reason (optional)</span><input class="input" id="cancel-reason" data-bind="ui.sheet.reason" value="${esc(sh.reason || '')}" maxlength="120" autocomplete="off"></label>
      ${notice('bad', "This can't be undone. To play anyway, create a new session.")}`,
      '<button class="btn" data-act="closeSheet" data-autofocus>Keep session</button><button class="btn danger" data-act="confirmCancelSession">Cancel session</button>',
    )
  },
  invalid(sh) {
    const s = cur()
    const m = s.matches.find((x) => x.id === sh.id)
    return sheetShell(
      'Mark match invalid?',
      `<p>Match ${m.seq} on ${esc(courtsOf(s, m))}</p>
      <div class="qteams">${faceTeam(s, m.teamA, 'Team A')}<span class="vs">VS</span>${faceTeam(s, m.teamB, 'Team B')}</div>
      ${notice('bad', 'No game, win, loss, or minimum-game credit will be recorded. This decision cannot be changed.')}`,
      `<button class="btn" data-act="openMatch" data-id="${m.id}">Keep playing</button><button class="btn danger" data-act="confirmInvalid">Confirm invalid match</button>`,
    )
  },
  editor(sh) {
    const s = cur()
    if (sh.picking) return pickerSheet(s, sh)
    const fmts = [...(s.singles ? ['singles'] : []), ...(s.doubles ? ['doubles'] : []), ...FUN]
    const [na, nb] = FORMATS[sh.format]
    const used = sh.teamA.concat(sh.teamB).filter(Boolean)
    const dup = used.filter((p, i) => used.indexOf(p) !== i)
    const slotSel = (team, i) => {
      const v = sh[team][i] || ''
      const label = `Team ${team === 'teamA' ? 'A' : 'B'} player ${i + 1}`
      if (!v)
        return `<div class="slot-row"><button class="slot-btn empty${sh.err ? ' bad' : ''}" id="slot-${team}-${i}" data-act="pickSlot" data-swap="ed" data-team="${team}" data-i="${i}" aria-label="Choose ${label}">+ Choose player</button></div>`
      const p = P(v),
        r = R(s, v),
        a = busyOf(s, v)
      return `<div class="slot-row"><button class="slot-btn${sh.err && dup.includes(v) ? ' bad' : ''}" id="slot-${team}-${i}" data-act="pickSlot" data-swap="ed" data-team="${team}" data-i="${i}" data-pid="${v}" title="${SWAP_TIP}" aria-label="${label}: ${esc(p.name)}. Change. Left or right arrow switches sides">${avatar(p)}<span class="main"><b>${esc(p.name)}</b><span class="small muted">${esc(lvLabel(r.level))} · ${gamesOf(s, v)}/${s.minimum}${!r.present ? ' · not present' : a ? (a.status === 'oncourt' ? ' · on court' : ' · playing now') : ''}</span></span><span class="small muted">Change</span></button>
        <button class="btn xs ghost icon-btn" data-act="clearSlot" data-team="${team}" data-i="${i}" aria-label="Clear ${label}">${I.x}</button></div>`
    }
    return sheetShell(
      sh.id ? 'Edit lineup' : 'Add match',
      `
      <div class="field"><span>Format</span><div class="row">${fmts.map((f) => `<button class="btn xs" aria-pressed="${sh.format === f}" data-act="editorFormat" data-v="${f}">${FORMAT_LABEL[f]}</button>`).join('')}</div>
      ${FUN.includes(sh.format) ? `<span class="hint">Counts toward session games and the minimum; excluded from long-term player performance.${sh.format === '5v5' ? ' 5v5 occupies two courts.' : ''}</span>` : ''}</div>
      <div class="slots"><div class="slot-col"><span class="label">Team A</span>${Array.from({ length: na }, (_, i) => slotSel('teamA', i)).join('')}</div><div class="slot-col"><span class="label">Team B</span>${Array.from({ length: nb }, (_, i) => slotSel('teamB', i)).join('')}</div></div>
      ${sh.err ? `<span class="err">${esc(sh.err)}</span>` : ''}
      <p class="small muted">Drag a player onto a slot on the other team to switch sides. A player who's playing now can go into a later match. That match can't start until they're free. Saving doesn't take a court.</p>`,
      `<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="saveEditor">${sh.id ? 'Save lineup' : 'Add to queue'}</button>`,
      true,
    )
  },
  suggest(sh) {
    const s = cur()
    if (sh.error || !sh.lineup)
      return sheetShell(
        'Suggested match',
        notice('warn', esc(sh.error || 'No valid match right now.')),
        '<button class="btn" data-act="closeSheet">Close</button>',
      )
    const m = sh.lineup
    const below = all(m).filter((p) => gamesOf(s, p) < s.minimum)
    return sheetShell(
      'Suggested match',
      `<div class="row">${chip(FORMAT_LABEL[m.format], 'solid')}${chip(MODES[s.mode].label + ' mode')}</div>
      <div class="qteams">${faceTeam(s, m.teamA, 'Team A', 'sg')}<span class="vs">VS</span>${faceTeam(s, m.teamB, 'Team B', 'sg')}</div>
      <p class="small muted">Drag a player onto someone on the other team to switch sides.</p>
      <div class="card stack tight"><span class="label">Why this lineup</span>
        ${below.length ? `<p class="small">${esc(listNames(below))} ${below.length > 1 ? 'are' : 'is'} below the minimum (${below.map((p) => `${esc(short(p))} ${gamesOf(s, p)}/${s.minimum}`).join(', ')}).</p>` : '<p class="small">Everyone here has met the minimum; they have the fewest games among present players.</p>'}
        <p class="small muted">Teams are split by assigned levels to suit ${MODES[s.mode].label} mode.</p></div>`,
      '<button class="btn" data-act="skipSuggest">Skip suggestion</button><button class="btn" data-act="editSuggest">Edit then add</button><button class="btn primary" data-act="addSuggest">Add to queue</button>',
    )
  },
  autoReview(sh) {
    const s = cur(),
      a = autoState(s),
      cards = Object.values(a.batches).flatMap((b) => b.cards),
      selected = sh.ids.map((id) => cards.find((m) => m.draftId === id)).filter(Boolean)
    return sheetShell(
      'Add selected to Main Queue?',
      `<p class="small muted">Matches are added in the order you picked them. We check them again before adding.</p>${sh.error ? notice('bad', esc(sh.error)) : ''}<ol>${selected.map((m) => `<li>${esc(listNames(m.teamA))} vs ${esc(listNames(m.teamB))}</li>`).join('')}</ol>`,
      '<button class="btn" data-act="closeSheet">Back</button><button class="btn primary" data-act="autoCommit">Add to Main Queue</button>',
    )
  },
  regen() {
    const s = cur()
    const w = waiting(s)
    const isAtt = (m) => (blockOf(s, m) || {}).kind === 'attention'
    const auto = w.filter((m) => !m.protected).length
    const keep = w.filter((m) => m.protected && !isAtt(m)).length
    const fix = w.filter((m) => m.protected && isAtt(m)).length
    return sheetShell(
      'Regenerate waiting queue?',
      `<div class="list">
      <div class="li"><span class="main">Automatic waiting matches</span><b class="tnum">${auto} rebuilt</b></div>
      <div class="li"><span class="main">Healthy manual matches</span><b class="tnum">${keep} kept</b></div>
      <div class="li"><span class="main">Manual matches needing attention</span><b class="tnum">${fix} rebuilt</b></div>
      <div class="li"><span class="main">Matches on court or in play</span><b class="tnum">${courtMatches(s).length} untouched</b></div></div>`,
      `<button class="btn" data-act="closeSheet">Keep current queue</button><button class="btn primary" data-act="confirmRegen" ${auto + fix ? '' : 'disabled'}>Regenerate waiting queue</button>`,
    )
  },
  adjust(sh) {
    // The end can move to any time after now, later or earlier, up to 24 h after play began.
    const s = cur(),
      now = Date.now(),
      st = endStatus(s, now),
      hi = sessionCourtStart(s) + 864e5,
      ok = (t) => t > now && t <= hi
    return sheetShell(
      'Courts and time',
      `
      <div class="field"><span>Courts</span><p class="small">${s.courts.map((c) => esc(c.label)).join(', ')}</p></div>
      <div class="row"><button class="btn sm" data-act="quickAddCourt">Add a court…</button></div>
      <div class="field"><span>Ends ${fmtWhen(s.end, { lower: true })}${st.over ? ` · <span style="color:var(--warn)">${st.text}</span>` : ''}</span>
        ${dtPicker({
          k: 'sheet.endAt',
          label: 'New end',
          id: 'adj-end',
          value: sh.endAt,
          days: daysBetween(now, hi),
          base: dayStart(sessionCourtStart(s)),
          ok,
          set: (t) => {
            sh.endAt = t
            sh.err = ''
          },
          err: sh.err,
          autofocus: sh.focus === 'end',
        })}
        <div class="row"><button class="btn sm primary" data-act="setEnd" ${sh.endAt > now ? '' : 'disabled'}>Set end time</button>${[30, 60].map((m) => `<button class="btn sm" data-act="extend" data-m="${m}">Extend ${m} min</button>`).join('')}</div><span class="hint">The public page shows the new end time after it syncs.</span></div>
      <p class="small muted">Start time is fixed: it records when play began.</p>
      <p class="small muted">Occupied courts can't be removed, and running matches aren't changed here. Changing mode, formats or the minimum during play hasn't been decided.</p>`,
      '<button class="btn" data-act="closeSheet">Done</button>',
    )
  },
  chooseMatch(sh) {
    const s = cur()
    const list = waiting(s)
    return sheetShell(
      `Put a match on ${esc(courtLabel(s, sh.court))}`,
      `<p class="small muted">Any ready match can go next. Queue order is a suggestion, not a rule. A match only stays locked while one of its players is still on court or isn't present. It goes on court getting ready; you start it from the court.</p>
      <div class="stack tight">${list
        .map((m, i) => {
          const b = blockOf(s, m)
          return `<div class="opt" style="cursor:default"><span class="qt-pos">#${i + 1}</span><div class="main"><b>${esc(listNames(m.teamA))} <span class="muted">vs</span> ${esc(listNames(m.teamB))}</b><div class="small ${b ? 'muted' : ''}" style="${b ? '' : 'color:var(--accent)'}">${FORMAT_LABEL[m.format]} · ${b ? esc(b.text) : 'Ready to go on court'}</div></div><button class="btn xs ${b ? '' : 'primary'}" data-act="${courtsNeeded(m) === 2 ? 'openDispatch' : 'placeOnCourt'}" data-id="${m.id}" data-court="${sh.court}" ${b ? 'disabled' : ''}>Put on court</button></div>`
        })
        .join('')}</div>`,
      '<button class="btn" data-act="closeSheet">Close</button>',
    )
  },
  invItem(sh) {
    return sheetShell(
      sh.id ? 'Edit item' : 'Add item',
      `
      <label class="field"><span>Name</span><input class="input${sh.err ? ' bad' : ''}" id="inv-name" data-bind="ui.sheet.name" value="${esc(sh.name || '')}" placeholder="e.g. Yonex Aerosensa 30" data-autofocus>${sh.err ? `<span class="err">${esc(sh.err)}</span>` : ''}</label>
      <div class="field"><span>Category</span><div class="seg">${['Shuttlecocks', 'Equipment', 'Other'].map((c) => `<button aria-pressed="${sh.category === c}" data-act="sheetSet" data-k="category" data-v="${c}">${c}</button>`).join('')}</div></div>
      <div class="fgrid">
        <label class="field"><span>Unit</span><input class="input" id="inv-unit" data-bind="ui.sheet.unit" value="${esc(sh.unit || '')}" placeholder="tube, piece, case"></label>
        <label class="field"><span>In stock</span><input class="input tnum" id="inv-stock" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.sheet.stock" data-num value="${esc(sh.stock ?? '')}"></label>
        <label class="field"><span>Cost per unit (₱)</span><input class="input tnum" id="inv-cost" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.sheet.cost" data-num value="${esc(sh.cost ?? '')}"></label>
      </div>`,
      `<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="saveInvItem">${sh.id ? 'Save item' : 'Add item'}</button>`,
    )
  },
  addCourt(sh) {
    const s = cur()
    const existing = sh.id && s.courts.find((c) => c.id === sh.id)
    const used = existing && s.matches.some((m) => (m.courts || []).includes(existing.id))
    const now = Date.now(),
      preview = addCourtWindow(s, sh, now)
    const startError = preview.field === 'start' ? preview.error : ''
    const endError = preview.field === 'end' ? preview.error : ''
    const from = addCourtStart(s, existing),
      start = used ? courtStart(s, existing) : (sh.startAt ?? from)
    return sheetShell(
      `${existing ? 'Edit' : 'Add'} ${esc((sh.label || '').trim() || `Court ${s.courts.length + 1}`)}?`,
      `
      <label class="field"><span>Court label</span><input class="input" id="ac-label" data-bind="ui.sheet.label" data-rerender value="${esc(sh.label || '')}" data-autofocus></label>
      ${dtPicker({
        k: 'sheet.startAt',
        label: 'Planned start',
        id: 'ac-start',
        value: start,
        days: daysBetween(from, s.end),
        base: from,
        ok: (t) => t >= from && t < s.end,
        set: (t) => {
          sh.startAt = t
        },
        disabled: used,
        err: startError,
        hint: used ? 'Start is fixed after use.' : 'The court is unavailable before this time.',
      })}<div class="field"><span>Open until</span>
        <div class="choices">
          <button class="choice" aria-pressed="${sh.mode === 'end'}" data-act="sheetSet" data-k="mode" data-v="end"><b>Until the session ends</b><span class="small muted">${fmtWhen(s.end)} · moves if the session end changes</span></button>
          <button class="choice" aria-pressed="${sh.mode === 'time'}" data-act="sheetSet" data-k="mode" data-v="time"><b>Until a set time</b><span class="small muted">For a court booked for less time</span></button>
        </div>
        ${
          sh.mode === 'time'
            ? dtPicker({
                k: 'sheet.untilAt',
                label: 'Open until',
                hideLabel: true,
                id: 'ac-time',
                value: sh.untilAt,
                days: daysBetween(start, s.end),
                base: from,
                ok: (t) => t > start && t <= s.end,
                set: (t) => {
                  sh.untilAt = t
                },
                err: endError,
              })
            : endError
              ? `<span class="err" id="ac-time-error" aria-live="polite">${esc(endError)}</span>`
              : ''
        }
      </div>
      ${addCourtPreview(s, sh, preview, now)}
      <p class="small muted">Courts show their closing time on the card. ROTRA doesn't stop a game at that time; it's a reminder for you.</p>`,
      `<button class="btn" data-act="closeSheet">Cancel</button><button class="btn primary" data-act="confirmAddCourt">${existing ? 'Save court' : `Add ${esc((sh.label || '').trim() || `Court ${s.courts.length + 1}`)}`}</button>`,
    )
  },
  done(sh) {
    const s = cur()
    const done = s.matches.filter((m) => m.status === 'done').length
    const act = active(s)
    const oc = onCourt(s).length
    const ocText = oc
      ? `${oc} match${oc > 1 ? 'es' : ''} on court ${oc > 1 ? "weren't" : "wasn't"} started and will be dropped.`
      : ''
    const wait = waiting(s).length
    const below = s.roster.filter((r) => gamesOf(s, r.pid) < s.minimum)
    if (sh.step === 'minimum') {
      return sheetShell(
        'Some players are below the minimum',
        `<div class="list">${below.map((r) => `<div class="li"><span class="main">${esc(nm(r.pid))}</span><span class="tnum">${gamesOf(s, r.pid)} of ${s.minimum}</span></div>`).join('')}</div>
        <p class="small muted">Late arrivals, early leavers and real-world choices happen. You can still finish.</p>`,
        '<button class="btn" data-act="closeSheet">Back to session</button><button class="btn primary" data-act="sheetSet" data-k="step" data-v="confirm">Continue to finish session</button>',
      )
    }
    if (sh.step === 'confirm') {
      return sheetShell(
        'Finish this session?',
        `<p><b>${esc(s.title)}</b> · ${fmtWhenRange(s.startedAt, s.end)}</p>
        ${S.pending ? notice('warn', `${S.pending} changes are still syncing.`) : notice('ok', 'All records on this device are synced.')}
        ${oc ? notice('', ocText) : ''}
        <p class="small">Valid results sync to Player Information automatically, and ranks update. Result slides become available to you privately. Nothing is published until you choose to.</p>`,
        `<button class="btn" data-act="closeSheet">Back</button><button class="btn primary" data-act="confirmDone" ${S.pending || !S.online ? 'disabled' : ''}>Confirm Session done</button>`,
      )
    }
    return sheetShell(
      'Session done',
      `<dl class="kv"><dt>Session</dt><dd>${esc(s.title)}</dd><dt>Games recorded</dt><dd>${done}</dd><dt>Participants</dt><dd>${s.roster.length}</dd><dt>Sync</dt><dd>${S.pending ? `${S.pending} changes waiting` : 'Complete'}</dd></dl>
      ${act.length ? notice('bad', `<b>${act.length} game${act.length > 1 ? 's are' : ' is'} still in play</b> (${act.map((m) => esc(courtsOf(s, m))).join(', ')}). ROTRA hasn't decided how unfinished games close, so in this prototype finish or invalidate them first.`) : ''}
      ${oc ? notice('', ocText) : ''}
      ${wait ? notice('', `${wait} waiting match${wait > 1 ? 'es were' : ' was'} never played and won't appear in results. What happens to unplayed matches is still undecided.`) : ''}
      ${below.length ? notice('warn', `${below.length} player${below.length > 1 ? 's are' : ' is'} below the minimum of ${s.minimum} games.`) : ''}`,
      `<button class="btn" data-act="closeSheet">Back to session</button><button class="btn primary" data-act="sheetSet" data-k="step" data-v="${below.length ? 'minimum' : 'confirm'}" ${act.length || !S.online ? 'disabled' : ''}>${below.length ? 'Review shortfalls' : 'Continue'}</button>`,
    )
  },
  publish(sh) {
    const s = cur()
    const a = awards(s)
    return sheetShell(
      'Publish results',
      `<p class="small">Audience: <b>anyone with the session link</b>.</p>
      <label class="check"><input type="checkbox" id="pub-0" data-act-change="pubSlide" data-k="0" ${sh.slides.includes(0) ? 'checked' : ''}><span><b>Standings</b><br><span class="small muted">${standings(s).length} players</span></span></label>
      <label class="check"><input type="checkbox" id="pub-1" data-act-change="pubSlide" data-k="1" ${sh.slides.includes(1) ? 'checked' : ''}><span><b>Awards</b><br><span class="small muted">MVP${a.improved ? ' and Most Improved' : ''}</span></span></label>
      <label class="check" style="border-color:var(--warn)"><input type="checkbox" id="pub-off" data-bind="ui.sheet.offDay" data-rerender ${sh.offDay ? 'checked' : ''}><span><b>Include Off Day</b><br><span class="small muted">${a.offDay.length ? `Shows ${esc(listNames(a.offDay.map((x) => x.pid)))} publicly.` : 'Empty for this session.'} Off by default.</span></span></label>
      <p class="small muted">Player ranks already updated; publishing doesn't change them.</p>
      ${!S.online ? notice('warn', 'Publishing needs internet.') : ''}`,
      `<button class="btn" data-act="closeSheet">Back to private review</button><button class="btn primary" data-act="confirmPublish" ${(sh.slides.length || sh.offDay) && S.online ? '' : 'disabled'}>Publish selected results</button>`,
    )
  },
  export(sh) {
    const s = cur()
    const st = standings(s)
    const per = sh.fmt === 'story' ? 14 : 10
    const a = awards(s)
    const frames = []
    if (sh.slides.includes(0))
      for (let i = 0; i < Math.max(1, Math.ceil(st.length / per)); i++)
        frames.push({
          t: `Standings${st.length > per ? ` ${i + 1}` : ''}`,
          rows: st.slice(i * per, i * per + per).map((r) => r.name),
        })
    if (sh.slides.includes(1))
      frames.push({
        t: 'Awards',
        rows: [
          a.mvp ? `MVP · ${a.mvp.p.name}` : 'MVP · none',
          a.improved ? `Most Improved · ${a.improved.p.name}` : '',
        ].filter(Boolean),
      })
    if (sh.offDay) frames.push({ t: 'Off Day', rows: a.offDay.map((x) => x.p.name) })
    return sheetShell(
      'Download images',
      `
      <div class="seg" role="group" aria-label="Image format">${[
        ['story', 'Story · tall'],
        ['feed', 'Feed post · 4:5'],
      ]
        .map(
          ([k, l]) =>
            `<button aria-pressed="${sh.fmt === k}" data-act="sheetSet" data-k="fmt" data-v="${k}">${l}</button>`,
        )
        .join('')}</div>
      <div class="row"><label class="check"><input type="checkbox" id="ex-0" data-act-change="pubSlide" data-k="0" ${sh.slides.includes(0) ? 'checked' : ''}>Standings</label><label class="check"><input type="checkbox" id="ex-1" data-act-change="pubSlide" data-k="1" ${sh.slides.includes(1) ? 'checked' : ''}>Awards</label><label class="check" style="border-color:var(--warn)"><input type="checkbox" id="ex-off" data-bind="ui.sheet.offDay" data-rerender ${sh.offDay ? 'checked' : ''}>Include Off Day</label></div>
      <p class="small muted">${frames.length} image${frames.length === 1 ? '' : 's'}. Long standings continue onto extra images so every name stays readable.</p>
      <div class="frames">${frames.map((f) => `<div class="frame ${sh.fmt}"><span class="fh">${esc(S.club.name)}</span><span class="muted">${esc(f.t)}</span>${f.rows.map((r) => `<span>${esc(r)}</span>`).join('')}<span class="ff">powered by rotra</span></div>`).join('')}</div>
      <p class="small muted">Downloading is turned off in this prototype.</p>`,
      `<button class="btn" data-act="closeSheet">Close</button><button class="btn primary" disabled>Download ${frames.length} image${frames.length === 1 ? '' : 's'}</button>`,
      true,
    )
  },
}
