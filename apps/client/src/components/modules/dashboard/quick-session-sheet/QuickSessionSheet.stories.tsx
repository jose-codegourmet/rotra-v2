"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { MyClubsResponse } from "@/hooks/useMyClubs";
import { myClubsQueryKey } from "@/hooks/useMyClubs";
import { QuickSessionSheet } from "./QuickSessionSheet";

const mockClubs: MyClubsResponse = {
	clubs: [
		{ id: "11111111-1111-1111-1111-111111111111", name: "Cebu Smash Club" },
		{ id: "22222222-2222-2222-2222-222222222222", name: "Mandaue Rackets" },
	],
};

function makeQueryClient(clubs: MyClubsResponse) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	client.setQueryData(myClubsQueryKey, clubs);
	return client;
}

function SheetStory({
	clubs = mockClubs,
	defaultOpen = true,
}: {
	clubs?: MyClubsResponse;
	defaultOpen?: boolean;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<QueryClientProvider client={makeQueryClient(clubs)}>
			<QuickSessionSheet open={open} onOpenChange={setOpen} />
		</QueryClientProvider>
	);
}

const meta: Meta<typeof QuickSessionSheet> = {
	title: "dashboard/QuickSessionSheet",
	component: QuickSessionSheet,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof QuickSessionSheet>;

export const Open: Story = {
	render: () => <SheetStory />,
};

// A user with no clubs can still open a clubless casual session
// (the club select only offers "No club — casual").
export const NoClubs: Story = {
	render: () => <SheetStory clubs={{ clubs: [] }} />,
};

export const Closed: Story = {
	render: () => <SheetStory defaultOpen={false} />,
};

function AutoSubmitSheetStory() {
	useEffect(() => {
		const timer = window.setTimeout(() => {
			document
				.querySelector<HTMLFormElement>(
					'[data-slot="dialog-content"] form, form',
				)
				?.requestSubmit();
		}, 400);
		return () => window.clearTimeout(timer);
	}, []);

	return <SheetStory />;
}

export const ValidationErrors: Story = {
	render: () => <AutoSubmitSheetStory />,
};

const validInitialValues = {
	title: "Friday Night Doubles",
	clubId: mockClubs.clubs[0]?.id ?? "",
	venue: {
		name: "Mandaue Sports Complex",
		address: "Mandaue City, Cebu",
		latitude: 10.3234,
		longitude: 123.9295,
		isNewSubmission: false,
	},
	date: "2026-06-09",
	startTime: "18:00",
	durationHours: 2,
	numCourts: 1,
	playersPerCourt: "4" as const,
	matchFormat: "best_of_1" as const,
	scoreLimit: 21,
	visibility: "club_members" as const,
};

function PendingSubmitSheetStory() {
	const [open, setOpen] = useState(true);

	useEffect(() => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input.url;
			if (url.includes("/api/sessions/quick") && init?.method === "POST") {
				return new Promise<Response>(() => {});
			}
			return originalFetch(input, init);
		}) as typeof fetch;

		const timer = window.setTimeout(() => {
			document
				.querySelector<HTMLFormElement>(
					'[data-slot="dialog-content"] form, form',
				)
				?.requestSubmit();
		}, 400);

		return () => {
			window.clearTimeout(timer);
			globalThis.fetch = originalFetch;
		};
	}, []);

	return (
		<QueryClientProvider client={makeQueryClient(mockClubs)}>
			<QuickSessionSheet
				open={open}
				onOpenChange={setOpen}
				initialValues={validInitialValues}
			/>
		</QueryClientProvider>
	);
}

export const Submitting: Story = {
	render: () => <PendingSubmitSheetStory />,
};
