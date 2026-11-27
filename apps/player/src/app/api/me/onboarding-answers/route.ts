import type { OnboardingAnswers } from '@rotra/data/player/onboarding-answers'
import { readMyAccount, saveMyGettingToKnowAnswers } from '@rotra/db/player/profile'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

/** The body's `answers`, shaped only; the service checks the ids, lengths and repeats. */
function answersOf(value: unknown): OnboardingAnswers {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const nullableText = (key: string) => {
    const entry = input[key]
    if (entry === null || typeof entry === 'string') return entry
    throw new ServiceError('invalid', { answers: 'Check your answers and try again.' })
  }
  if (!isStringList(input.shots) || !isStringList(input.shotsOther))
    throw new ServiceError('invalid', { answers: 'Check your answers and try again.' })
  const other = input.favoritePlayerOther
  return {
    playStyle: nullableText('playStyle') as OnboardingAnswers['playStyle'],
    shots: input.shots as OnboardingAnswers['shots'],
    shotsOther: input.shotsOther,
    favoritePlayer: nullableText('favoritePlayer') as OnboardingAnswers['favoritePlayer'],
    favoritePlayerOther: typeof other === 'string' ? other : '',
  }
}

/**
 * P-EDIT-PROFILE › Playing style and P-ONBOARD steps 2 to 4: `{ answers, expectedRevision }` under
 * the account revision the screen loaded (D-2026-11-19-11). The player's own answers only.
 */
export async function POST(request: Request) {
  return handleAccountRequest('player', routeCookieAdapter(await cookies()), async (player) => {
    const body = await readJsonBody(request)
    const profile = await saveMyGettingToKnowAnswers(player, {
      answers: answersOf(body.answers),
      expectedRevision: text(body.expectedRevision),
    })
    return { body: { profile, revision: (await readMyAccount(player)).revision } }
  })
}
