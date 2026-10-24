"use client";

import { CalendarClock } from "lucide-react";
import { useMemo } from "react";

import { SessionDiscoveryCard } from "@/components/modules/dashboard/session-discovery-card/SessionDiscoveryCard";
import { UserSessionCard } from "@/components/modules/sessions/UserSessionCard";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs/Tabs";
import { useAvailableSessions } from "@/hooks/useAvailableSessions";
import { useUserSessions } from "@/hooks/useUserSessions";
import { isUserSessionUpcoming } from "@/lib/sessions/user-session-utils";

export function SessionsClient() {
	const {
		data: availableData,
		isLoading: isAvailableLoading,
		isError: isAvailableError,
	} = useAvailableSessions();
	const {
		data: userData,
		isLoading: isUserLoading,
		isError: isUserError,
	} = useUserSessions();

	const availableSessions = availableData?.sessions ?? [];
	const myUpcomingSessions = useMemo(
		() =>
			(userData?.sessions ?? [])
				.filter((session) => isUserSessionUpcoming(session.status))
				.map((session) => ({ ...session, distanceKm: null })),
		[userData?.sessions],
	);

	return (
		<div className="max-w-[1000px] mx-auto p-4 md:p-8">
			<div className="flex flex-col gap-6">
				<div>
					<p className="text-micro font-bold uppercase tracking-widest text-accent mb-1">
						Find Sessions
					</p>
					<h1 className="text-display font-bold text-text-primary tracking-tight">
						Find Sessions
					</h1>
					<p className="text-body text-text-secondary mt-2">
						Browse open sessions or check what you&apos;ve already booked.
					</p>
				</div>

				<Tabs defaultValue="available" className="flex flex-col gap-6">
					<TabsList className="h-auto w-full justify-start rounded-none border-0 border-b border-border bg-transparent p-0">
						<TabsTrigger
							value="available"
							className="h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 uppercase text-text-disabled shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent data-[state=active]:shadow-none"
						>
							Available Sessions
						</TabsTrigger>
						<TabsTrigger
							value="my-sessions"
							className="h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 uppercase text-text-disabled shadow-none data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent data-[state=active]:shadow-none"
						>
							My Sessions
						</TabsTrigger>
					</TabsList>

					<TabsContent value="available" className="mt-0">
						{isAvailableLoading ? (
							<SessionGridSkeleton />
						) : isAvailableError ? (
							<ErrorState message="Could not load available sessions. Please try again." />
						) : availableSessions.length > 0 ? (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								{availableSessions.map((session) => (
									<SessionDiscoveryCard
										key={session.id}
										session={session}
										variant="list"
									/>
								))}
							</div>
						) : (
							<EmptyState
								title="No open sessions right now"
								description="Check back later or explore sessions on the map from Home."
							/>
						)}
					</TabsContent>

					<TabsContent value="my-sessions" className="mt-0">
						{isUserLoading ? (
							<SessionGridSkeleton />
						) : isUserError ? (
							<ErrorState message="Could not load your sessions. Please try again." />
						) : myUpcomingSessions.length > 0 ? (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								{myUpcomingSessions.map((session) => (
									<UserSessionCard key={session.id} session={session} />
								))}
							</div>
						) : (
							<EmptyState
								title="No upcoming bookings"
								description="Join a session from the Available Sessions tab to see it here and avoid double booking."
							/>
						)}
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

function SessionGridSkeleton() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="h-36 animate-pulse rounded-lg bg-bg-elevated" />
			))}
		</div>
	);
}

function ErrorState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-20 gap-4">
			<p className="text-body text-text-secondary">{message}</p>
		</div>
	);
}

function EmptyState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-20 gap-4">
			<CalendarClock size={40} strokeWidth={1} className="text-text-disabled" />
			<div className="text-center">
				<p className="text-heading font-semibold text-text-primary">{title}</p>
				<p className="text-body text-text-secondary mt-1">{description}</p>
			</div>
		</div>
	);
}
