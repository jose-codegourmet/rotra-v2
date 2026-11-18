import { all, R, waiting } from './helpers.js'
import { render } from './render.js'
import { S, save } from './state.js'
import { fmtWhen } from './time.js'

export function syncLabel() {
  if (S.syncing) return { cls: 'sync', text: 'Syncing…', short: 'Syncing…' }
  if (!S.online)
    return {
      cls: 'off',
      text: S.pending ? `Offline · ${S.pending} waiting to sync` : 'Working offline',
      short: S.pending ? `Offline · ${S.pending}` : 'Offline',
    }
  return { cls: '', text: `Synced ${fmtWhen(S.lastSync, { lower: true })}`, short: 'Synced' }
}
// Every saved change goes into a per-device sync log, grouped by the part of the session it touched, so the
// status pill can show what has synced and what is still waiting on this device.
export const AREA = {
  confirmReq: 'Roster',
  declineReq: 'Roster',
  togglePaid: 'Payments',
  markAllPaid: 'Payments',
  togglePresent: 'Roster',
  allPresent: 'Roster',
  allAbsent: 'Roster',
  giveSlot: 'Roster',
  fillSlots: 'Roster',
  removeWait: 'Roster',
  confirmAdd: 'Roster',
  confirmNew: 'Roster',
  setLevel: 'Roster',
  confirmStart: 'Session',
  confirmCancelSession: 'Session',
  confirmDeleteSession: 'Session',
  saveSetup: 'Session setup',
  confirmDone: 'Session done',
  confirmPublish: 'Published results',
  makeMatch: 'Queue',
  saveEditor: 'Queue',
  addSuggest: 'Queue',
  autoCommit: 'Queue',
  confirmRegen: 'Queue',
  move: 'Queue',
  moveTo: 'Queue',
  swapSides: 'Queue',
  removeWaiting: 'Queue',
  confirmDispatch: 'Matches and results',
  placeOnCourt: 'Matches and results',
  startOnCourt: 'Matches and results',
  sendBack: 'Queue',
  confirmSwap: 'Queue',
  confirmReplace: 'Matches and results',
  confirmMove: 'Matches and results',
  setCourtFill: 'Courts and time',
  confirmResult: 'Matches and results',
  confirmSub: 'Matches and results',
  confirmInvalid: 'Matches and results',
  confirmAddCourt: 'Courts and time',
  removeCourt: 'Courts and time',
  confirmOpenEarly: 'Courts and time',
  dispatchOpenEarly: 'Courts and time',
  undoEarly: 'Courts and time',
  addCourt: 'Courts and time',
  extend: 'Courts and time',
}
export let curAct = null
export function setCurAct(v) {
  curAct = v
}
export function logSync(text) {
  S.syncLog = [
    { at: Date.now(), text, area: AREA[curAct] || 'Other', synced: S.online ? Date.now() : null },
    ...(S.syncLog || []),
  ].slice(0, 80)
}
export function commit(msg) {
  logSync(msg)
  if (S.online) {
    S.lastSync = Date.now()
    toast(msg)
  } else {
    S.pending += 1
    toast(`${msg} · Saved on this device, waiting to sync`)
  }
  save()
}
export function toast(text) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = text
  document.getElementById('toasts').append(el)
  setTimeout(() => el.remove(), 3600)
}

// Presence is optimistic immediately; the prototype commits one summary after the last tap.
export const presencePending = new Map()
export let presenceTimer = null
export function setPresenceTimer(v) {
  presenceTimer = v
}
export let heldPresence = null
export function setHeldPresence(v) {
  heldPresence = v
}
export function flushPresence() {
  clearTimeout(presenceTimer)
  presenceTimer = null
  const changes = [...presencePending.values()]
  presencePending.clear()
  heldPresence = null
  if (!changes.length) return
  const session = S.sessions.find((s) => s.id === changes[0].sid)
  if (!session) return
  if (
    !['prepared', 'active'].includes(session.status) ||
    (!S.online && session.download !== 'ready') ||
    (S.licenseExpired && session.status !== 'active')
  ) {
    for (const item of changes) {
      const row = R(session, item.pid)
      if (row) {
        row.present = item.before
        row.presentAt = item.beforeAt
      }
    }
    toast(
      !S.online
        ? 'No downloaded copy on this device. Connect, or download first.'
        : 'This session is read-only.',
    )
    render()
    return
  }
  const on = changes.filter((x) => R(session, x.pid)?.present).length,
    off = changes.length - on
  const away = new Set(changes.filter((x) => !R(session, x.pid)?.present).map((x) => x.pid))
  const affected = waiting(session).filter((m) => all(m).some((pid) => away.has(pid))).length
  const msg =
    on && off
      ? `${on} player${on === 1 ? '' : 's'} marked present, ${off} away`
      : `${changes.length} player${changes.length === 1 ? '' : 's'} marked ${on ? 'present' : 'away'}`
  const previousAct = curAct
  curAct = 'togglePresent'
  commit(
    msg +
      (affected
        ? ` · ${affected} waiting match${affected === 1 ? ' needs' : 'es need'} attention`
        : ''),
  )
  curAct = previousAct
  render()
}
window.addEventListener('pagehide', flushPresence)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushPresence()
})

// Payments keep one end state per player and one summary per accepted batch (#300).
export const paymentPending = new Map()
export let paymentTimer = null
export function setPaymentTimer(v) {
  paymentTimer = v
}
export function flushPayments() {
  clearTimeout(paymentTimer)
  paymentTimer = null
  const changes = [...paymentPending.values()]
  paymentPending.clear()
  if (!changes.length) return
  const session = S.sessions.find((s) => s.id === changes[0].sid)
  if (!session) return
  const error = ['invalid', 'finalizing', 'cancelled'].includes(session.status)
    ? 'Payments are not available for this session.'
    : S.licenseExpired && session.status !== 'active'
      ? 'Your license has ended.'
      : !S.online && session.download !== 'ready'
        ? 'No downloaded copy on this device. Connect, or download first.'
        : null
  if (error) {
    for (const item of changes) {
      if (item.before) session.payments[item.pid] = item.before
      else delete session.payments[item.pid]
    }
    S.ui.paymentError = error
    toast(error)
    render()
    return
  }
  const previousAct = curAct
  curAct = 'togglePaid'
  commit(`${changes.length} payment mark${changes.length === 1 ? '' : 's'} saved`)
  curAct = previousAct
  render()
}
window.addEventListener('pagehide', flushPayments)
window.addEventListener('beforeunload', flushPayments)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushPayments()
})
