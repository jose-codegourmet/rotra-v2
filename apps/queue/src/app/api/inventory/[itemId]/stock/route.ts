import { stepInventoryStock } from '@rotra/db/queue/financials'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-INVENTORY › − / +: stock moves by one and never below zero. */
export async function POST(request: Request, ctx: RouteContext<'/api/inventory/[itemId]/stock'>) {
  const { itemId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    return {
      body: {
        item: await stepInventoryStock(club, { id: itemId, delta: int(body.delta) as -1 | 1 }),
      },
    }
  })
}
