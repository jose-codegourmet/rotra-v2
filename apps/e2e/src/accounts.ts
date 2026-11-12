import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { ACCOUNTS_FILE, STATE_DIR } from './stack.ts'

/** What the seed created; written to the gitignored `.e2e/accounts.json`. */
export type SeededAccounts = {
  admin: { email: string; password: string; adminId: string }
  club: { clubId: string; name: string; username: string; password: string; inviteCode: string }
  players: {
    n: number
    email: string
    password: string
    phone: string
    fullName: string
    playerId: string
  }[]
}

export const hasAccounts = () => existsSync(ACCOUNTS_FILE)

export function writeAccounts(accounts: SeededAccounts) {
  mkdirSync(STATE_DIR, { recursive: true })
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), { mode: 0o600 })
}

export function readAccounts(): SeededAccounts {
  if (!hasAccounts()) throw new Error(`[e2e] ${ACCOUNTS_FILE} is missing; the seed has not run.`)
  return JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf8')) as SeededAccounts
}
