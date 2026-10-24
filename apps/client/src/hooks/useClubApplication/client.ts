"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClubApplicationCreateFormValues } from "@/components/modules/clubs/club-application-form/schema";
import {
	cancelClubApplication as cancelClubApplicationRequest,
	createClubApplication as createClubApplicationRequest,
	fetchMyPendingClubApplication,
	updateClubApplication as updateClubApplicationRequest,
} from "@/hooks/useClubApplication/server";
import type { ClubApplicationCreateBody } from "@/types/club-application";

export function myClubApplicationQueryKey() {
	return ["clubApplication", "me"] as const;
}

export function useMyClubApplication() {
	return useQuery({
		queryKey: myClubApplicationQueryKey(),
		queryFn: fetchMyPendingClubApplication,
	});
}

export function useCreateClubApplicationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: ClubApplicationCreateBody) =>
			createClubApplicationRequest(body),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: myClubApplicationQueryKey(),
			});
		},
	});
}

/** Create when `applicationId` is absent; update pending when present. */
export function useSaveClubApplicationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (args: {
			applicationId: string | null;
			body: ClubApplicationCreateBody | ClubApplicationCreateFormValues;
		}) =>
			args.applicationId
				? updateClubApplicationRequest(
						args.applicationId,
						args.body as ClubApplicationCreateBody,
					)
				: createClubApplicationRequest(args.body as ClubApplicationCreateBody),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: myClubApplicationQueryKey(),
			});
		},
	});
}

export function useCancelClubApplicationMutation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => cancelClubApplicationRequest(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: myClubApplicationQueryKey(),
			});
		},
	});
}
