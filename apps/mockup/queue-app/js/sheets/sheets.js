import { I } from '../icons.js'
import { SHEETS_ACCOUNT } from './account.js'
import { SHEETS_CALENDAR } from './calendar.js'
import { SHEETS_COURT } from './court.js'
import { SHEETS_ROSTER } from './roster.js'
import { SHEETS_SESSION } from './session.js'

// ---------- Sheets ----------
export function sheetShell(title, body, footer, wide) {
  return `<div class="scrim" data-act="closeSheet"></div><div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
    <header><h2 id="sheet-title" tabindex="-1">${title}</h2><button class="btn xs ghost icon-btn" data-act="closeSheet" aria-label="Close">${I.x}</button></header>
    <div class="sb">${body}</div>${footer ? `<footer>${footer}</footer>` : ''}</div>`
}
export const SHEETS = {
  ...SHEETS_ACCOUNT,
  ...SHEETS_CALENDAR,
  ...SHEETS_ROSTER,
  ...SHEETS_COURT,
  ...SHEETS_SESSION,
}
