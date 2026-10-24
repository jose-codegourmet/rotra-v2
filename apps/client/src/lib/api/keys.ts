export const QUERY_KEYS = {
	placesSearch: (q: string) => ["places", "search", q] as const,
} as const;
