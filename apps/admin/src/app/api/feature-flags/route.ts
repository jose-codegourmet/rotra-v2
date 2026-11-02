import { createFeatureFlag, readFeatureFlags } from '@rotra/db/admin/configuration'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-FEATURE-FLAGS: every flag, oldest added first. */
export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { flags: await readFeatureFlags(admin) },
  }))
}

/**
 * A-ADD-FLAG › Add flag. `commandId` makes a retried add return the same flag; a taken name or key
 * is a conflict with fields keyed like the form.
 */
export async function POST(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const body = await readJsonBody(request)
    const flag = await createFeatureFlag(admin, {
      commandId: text(body.commandId),
      key: text(body.key),
      name: text(body.name),
      description: text(body.description),
      value: body.on === true,
    })
    return { status: 201, body: { flag } }
  })
}
