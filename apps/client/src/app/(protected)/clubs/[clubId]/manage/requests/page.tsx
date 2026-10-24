import type { Metadata } from "next";

import { ProvisionBox } from "@/components/modules/club-profile/ProvisionBox";

export const metadata: Metadata = {
	title: "Join requests — ROTRA",
	description: "Pending club join requests.",
};

export default async function ManageRequestsPage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return (
		<div className="flex flex-col gap-6">
			<h2 className="text-title font-bold text-text-primary">Requests</h2>
			<ProvisionBox title="Pending join requests list">
				Approve / reject flows and APIs are deferred. Static list UI will go
				here.
			</ProvisionBox>
			<ProvisionBox title="Request detail drawer">
				Player profile snapshot and notes.
			</ProvisionBox>
		</div>
	);
}
