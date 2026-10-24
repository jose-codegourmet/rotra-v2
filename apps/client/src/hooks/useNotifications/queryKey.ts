/** Centralized React Query keys for the signed-in player's notification inbox. */

export const notificationsRootKey = ["notifications"] as const;

export type NotificationsQueryFilters = {
	page: number;
	limit: number;
};

export function notificationsQueryKey(filters: NotificationsQueryFilters) {
	return [
		...notificationsRootKey,
		"list",
		filters.page,
		filters.limit,
	] as const;
}
