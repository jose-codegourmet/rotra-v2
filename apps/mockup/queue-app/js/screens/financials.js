import { esc } from '../helpers.js'
import { I } from '../icons.js'
import { S } from '../state.js'
import { courtDuration } from '../time.js'
import { viewAccess } from './login.js'

// ---------- Financials and inventory (prototype; costs are estimates, ROTRA doesn't collect payments) ----------
export function seedInventory() {
  return [
    {
      id: 'inv1',
      name: 'Yonex Aerosensa 30',
      category: 'Shuttlecocks',
      unit: 'tube',
      stock: 12,
      cost: 1450,
    },
    {
      id: 'inv2',
      name: 'RSL Classic',
      category: 'Shuttlecocks',
      unit: 'tube',
      stock: 6,
      cost: 1150,
    },
    {
      id: 'inv3',
      name: 'Victor Master No. 3',
      category: 'Shuttlecocks',
      unit: 'tube',
      stock: 2,
      cost: 1250,
    },
    {
      id: 'inv4',
      name: 'Overgrip tape',
      category: 'Equipment',
      unit: 'piece',
      stock: 24,
      cost: 80,
    },
    { id: 'inv5', name: 'Loaner racket', category: 'Equipment', unit: 'piece', stock: 4, cost: 0 },
    { id: 'inv6', name: 'Bottled water', category: 'Other', unit: 'case', stock: 3, cost: 240 },
  ]
}
export const peso = (v) => `₱${Math.round(v || 0).toLocaleString()}`
export function financeCalc(f, courtsN, durMins, players) {
  const hours = durMins / 60
  const court = (+f.courtFee || 0) * courtsN * hours
  const lines = (f.shuttles || [])
    .map((x) => {
      const it = S.inventory.find((i) => i.id === x.itemId)
      return it ? { it, tubes: +x.tubes || 0, cost: (+x.tubes || 0) * it.cost } : null
    })
    .filter(Boolean)
  const shuttle = lines.reduce((t, l) => t + l.cost, 0)
  const n = Math.max(1, players || 1)
  // The entrance fee is a misc per-head cost some venues charge, listed for transparency; it is part of the cost, not the payment.
  const entryFee = f.entryFee === '' || f.entryFee == null ? 0 : +f.entryFee || 0,
    entry = entryFee * n
  const total = court + shuttle + entry
  const share = Math.ceil(total / n)
  // Players pay the full amount per head: the break-even share by default, or a custom amount the club sets.
  const custom = !!f.custom,
    perHead = custom ? +f.payFee || 0 : share,
    collect = perHead * n
  return {
    hours,
    court,
    shuttle,
    entryFee,
    entry,
    total,
    share,
    custom,
    perHead,
    collect,
    diff: collect - total,
    lines,
    n,
  }
}
export function resultText(c) {
  if (!c.total) return 'No costs entered'
  if (!c.custom && c.diff > 0)
    return `Breaks even <span class="small muted">· ${peso(c.diff)} extra from rounding up</span>`
  if (c.diff > 0) return `<span style="color:var(--accent)">${peso(c.diff)} profit</span>`
  if (c.diff < 0) return `<span style="color:var(--warn)">${peso(-c.diff)} loss</span>`
  return 'Breaks even'
}
export function financeDraft(s) {
  const f = s && s.finance
  const first = (S.inventory.find((i) => i.category === 'Shuttlecocks') || {}).id || null
  if (f)
    return {
      courtFee: f.courtFee ?? '',
      entryFee: f.entryFee ?? '',
      custom: !!f.custom,
      payFee: f.payFee ?? '',
      shuttles: (f.shuttles || []).map((x) => ({ ...x })),
    }
  const tubes = s
    ? Math.max(1, Math.round((s.courts.length * ((s.end - s.start) / 3600e3)) / 1.5))
    : 3
  // A club default entrance fee per head fills in new sessions; it stays editable per session. Payment starts at break-even.
  const fee = S.club.entranceFee
  return {
    courtFee: '',
    entryFee: fee != null ? fee : '',
    custom: false,
    payFee: '',
    shuttles: first ? [{ itemId: first, tubes }] : [],
  }
}
// Entrance fee source: the chosen venue's per-head fee when it has one, otherwise the club default.
const poss = (n) => (/s$/i.test(n) ? `${n}'` : `${n}'s`)
function entranceHint(d) {
  const v = (S.venues || []).find((x) => x.id === d.venueId)
  const [amt, label] =
    v && v.entranceFee != null
      ? [v.entranceFee, `${esc(poss(v.name))} entrance fee`]
      : S.club.entranceFee != null
        ? [S.club.entranceFee, "Your club's default entrance fee"]
        : [null]
  if (amt == null) return ''
  return +d.entryFee === amt && d.entryFee !== ''
    ? `<span class="hint">${label}. Changing it here only affects this session.</span>`
    : `<span class="hint">${label} is ${peso(amt)}. <button class="btn xs ghost" data-act="useClubEntrance">Use it</button></span>`
}
function venueFeeHint(d) {
  const v = (S.venues || []).find((x) => x.id === d.venueId)
  if (!v || v.courtFee == null) return ''
  return +d.courtFee === v.courtFee && d.courtFee !== ''
    ? `<span class="hint">Filled in from ${esc(poss(v.name))} saved rate. Changing it here only affects this session.</span>`
    : `<span class="hint">${esc(poss(v.name))} saved rate is ${peso(v.courtFee)}. <button class="btn xs ghost" data-act="useVenueFee">Use it</button></span>`
}
export function financePanel(d, durMins, nPlayers, e) {
  const c = financeCalc(d, d.courts.length, durMins, nPlayers)
  const shuttleItems = S.inventory.filter((i) => i.category === 'Shuttlecocks')
  return `<p class="small muted">All optional. These are estimates to help you set a fair fee. ROTRA doesn't collect money. You can tick who has paid on the session's Payments list.</p>
    <div class="fgrid">
      <label class="field"><span>Court fee per hour, per court</span><div class="money"><span>₱</span><input class="input${e.courtFee ? ' bad' : ''}" id="f-courtfee" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.draft.courtFee" data-num data-rerender value="${esc(d.courtFee)}" placeholder="0"></div>${e.courtFee ? `<span class="err">${e.courtFee}</span>` : `<span class="hint">${d.courts.length} court${d.courts.length > 1 ? 's' : ''} × ${courtDuration(durMins)} = ${peso(c.court)}</span>${venueFeeHint(d)}`}</label>
      <label class="field"><span>Entrance fee per head (optional)</span><div class="money"><span>₱</span><input class="input${e.entryFee ? ' bad' : ''}" id="f-entry" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.draft.entryFee" data-num data-rerender value="${esc(d.entryFee)}" placeholder="0"></div>${e.entryFee ? `<span class="err">${e.entryFee}</span>` : `<span class="hint">A misc fee some venues charge each player. It's listed in the costs for transparency and covered by the payment per player.</span>${entranceHint(d)}`}</label>
    </div>
    <div class="field"><span>Shuttlecocks</span>
      ${
        shuttleItems.length
          ? `<div class="stack tight">${d.shuttles
              .map((x, i) => {
                const it = S.inventory.find((v) => v.id === x.itemId)
                const over = it && +x.tubes > it.stock
                return `<div class="shuttle-row">
          <select class="input" id="f-sh-${i}" data-act-change="draftShuttleItem" data-i="${i}" aria-label="Shuttlecock brand">${shuttleItems.map((v) => `<option value="${v.id}" ${v.id === x.itemId ? 'selected' : ''}>${esc(v.name)} · ${peso(v.cost)}/${esc(v.unit)} · ${v.stock} left</option>`).join('')}</select>
          <input class="input tnum" id="f-sh-n-${i}" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.draft.shuttles.${i}.tubes" data-num data-rerender value="${esc(x.tubes)}" aria-label="Tubes of ${esc(it ? it.name : 'shuttlecocks')}">
          <span class="small tnum" style="white-space:nowrap">${it ? peso((+x.tubes || 0) * it.cost) : '—'}</span>
          <button class="btn xs ghost icon-btn" data-act="draftShuttleRemove" data-i="${i}" aria-label="Remove this shuttlecock line">${I.x}</button>
        </div>${over ? `<span class="small" style="color:var(--warn)">Only ${it.stock} ${esc(it.unit)}s in stock.</span>` : ''}`
              })
              .join('')}</div>
      <div class="row"><button class="btn xs" data-act="draftShuttleAdd">+ Add another brand</button><button class="btn xs ghost" data-act="openInventory" data-from="setup">Manage inventory</button></div>
      <span class="hint">Tubes you plan to use. Rule of thumb: about 1 tube per court every 1.5 hours. Prices come from your inventory.</span>`
          : '<p class="small muted">No shuttlecocks in your inventory yet. <button class="btn xs" data-act="openInventory" data-from="setup">Add some</button></p>'
      }
    </div>
    <div class="field"><span>Payment per player</span>
      <div class="seg" role="group" aria-label="Payment per player"><button aria-pressed="${!d.custom}" data-act="draftPayMode" data-v="auto">Break-even · ${peso(c.share)}</button><button aria-pressed="${!!d.custom}" data-act="draftPayMode" data-v="custom">Custom amount</button></div>
      ${
        d.custom
          ? `<div class="money" style="max-width:240px"><span>₱</span><input class="input${e.payFee ? ' bad' : ''}" id="f-pay" type="number" min="0" step="1" inputmode="numeric" data-bind="ui.draft.payFee" data-num data-rerender value="${esc(d.payFee)}" placeholder="${c.share}" aria-label="Custom payment per player"></div>${e.payFee ? `<span class="err">${e.payFee}</span>` : `<span class="hint">The full amount each player pays${c.entryFee ? `, including the ${peso(c.entryFee)} entrance fee` : ''}. Break-even is ${peso(c.share)}. At ${peso(c.perHead)} a player: ${resultText(c)}.</span>`}`
          : `<span class="hint">The full amount each player pays, worked out for you: total cost${c.entryFee ? ' (entrance fees included)' : ''} ÷ ${c.n} players, rounded up. It updates as you change the costs or players.</span>`
      }
    </div>
    <div class="card stack" style="background:var(--bg)"><span class="label">Estimate for ${c.n} players</span>
      <dl class="kv"><dt>Courts</dt><dd>${peso(c.court)}</dd><dt>Shuttlecocks</dt><dd>${peso(c.shuttle)}</dd>${c.entry ? `<dt>Entrance fees</dt><dd>${peso(c.entry)} <span class="small muted">· ${peso(c.entryFee)} × ${c.n} · misc</span></dd>` : ''}<dt><b>Total cost</b></dt><dd><b>${peso(c.total)}</b></dd><dt>Break-even</dt><dd>${peso(c.share)} a player</dd>
      <dt>Players pay</dt><dd>${peso(c.perHead)} each · ${c.custom ? 'custom amount' : 'break-even'}</dd><dt>You'd collect</dt><dd>${peso(c.collect)}</dd><dt><b>Result</b></dt><dd><b>${resultText(c)}</b></dd></dl></div>`
}
export function viewInventory() {
  if (S.licenseExpired) return viewAccess()
  const cats = ['Shuttlecocks', 'Equipment', 'Other']
  const fromSetup = S.ui.invReturn === 'setup' && S.ui.draft
  const value = S.inventory.reduce((t, i) => t + i.stock * i.cost, 0)
  return `<main class="wrap narrow">
    <div class="crumb"><button class="btn sm ghost" data-act="invBack">${I.back} ${fromSetup ? 'Back to session setup' : 'Home'}</button></div>
    <div class="between"><div><h1>Inventory</h1><p class="small muted">${S.inventory.length} items · stock worth ${peso(value)}</p></div><button class="btn sm primary" data-act="openInvItem">Add item</button></div>
    ${cats
      .map((c) => {
        const items = S.inventory.filter((i) => i.category === c)
        return `<section class="stack"><h2>${c}</h2>${
          items.length
            ? `<div class="inv-grid">${items
                .map(
                  (i) => `<article class="inv-card ${i.stock <= 2 ? 'low' : ''}">
        <div class="between" style="flex-wrap:nowrap"><b>${esc(i.name)}</b><button class="btn xs ghost icon-btn" data-act="invRemove" data-id="${i.id}" aria-label="Remove ${esc(i.name)}">${I.x}</button></div>
        <span class="small muted">${i.cost ? `${peso(i.cost)} per ${esc(i.unit)}` : 'No cost'}</span>
        <div class="row" style="justify-content:space-between;flex-wrap:nowrap"><div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn xs icon-btn" data-act="invStock" data-id="${i.id}" data-d="-1" aria-label="One less ${esc(i.unit)} of ${esc(i.name)}" ${i.stock <= 0 ? 'disabled' : ''}>−</button><b class="tnum" style="min-width:34px;text-align:center;font-size:20px">${i.stock}</b><button class="btn xs icon-btn" data-act="invStock" data-id="${i.id}" data-d="1" aria-label="One more ${esc(i.unit)} of ${esc(i.name)}">+</button></div><span class="small muted">${esc(i.unit)}s in stock</span></div>
        ${i.stock <= 2 ? `<span class="small" style="color:var(--warn)">Running low</span>` : ''}
        <button class="btn xs" data-act="openInvItem" data-id="${i.id}">Edit</button>
      </article>`,
                )
                .join('')}</div>`
            : `<div class="card empty">No ${c.toLowerCase()} yet.</div>`
        }</section>`
      })
      .join('')}
    <p class="small muted">Shuttlecock prices here fill in the session cost estimate. Stock isn't deducted automatically yet; adjust it with − and + after a session.</p>
  </main>`
}
