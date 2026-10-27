/** Every club query uses this factory so domain invalidation is consistent. */
export const clubKeys = {
  all: ['club'] as const,
  detail: (id: string) => [...clubKeys.all, 'detail', id] as const,
}
