import { removeInventoryItem } from '@rotra/db/queue/financials'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-INVENTORY › Remove (soft): the item leaves the list; past estimates keep their reference. */
export async function DELETE(_request: Request, ctx: RouteContext<'/api/inventory/[itemId]'>) {
  const { itemId } = await ctx.params
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => ({
    body: { item: await removeInventoryItem(club, itemId) },
  }))
}
