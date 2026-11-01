import { readInventory, saveInventoryItem } from '@rotra/db/queue/financials'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { int, readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** Q-INVENTORY › the club's items (not removed) and what the stock is worth, in centavos. */
export async function GET() {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const items = await readInventory(club)
    return {
      body: {
        items,
        stockValueMinor: items.reduce((sum, i) => sum + i.stock * i.unitCostMinor, 0),
      },
    }
  })
}

/**
 * Add or edit an item. `id` is the client's stable command ID, so a retried add returns the same
 * item; an edit sends `expectedRevision` and a stale one is a conflict.
 */
export async function POST(request: Request) {
  return handleAccountRequest('club', routeCookieAdapter(await cookies()), async (club) => {
    const body = await readJsonBody(request)
    const item = await saveInventoryItem(club, {
      id: text(body.id),
      expectedRevision:
        typeof body.expectedRevision === 'string' ? body.expectedRevision : undefined,
      name: text(body.name),
      category: text(body.category) as Parameters<typeof saveInventoryItem>[1]['category'],
      unit: text(body.unit),
      stock: int(body.stock),
      unitCostMinor: int(body.unitCostMinor),
    })
    return { body: { item } }
  })
}
