export const clubPageKeys = {
  all: ['club-page'] as const,
  page: (clubId: string) => ['club-page', clubId] as const,
}
