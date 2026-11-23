import { addTrustedHost, listTrustedHosts } from '@rotra/db/queue/club-hosts'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Club settings › Trusted hosts (D-2026-11-22-01): the club's current trusted hosts. */
export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { trustedHosts: await listTrustedHosts(club) },
  }))
}

/** Club settings › Trusted hosts › Add: one of the club's saved players. Only the list changes. */
export async function POST(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      status: 201,
      body: await addTrustedHost(club, { clubPlayerId: text(body.clubPlayerId) }),
    }
  })
}
