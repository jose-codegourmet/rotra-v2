export const contactChangeRequestKeys = {
  all: ['contact-change-request'] as const,
  mine: (playerId: string) => ['contact-change-request', 'mine', playerId] as const,
}
