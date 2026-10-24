"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	type NotificationsQueryFilters,
	notificationsQueryKey,
	notificationsRootKey,
} from "./queryKey";
import { fetchNotifications, postMarkAllNotificationsRead } from "./server";

export { notificationsQueryKey };

const DEFAULT_REFETCH_INTERVAL_MS = 30_000;

export function useNotificationsQuery(
	filters: NotificationsQueryFilters,
	options?: { enabled?: boolean; refetchInterval?: number | false },
) {
	return useQuery({
		queryKey: notificationsQueryKey(filters),
		queryFn: () => fetchNotifications(filters),
		enabled: options?.enabled ?? true,
		refetchInterval:
			options?.refetchInterval === false
				? false
				: (options?.refetchInterval ?? DEFAULT_REFETCH_INTERVAL_MS),
	});
}

export function useMarkAllNotificationsRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: postMarkAllNotificationsRead,
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: [...notificationsRootKey],
			});
		},
	});
}
