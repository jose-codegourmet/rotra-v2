import { applyVenue, closeSheet, go, openSheet } from '../actions.js'
import { cur, initials, lvLabel, openSlots, waitOf } from '../helpers.js'
import { I, monthStart, timeToYmd, ymdToTime } from '../icons.js'
import { render } from '../render.js'
import { postTemplate } from '../screens/club-settings.js'
import { peso } from '../screens/financials.js'
import { scrollSavedPlayerStats } from '../screens/saved-players.js'
import {
  replayBounds,
  replayTimer,
  replayTo,
  setReplayTimer,
  stopReplay,
} from '../screens/session-record.js'
import { bandMid, draftFrom } from '../screens/setup.js'
import { LICENSE_PAYMENTS } from '../screens/venues.js'
import { S, save } from '../state.js'
import { commit, toast } from '../sync.js'

export const ACT_CLUB = {
  openRequests: () => openSheet({ type: 'requests' }),
  openDeleteSession: () => {
    if (cur()?.status === 'prepared') openSheet({ type: 'deleteSession' })
  },
  deleteOpenRoster: () => {
    S.ui.sheet = null
    S.ui.prepTab = 'roster'
    render()
    const b = document.getElementById('ptb-roster')
    if (b) b.focus()
  },
  confirmDeleteSession: () => {
    const s = cur()
    if (!s || s.status !== 'prepared' || !S.online) {
      closeSheet()
      return
    }
    // Re-check at save: someone confirmed meanwhile turns the sheet into its blocked form.
    if (s.roster.length) {
      render()
      return
    }
    S.sessions = S.sessions.filter((x) => x.id !== s.id)
    S.ui.sheet = null
    S.currentId = null
    commit(`Session deleted · ${s.title}`)
    go('home')
  },
  openCancelSession: () => {
    if (cur()?.status === 'prepared') openSheet({ type: 'cancelSession', reason: '' })
  },
  confirmCancelSession: () => {
    const s = cur(),
      reason = ((S.ui.sheet || {}).reason || '').trim()
    if (!s || s.status !== 'prepared') {
      closeSheet()
      return
    }
    s.status = 'cancelled'
    s.cancelledAt = Date.now()
    s.cancelReason = reason || null
    // Join requests close with the session; the record keeps them as closed.
    ;(s.requests || []).forEach((r) => {
      if (r.status === 'pending') r.status = 'closed'
    })
    S.ui.sheet = null
    commit(`${s.title} cancelled`)
    go('history', s.id)
  },
  peekSession: (d) => openSheet({ type: 'peek', id: d.id }),
  confirmReq: (d) => {
    const s = cur(),
      r = (s.requests || []).find((x) => x.id === d.id)
    const lv = r.level ?? (r.band !== 'unsure' ? bandMid(r.band) : null)
    if (lv == null) {
      r.err = 'Choose a level for this club before confirming.'
      render()
      const f = document.getElementById(`req-lv-${r.id}`)
      if (f) f.focus()
      return
    }
    const pid = `p${Date.now()}`
    S.players.push({
      id: pid,
      name: r.name,
      nick: r.nick,
      identity: r.phone ? 'pending' : 'guest',
      rtr: null,
      sugg: null,
      prior: 0,
      base: null,
      added: Date.now(),
    })
    r.status = 'confirmed'
    r.pid = pid
    r.err = ''
    if (s.status !== 'active' && !openSlots(s)) {
      s.waitlist = [...(s.waitlist || []), { pid, level: +lv, at: r.at }]
      commit(
        `${r.name} confirmed from a join request · waitlist #${waitOf(s).findIndex((w) => w.pid === pid) + 1}`,
      )
    } else {
      s.roster.push({
        pid,
        level: +lv,
        present: s.status === 'active',
        locked: s.status === 'active',
        presentAt: Date.now(),
      })
      commit(`${r.name} confirmed from a join request · ${lvLabel(+lv)}`)
    }
    render()
  },
  declineReq: (d) => {
    const s = cur(),
      r = (s.requests || []).find((x) => x.id === d.id)
    r.status = 'declined'
    commit(`${r.name}'s join request declined`)
    render()
  },
  openPostPreview: () => openSheet({ type: 'postPreview' }),
  copyPost: () => {
    const t = document.getElementById('post-text')
    const fallback = () => {
      if (t) {
        t.focus()
        t.select()
      }
      toast('Text selected. Copy it with your keyboard or long-press')
    }
    try {
      navigator.clipboard.writeText(t.value).then(() => toast('Facebook post copied'), fallback)
    } catch (e) {
      fallback()
    }
  },
  insertKey: (d) => {
    const el = document.getElementById('tpl')
    const cur_ = S.ui.postTpl ?? postTemplate()
    const at = el ? el.selectionStart : cur_.length,
      to = el ? el.selectionEnd : cur_.length
    const ins = `{{ ${d.k} }}`
    S.ui.postTpl = cur_.slice(0, at) + ins + cur_.slice(to)
    render()
    const t = document.getElementById('tpl')
    if (t) {
      t.focus()
      t.setSelectionRange(at + ins.length, at + ins.length)
    }
  },
  savePost: () => {
    if (S.ui.postTpl != null) S.club.postTemplate = S.ui.postTpl
    if (S.ui.postDesc != null) S.club.description = S.ui.postDesc.trim()
    if (S.ui.postRules != null) S.club.courtRules = S.ui.postRules.trim()
    S.ui.postTpl = S.ui.postDesc = S.ui.postRules = null
    save()
    render()
    toast('Post template saved')
  },
  resetPost: () => {
    S.club.postTemplate = null
    S.ui.postTpl = null
    save()
    render()
    toast('Template reset to the default')
  },
  newSessionAt: (d) => {
    const v = S.venues.find((x) => x.id === d.id)
    S.ui.draft = draftFrom(null)
    S.ui.errors = {}
    Object.assign(
      S.ui.draft,
      { venueId: v.id, venue: v.name, address: v.address || '' },
      v.courtFee != null ? { courtFee: v.courtFee } : {},
      v.entranceFee != null ? { entryFee: v.entranceFee } : {},
    )
    go('setup')
  },
  venuePick: (d) => {
    applyVenue(S.venues.find((v) => v.id === d.id))
  },
  venueNew: (d) => {
    const sh = S.ui.sheet
    openSheet({
      type: 'venue',
      mode: 'form',
      editId: null,
      name: (sh && sh.q) || '',
      address: '',
      fee: '',
      entry: '',
      manage: !!(d && d.manage),
    })
  },
  venueEdit: (d) => {
    const v = S.venues.find((x) => x.id === d.id)
    openSheet({
      type: 'venue',
      mode: 'form',
      editId: v.id,
      name: v.name,
      address: v.address || '',
      fee: v.courtFee ?? '',
      entry: v.entranceFee ?? '',
      manage: !!(d && d.manage),
    })
  },
  venueBack: () => openSheet({ type: 'venue', mode: 'pick', q: '' }),
  venueSave: () => {
    const sh = S.ui.sheet
    const name = (sh.name || '').trim()
    sh.err = !name
      ? 'Give the venue a name.'
      : S.venues.some((v) => v.id !== sh.editId && v.name.toLowerCase() === name.toLowerCase())
        ? 'You already have a venue with this name.'
        : ''
    const feeTxt = String(sh.fee ?? '').trim()
    sh.feeErr =
      feeTxt !== '' && !(Number.isFinite(+feeTxt) && +feeTxt >= 0)
        ? 'Use 0 or more, or leave it empty.'
        : ''
    const entryTxt = String(sh.entry ?? '').trim()
    sh.entryErr =
      entryTxt !== '' && !(Number.isFinite(+entryTxt) && +entryTxt >= 0)
        ? 'Use 0 or more, or leave it empty.'
        : ''
    if (sh.err || sh.feeErr || sh.entryErr) {
      render()
      return
    }
    const rec = {
      name,
      address: (sh.address || '').trim(),
      courtFee: feeTxt === '' ? null : Math.round(+feeTxt),
      entranceFee: entryTxt === '' ? null : Math.round(+entryTxt),
    }
    let v
    if (sh.editId) {
      v = Object.assign(
        S.venues.find((x) => x.id === sh.editId),
        rec,
      )
    } else {
      v = { id: `v${Date.now()}`, ...rec }
      S.venues.push(v)
    }
    save()
    if (!sh.manage && S.screen === 'setup' && S.ui.draft) {
      applyVenue(v, sh.editId ? 'Venue updated' : `${v.name} added to your venues`)
      return
    }
    S.ui.sheet = null
    render()
    toast(sh.editId ? 'Venue updated' : `${v.name} added to your venues`)
  },
  repeatCount: (x) => {
    const d = S.ui.draft
    d.repeatCount = Math.max(2, Math.min(12, (+d.repeatCount || 4) + +x.d))
    delete S.ui.errors.when
    render()
  },
  useClubEntrance: () => {
    const d = S.ui.draft
    const v = (S.venues || []).find((x) => x.id === d.venueId)
    d.entryFee = v && v.entranceFee != null ? v.entranceFee : S.club.entranceFee
    render()
  },
  toggleClubFee: () => {
    const on = !(S.ui.feeOn ?? S.club.entranceFee != null)
    S.ui.feeOn = on
    S.ui.clubFeeErr = ''
    if (!on) {
      S.club.entranceFee = null
      S.ui.clubFee = null
      S.ui.feeOn = null
      save()
      toast('Default entrance fee turned off')
    }
    render()
  },
  saveClubFee: () => {
    const v = String(S.ui.clubFee ?? S.club.entranceFee ?? '').trim()
    if (v === '' || !(Number.isFinite(+v) && +v >= 0)) {
      S.ui.clubFeeErr = 'Enter an amount, 0 or more.'
      render()
      return
    }
    S.club.entranceFee = Math.round(+v)
    S.ui.clubFee = null
    S.ui.feeOn = null
    S.ui.clubFeeErr = ''
    save()
    render()
    toast(`Default entrance fee set to ${peso(S.club.entranceFee)} a person`)
  },
  useVenueFee: () => {
    const d = S.ui.draft
    const v = S.venues.find((x) => x.id === d.venueId)
    if (v && v.courtFee != null) {
      d.courtFee = v.courtFee
      render()
    }
  },
  spStatsScroll: (d) => scrollSavedPlayerStats(Number(d.d)),
  spClear: () => {
    S.ui.spf = {}
    S.ui.search = ''
    render()
  },
  spJump: (d) => {
    const id = d.k === '#' ? 'num' : d.k
    const sec = document.getElementById(`sp-${id}`)
    if (sec) {
      sec.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
      const h = document.getElementById(`sp-h-${id}`)
      if (h) h.focus({ preventScroll: true })
    }
  },
  openProfile: (d) => openSheet({ type: 'profile', id: d.id, back: d.back ? S.ui.sheet : null }),
  profileBack: () => {
    const id = S.ui.sheet.id
    S.ui.sheet = S.ui.sheet.back
    render()
    const b = document.querySelector(`.sheet [data-act="openProfile"][data-id="${id}"]`)
    if (b) b.focus()
  },
  openInvite: (d) => openSheet({ type: 'invite', id: d.id }),
  copyInvite: (d) => {
    const done = () => toast('Invite link copied')
    try {
      navigator.clipboard.writeText(d.v).then(done, () => {
        const i = document.getElementById('invite-link')
        if (i) {
          i.select()
        }
        toast('Select the link and copy it')
      })
    } catch (e) {
      const i = document.getElementById('invite-link')
      if (i) i.select()
      toast('Select the link and copy it')
    }
  },
  cancelNameRequest: () => {
    S.club.nameRequest = null
    save()
    render()
    toast('Name change request cancelled')
  },
  approveNameRequest: () => {
    const v = S.club.nameRequest.name
    S.club.name = v
    S.club.initials = initials(v) || 'C'
    S.club.nameRequest = null
    S.ui.sheet = null
    save()
    render()
    toast(`Approved: your club is now ${v}`)
  },
  saveClubName: () => {
    const v = (S.ui.clubName ?? S.club.name).trim()
    if (!v) {
      S.ui.clubNameErr = 'Enter the club name.'
      render()
      return
    }
    // Club names change only after the platform owner approves the request in Admin.
    S.club.nameRequest = { name: v, at: Date.now() }
    S.ui.clubName = null
    S.ui.clubNameErr = ''
    save()
    render()
    toast('Name change requested. Waiting for approval')
  },
  removeLogo: () => {
    S.club.logo = null
    save()
    render()
    toast('Logo removed')
  },
  // Inside claude.ai the file goes through the viewer's save prompt; opened as a plain local file it downloads directly.
  exportPayments: async () => {
    const rows = [
      ['Paid', 'Plan', 'Covers from', 'Covers to', 'Amount (PHP)', 'Reference'],
      ...LICENSE_PAYMENTS.map((x) => [x.paid, x.plan, x.from, x.to, x.amount, x.ref]),
    ]
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const filename = `${S.club.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-license-payments.csv`
    const downloads =
      window.claude && window.claude.use ? await window.claude.use('downloads') : null
    if (downloads) {
      try {
        await downloads.save({ filename, data: csv })
        toast('License payments exported')
      } catch (e) {
        if (!e || e.code !== 'declined')
          toast(
            e && e.code === 'rate_limited'
              ? 'A save is already waiting for your answer'
              : "Exporting isn't available in this view",
          )
      }
      return
    }
    try {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      a.download = filename
      document.body.append(a)
      a.click()
      a.remove()
      toast('License payments exported')
    } catch (e) {
      toast('This browser blocked the download')
    }
  },
  postTab: (d) => {
    S.ui.postTab = d.k
    render()
    const b = document.getElementById(`ptab-${d.k}`)
    if (b) b.focus()
  },
  histTab: (d) => {
    stopReplay()
    S.ui.histTab = d.k
    render()
    const b = document.getElementById(`htab-${d.k}`)
    if (b) b.focus()
  },
  replayPlay: () => {
    if (replayTimer) {
      stopReplay()
      return
    }
    const s = cur()
    const { from, to } = replayBounds(s)
    if ((S.ui.replayT || from) >= to || S.ui.replayFor !== s.id) replayTo(from)
    const b = document.getElementById('rp-play')
    b.innerHTML = I.pause
    b.setAttribute('aria-label', 'Pause replay')
    // One session minute every 120 ms: a three-hour night plays in about 20 seconds.
    setReplayTimer(
      setInterval(() => {
        const t = Math.min(to, (S.ui.replayT || from) + 6e4)
        replayTo(t)
        if (t >= to) stopReplay()
      }, 120),
    )
  },
  openDatePicker: () => {
    const sel = ymdToTime(S.ui.draft.date)
    openSheet({ type: 'datePicker', sel, view: monthStart(sel) })
  },
  dpMove: (d) => {
    const sh = S.ui.sheet
    const v = new Date(sh.view)
    sh.view = new Date(v.getFullYear(), v.getMonth() + +d.d, 1).getTime()
    render()
  },
  dpPick: (d) => {
    const sh = S.ui.sheet
    sh.sel = +d.k
    render()
    const b = document.getElementById(`dp-${sh.sel}`)
    if (b) b.focus()
  },
  dpToday: () => {
    const sh = S.ui.sheet
    sh.sel = new Date().setHours(0, 0, 0, 0)
    sh.view = monthStart(sh.sel)
    render()
    const b = document.getElementById(`dp-${sh.sel}`)
    if (b) b.focus()
  },
  dpApply: () => {
    S.ui.draft.date = timeToYmd(S.ui.sheet.sel)
    S.ui.sheet = null
    render()
  },
  toggleDraft: (d) => {
    S.ui.draft[d.k] = !S.ui.draft[d.k]
    render()
  },
  draftPayMode: (d) => {
    S.ui.draft.custom = d.v === 'custom'
    render()
    if (d.v === 'custom') {
      const i = document.getElementById('f-pay')
      if (i) i.focus()
    }
  },
  setDraft: (d) => {
    S.ui.draft[d.k] = d.v
    render()
  },
  draftShuttleAdd: () => {
    const d = S.ui.draft
    const first = (S.inventory.find((i) => i.category === 'Shuttlecocks') || {}).id
    if (first) {
      d.shuttles = [...(d.shuttles || []), { itemId: first, tubes: 1 }]
      render()
    }
  },
  draftShuttleRemove: (x) => {
    const d = S.ui.draft
    d.shuttles = d.shuttles.filter((_, i) => i !== +x.i)
    render()
  },
  openInventory: (d) => {
    S.ui.invReturn = d.from === 'setup' ? 'setup' : null
    go('inventory')
  },
  invBack: () => {
    const to = S.ui.invReturn === 'setup' && S.ui.draft ? 'setup' : 'home'
    S.ui.invReturn = null
    go(to)
  },
  invStock: (d) => {
    const it = S.inventory.find((i) => i.id === d.id)
    it.stock = Math.max(0, it.stock + +d.d)
    save()
    render()
  },
  invRemove: (d) => {
    const it = S.inventory.find((i) => i.id === d.id)
    S.inventory = S.inventory.filter((i) => i.id !== d.id)
    save()
    render()
    toast(`${it.name} removed from inventory`)
  },
  openInvItem: (d) => {
    const it = d && d.id ? S.inventory.find((i) => i.id === d.id) : null
    openSheet(
      it
        ? { type: 'invItem', ...it }
        : {
            type: 'invItem',
            id: null,
            name: '',
            category: 'Shuttlecocks',
            unit: 'tube',
            stock: '',
            cost: '',
          },
    )
  },
  saveInvItem: () => {
    const sh = S.ui.sheet
    if (!(sh.name || '').trim()) {
      sh.err = 'Give the item a name.'
      render()
      return
    }
    const rec = {
      name: sh.name.trim(),
      category: sh.category,
      unit: (sh.unit || '').trim() || 'piece',
      stock: Math.max(0, +sh.stock || 0),
      cost: Math.max(0, +sh.cost || 0),
    }
    if (sh.id)
      Object.assign(
        S.inventory.find((i) => i.id === sh.id),
        rec,
      )
    else S.inventory.push({ id: `inv${Date.now()}`, ...rec })
    S.ui.sheet = null
    save()
    render()
    toast(sh.id ? 'Item saved' : `${rec.name} added to inventory`)
  },
}
