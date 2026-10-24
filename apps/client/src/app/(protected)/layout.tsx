import { db, listNotificationsForInbox } from "@rotra/db";
import {
	dehydrate,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { TesterAccountBanner } from "@/components/modules/tester/TesterAccountBanner";
import { notificationsQueryKey } from "@/hooks/useNotifications/queryKey";
import { serializeNotificationsListResult } from "@/hooks/useNotifications/server";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { getCurrentProfile } from "@/lib/server/current-profile";

const SHELL_NOTIFICATION_FILTERS = { page: 1, limit: 5 } as const;

export default async function ProtectedLayout({
	children,
}: {
	children: ReactNode;
}) {
	const profile = await getCurrentProfile();

	const isAdmin = !!profile?.adminRole && profile.adminIsActive;
	const isTester = profile?.isTesterAccount === true;
	if (!isAdmin && !isTester && !profile?.onboardingCompleted) {
		redirect("/onboarding");
	}

	const layout = (
		<DashboardLayout
			pageTitle="Dashboard"
			adminRole={isAdmin && profile ? profile.adminRole : null}
			isTesterAccount={isTester}
			currentProfile={
				profile ? { name: profile.name, avatarUrl: profile.avatarUrl } : null
			}
		>
			{isTester ? <TesterAccountBanner /> : null}
			{children}
		</DashboardLayout>
	);

	if (!profile) {
		return layout;
	}

	const inboxResult = await listNotificationsForInbox(db, {
		recipientId: profile.id,
		...SHELL_NOTIFICATION_FILTERS,
	});

	const queryClient = new QueryClient();
	queryClient.setQueryData(
		notificationsQueryKey(SHELL_NOTIFICATION_FILTERS),
		serializeNotificationsListResult(inboxResult),
	);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{layout}
		</HydrationBoundary>
	);
}
