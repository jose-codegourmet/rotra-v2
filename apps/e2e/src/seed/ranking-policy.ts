import { randomUUID } from 'node:crypto'
import type { AppClient } from '../api/client.ts'

/**
 * Session done needs an effective ranking policy version. The migrations insert version 1; this
 * makes sure one exists (Admin `POST /api/ranking-settings` with the migration's values) when a
 * database was built without it. Configuration only: no rank is calculated.
 */
export async function ensureRankingPolicy(admin: AppClient) {
  const { versions } = await admin.get<{ versions: { version: number }[] }>('/api/ranking-settings')
  if (versions.length) return
  await admin.post('/api/ranking-settings', {
    commandId: randomUUID(),
    expectedVersion: null,
    assessmentWeightBp: 7000,
    performanceWeightBp: 3000,
    recentStandardMatchThreshold: 10,
    changeNote: 'E2E seed',
  })
}
