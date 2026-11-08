import type { AdminPlayer } from '@rotra/data/admin-player/types'
import type { AdminPlayerEditValues } from '@rotra/schema/admin-player'
export const adminEditPlayerDefaultValues = (player: AdminPlayer): AdminPlayerEditValues => ({
  name: player.name,
  nickname: player.nickname ?? '',
  // Only an unclaimed player's HTTPS photo link is editable; a character or uploaded photo stays.
  picture: !player.claimed && player.picture?.startsWith('https://') ? player.picture : '',
  email: player.email ?? '',
  reason: '',
})
