import { ACT, CHANGE, closeSheet } from './actions.js'
import { slotOf, swapObj, swapSides } from './events-drag.js'
import { addDays, monthStart } from './icons.js'
import { render } from './render.js'
import { replayTo, stopReplay } from './screens/session-record.js'
import { WIZ_STEPS } from './screens/setup.js'
import { FORMATS, S, save } from './state.js'
import {
  AREA,
  curAct,
  flushPayments,
  flushPresence,
  setCurAct,
  setHeldPresence,
  toast,
} from './sync.js'

// ---------- Events ----------
function setPath(path, value) {
  const keys = path.split('.')
  let o = S
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]]
  o[keys[keys.length - 1]] = value
}
// Logo upload: centre-crop to a 256 px square so the saved image stays small.
function loadLogo(file) {
  if (!file) return
  if (!/^image\//.test(file.type)) {
    toast('Choose an image file')
    return
  }
  if (file.size > 5e6) {
    toast('Choose an image under 5 MB')
    return
  }
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const side = Math.min(img.width, img.height)
    c.getContext('2d').drawImage(
      img,
      (img.width - side) / 2,
      (img.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    )
    S.club.logo = c.toDataURL('image/png')
    URL.revokeObjectURL(img.src)
    save()
    render()
    toast('Logo updated')
  }
  img.onerror = () => toast('That image could not be read')
  img.src = URL.createObjectURL(file)
}
export let lastTrigger = null
document.addEventListener('click', (e) => {
  // Any click outside an open court menu closes it.
  if (S.ui.courtMenu && !e.target.closest('.cmenu')) {
    S.ui.courtMenu = null
    if (!e.target.closest('[data-act]')) {
      render()
      return
    }
  }
  const el = e.target.closest('[data-act]')
  if (!el || el.disabled || el.tagName === 'INPUT' || el.tagName === 'SELECT') return
  const fn = ACT[el.dataset.act]
  if (!fn) return
  e.preventDefault()
  if (
    el.dataset.act !== 'togglePresent' &&
    (AREA[el.dataset.act] === 'Roster' ||
      ['pane', 'prepTab', 'go', 'openAdd', 'makeMatch', 'openEditor', 'openSessionDone'].includes(
        el.dataset.act,
      ))
  )
    flushPresence()
  if (
    [
      'markAllPaid',
      'pane',
      'prepTab',
      'histTab',
      'go',
      'goClub',
      'openSessionDone',
      'closeSheet',
    ].includes(el.dataset.act)
  )
    flushPayments()
  if (el.dataset.act === 'plSet') setHeldPresence(null)
  setCurAct(el.dataset.act)
  if (!el.closest('.sheet') && !el.classList.contains('scrim'))
    lastTrigger = { act: el.dataset.act, id: el.dataset.id || el.dataset.pid || '' }
  fn(el.dataset, el, e)
})
document.addEventListener('keydown', (e) => {
  const el = e.target
  // Keyboard reordering for the queue's drag handle.
  if (
    el.matches &&
    el.matches('.qt-grip[data-id]') &&
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
  ) {
    e.preventDefault()
    setCurAct('move')
    ACT.move({ id: el.dataset.id, d: e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1 })
    return
  }
  // Keyboard alternative to dragging a player across: swap with the player opposite.
  if (
    el.dataset &&
    el.dataset.swap &&
    el.dataset.pid &&
    (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
  ) {
    e.preventDefault()
    const scope = el.dataset.swap,
      a = slotOf(el),
      team = a.team === 'teamA' ? 'teamB' : 'teamA'
    const n =
      scope === 'ed'
        ? FORMATS[S.ui.sheet.format][team === 'teamA' ? 0 : 1]
        : swapObj(scope)[team].length
    const b = { team, i: Math.min(a.i, n - 1) }
    swapSides(scope, a, b)
    const f = document.querySelector(
      `[data-swap="${scope}"][data-team="${b.team}"][data-i="${b.i}"]`,
    )
    if (f) f.focus()
    return
  }
  // Session setup: Enter in a field acts as Next on pages 1–2 and saves only on page 3.
  if (
    e.key === 'Enter' &&
    !e.isComposing &&
    S.ui.draft &&
    !S.ui.sheet &&
    el.tagName === 'INPUT' &&
    !['button', 'checkbox', 'radio', 'submit'].includes(el.type) &&
    document.getElementById('wiz-title')
  ) {
    e.preventDefault()
    setCurAct(S.ui.draft.step < WIZ_STEPS.length - 1 ? 'wizNext' : 'saveSetup')
    ACT[curAct]()
    return
  }
  if (
    (e.key === 'Enter' || e.key === ' ') &&
    el.getAttribute &&
    el.getAttribute('role') === 'button' &&
    el.dataset.act
  ) {
    e.preventDefault()
    el.click()
  }
  if (
    el.dataset &&
    el.dataset.act === 'dpPick' &&
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
  ) {
    e.preventDefault()
    const sh = S.ui.sheet
    const t = addDays(
      +el.dataset.k,
      { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key],
    )
    if (t < new Date().setHours(0, 0, 0, 0)) return
    sh.sel = t
    sh.view = monthStart(t)
    render()
    const b = document.getElementById(`dp-${t}`)
    if (b) b.focus()
    return
  }
  if (e.key === 'Escape' && S.ui.courtMenu) {
    e.preventDefault()
    const id = S.ui.courtMenu
    S.ui.courtMenu = null
    render()
    const b = document.querySelector(`[data-act="toggleCourtMenu"][data-id="${id}"]`)
    if (b) b.focus()
  } else if (e.key === 'Escape' && S.ui.sheet) {
    e.preventDefault()
    closeSheet()
  } else if (e.key === 'Escape' && S.ui.setOpen) {
    e.preventDefault()
    ACT.closeSettingsMenu()
  } else if (e.key === 'Escape' && S.ui.navOpen) {
    e.preventDefault()
    S.ui.navOpen = false
    render()
    const b = document.querySelector('.burger')
    if (b) b.focus()
  }
  if (e.key === 'Tab' && S.ui.sheet) {
    const f = [
      ...document.querySelectorAll(
        '.sheet button:not(:disabled), .sheet input, .sheet select, .sheet textarea',
      ),
    ]
    if (!f.length) return
    if (e.shiftKey && document.activeElement === f[0]) {
      e.preventDefault()
      f[f.length - 1].focus()
    } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
      e.preventDefault()
      f[0].focus()
    }
  }
})
function onBind(e) {
  const el = e.target
  if (el.id === 'rp-range') {
    stopReplay()
    replayTo(+el.value)
    return
  }
  if (el.id === 'logo-file') {
    if (e.type === 'change') loadLogo(el.files && el.files[0])
    return
  }
  if (el.dataset.actChange) {
    if (e.type === 'change') {
      setCurAct(el.dataset.actChange)
      CHANGE[el.dataset.actChange](el)
    }
    return
  }
  if (!el.dataset.bind) return
  let v = el.type === 'checkbox' ? el.checked : el.value
  if (el.hasAttribute('data-num') && el.type !== 'checkbox')
    v = v === '' ? (el.tagName === 'SELECT' ? null : '') : +v
  setPath(el.dataset.bind, v)
  // Session setup: typing Expected players pins it; leaving it empty follows the slots again.
  if (el.dataset.bind === 'ui.draft.expected') {
    if (e.type === 'input') S.ui.draft.expectedAuto = false
    else if (v === '') {
      S.ui.draft.expectedAuto = true
      render()
      return
    }
  }
  if (el.hasAttribute('data-rerender')) {
    const textish =
      el.tagName === 'TEXTAREA' ||
      (el.tagName === 'INPUT' && !['checkbox', 'time', 'date'].includes(el.type))
    if ((e.type === 'input' && textish) || (e.type === 'change' && !textish)) render()
  }
}
document.addEventListener('input', onBind)
document.addEventListener('change', onBind)
document.addEventListener('submit', (e) => {
  if (e.target.dataset.form !== 'login') return
  e.preventDefault()
  const L = S.ui.login
  if (!L.user.trim() || !L.pass) {
    L.err = 'Enter your club username and password.'
    render()
    return
  }
  if (!S.online) {
    L.err = "Signing in needs an internet connection. Try again when you're connected."
    render()
    return
  }
  L.err = ''
  L.pending = true
  render()
  setTimeout(() => {
    L.pending = false
    S.club.password = L.pass
    S.screen = 'home'
    save()
    render()
  }, 700)
})
document.addEventListener('submit', (e) => {
  if (e.target.dataset.form !== 'password') return
  e.preventDefault()
  const pw = S.ui.pw,
    err = {}
  if (!S.online) {
    toast('Changing your password needs an internet connection')
    return
  }
  // Prototype stand-in: the password typed at sign-in is the current one.
  if (pw.cur !== (S.club.password ?? pw.cur)) err.cur = "That isn't your current password."
  if (pw.next.length < 8) err.next = 'Use at least 8 characters.'
  else if (pw.next === pw.cur) err.next = 'Choose a password different from your current one.'
  if (!err.next && pw.confirm !== pw.next) err.confirm = "Passwords don't match."
  pw.err = err
  if (Object.keys(err).length) {
    render()
    const f = document.getElementById(`pw-${Object.keys(err)[0]}`)
    if (f) f.focus()
    return
  }
  S.club.password = pw.next
  S.ui.pw = { cur: '', next: '', confirm: '', show: false, err: {} }
  save()
  render()
  toast('Password changed. Use the new one next time you sign in.')
})

// Drag to reorder queued matches (pointer events, so mouse and touch both work).
