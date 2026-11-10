import { adminPlayerEditValuesOf } from '@rotra/data/admin-player/rules'
import type { AdminPlayerEdit } from '@rotra/data/admin-player/types'
import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'

/**
 * A-PLAYER-EDIT starting values: the loaded record, an empty password (empty keeps it) and an empty
 * reason. The same derivation the data layer compares a save against.
 */
export const adminEditPlayerDefaultValues = (player: AdminPlayerEdit): AdminPlayerEditValues =>
  adminPlayerEditValuesOf(player)
