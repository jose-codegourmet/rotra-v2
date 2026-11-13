import { describe, expect, it } from 'vitest'

describe('the catalog', () => {
  it('starts empty, without the placeholder', async () => {
    const { featureFlags } = await import('../fixtures/featureFlags')
    expect(featureFlags).toEqual([])
  })
})
