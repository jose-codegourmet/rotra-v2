import { accountVerificationKeys } from '../account-verification/queryKeys'

export const playerNotificationKeys = {
  owner: (playerId: string) => [...accountVerificationKeys.owner(playerId), 'notifications'] as const,
}
