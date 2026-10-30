export const featureFlagKeys = {
  all: ['feature-flags'] as const,
  /** A-FEATURE-FLAGS: the whole catalog, in list order */
  list: () => ['feature-flags', 'list'] as const,
}
