export const inventoryKeys = {
  all: ['inventory'] as const,
  list: (clubId: string) => ['inventory', clubId] as const,
}
