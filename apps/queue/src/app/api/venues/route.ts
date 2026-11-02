import { readVenues, saveVenue } from '@rotra/db/admin/clubs'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { intOrNull, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { venues: await readVenues(club) },
  }))
}

/** Create a saved venue; `id` is the client's stable command ID, so a retry returns the same venue. */
export async function POST(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const venue = await saveVenue(club, {
      id: text(body.id),
      expectedRevision: typeof body.expectedRevision === 'string' ? body.expectedRevision : undefined,
      name: text(body.name),
      address: text(body.address),
      courtFeePerCourtHourMinor: intOrNull(body.courtFeeMinor),
      entranceFeeMinor: intOrNull(body.entranceFeeMinor),
    })
    return { status: 201, body: { venue } }
  })
}
