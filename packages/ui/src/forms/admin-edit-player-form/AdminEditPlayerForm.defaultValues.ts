import type { AdminPlayer } from '@rotra/data/admin-player/types'
import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
export const adminEditPlayerDefaultValues = (player: AdminPlayer): AdminPlayerEditValues => ({
  name: player.name,
  nickname: player.nickname ?? '',
  picture: player.picture ?? '',
  email: player.email ?? '',
  reason: '',
})
