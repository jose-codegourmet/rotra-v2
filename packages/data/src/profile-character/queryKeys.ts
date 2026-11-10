export const profileCharacterKeys = {
  all: ['profile-character'] as const,
  /** Player pickers: shown images only */
  shown: ['profile-character', 'shown'] as const,
  /** Admin: the whole library, hidden images included */
  list: ['profile-character', 'list'] as const,
}
