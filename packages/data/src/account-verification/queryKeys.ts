import { adminPlayerKeys } from '../admin-player/queryKeys'
import { playerAccountKeys } from '../player-account/queryKeys'

export const accountVerificationKeys = {
  mine: () => [...playerAccountKeys.all, 'verification'] as const,
  owner: (playerId: string) => [...accountVerificationKeys.mine(), playerId] as const,
  admin: (playerId: string) => [...adminPlayerKeys.detail(playerId), 'verification'] as const,
}
