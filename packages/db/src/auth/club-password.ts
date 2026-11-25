import 'server-only'
import { clubLoginEmail } from '../admin/club-identity'
import { prisma } from '../client/prisma'
import { ServiceError } from '../service/errors'
import type { ClubContext } from './account-context'
import { type CookieAdapter, createSupabaseServer } from './supabase'

const PASSWORD_MIN = 8
const WRONG_CURRENT = "That isn't your current password."

/**
 * Q-CLUB › Change password. The current password is checked with a fresh sign-in on a client that
 * keeps its cookies in memory only, so a wrong password never touches this device's session; the
 * new password is set on that same fresh session. Passwords are never stored or logged here.
 */
export async function changeClubPassword(
  club: ClubContext,
  input: { current: string; next: string },
): Promise<{ changed: true }> {
  if (!input.current) throw new ServiceError('invalid', { current: 'Enter your current password.' })
  if (input.next.length < PASSWORD_MIN)
    throw new ServiceError('invalid', { next: 'Use at least 8 characters.' })
  if (input.next === input.current)
    throw new ServiceError('invalid', {
      next: 'Choose a password different from your current one.',
    })
  const account = await prisma.clubAccount.findUnique({
    where: { clubId: club.clubId },
    select: { username: true, authSubject: true, disabledAt: true },
  })
  if (!account || account.disabledAt || account.authSubject !== club.subject)
    throw new ServiceError('wrong_account')

  let memory: ReturnType<CookieAdapter['getAll']> = []
  const fresh = createSupabaseServer(
    {
      getAll: () => memory,
      setAll: (values) => {
        memory = values
      },
    },
    'club',
  )
  const signIn = await fresh.auth.signInWithPassword({
    email: clubLoginEmail(account.username),
    password: input.current,
  })
  if (signIn.error || !signIn.data.user) {
    if (signIn.error?.status && signIn.error.status >= 500) throw new ServiceError('unavailable')
    throw new ServiceError('invalid', { current: WRONG_CURRENT })
  }
  try {
    if (signIn.data.user.id !== club.subject) throw new ServiceError('wrong_account')
    const update = await fresh.auth.updateUser({ password: input.next })
    if (update.error) {
      if (update.error.status && update.error.status >= 500) throw new ServiceError('unavailable')
      throw new ServiceError('invalid', {
        next: 'That password was not accepted. Choose a different one.',
      })
    }
  } finally {
    await fresh.auth.signOut({ scope: 'local' })
  }
  return { changed: true }
}
