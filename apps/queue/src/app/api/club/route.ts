import { updateClubLogo } from '@rotra/db/admin/club-logo'
import { readClubSettings, updateClubSettings } from '@rotra/db/admin/clubs'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { club: await readClubSettings(club) },
  }))
}

/**
 * Logo write, or the Facebook post fields (template, description, court rules). Scope comes from the
 * verified club account, never the request body. `template: null` restores the default template.
 */
export async function PATCH(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    if (body.logoUrl === undefined) {
      const text = (value: unknown, field: string) => {
        if (value === undefined || typeof value === 'string') return value
        throw new ServiceError('invalid', { [field]: 'Enter text.' })
      }
      if (typeof body.expectedRevision !== 'string')
        throw new ServiceError('invalid', { revision: 'Reload and try again.' })
      if (
        body.template !== undefined &&
        body.template !== null &&
        typeof body.template !== 'string'
      )
        throw new ServiceError('invalid', { template: 'Enter text.' })
      return {
        body: {
          club: await updateClubSettings(club, {
            expectedRevision: body.expectedRevision,
            postTemplate: body.template as string | null | undefined,
            description: text(body.description, 'description'),
            courtRules: text(body.courtRules, 'courtRules'),
          }),
        },
      }
    }
    return {
      body: {
        club: await updateClubLogo(club, {
          logoUrl: body.logoUrl,
          expectedRevision: body.expectedRevision,
        }),
      },
    }
  })
}
