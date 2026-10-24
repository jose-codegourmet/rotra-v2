import type { Metadata } from "next";

import { ProvisionBox } from "@/components/modules/club-profile/ProvisionBox";

export const metadata: Metadata = {
	title: "Club blacklist — ROTRA",
	description: "Blocked players.",
};

export default async function ManageBlacklistPage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return (
		<div className="flex flex-col gap-6">
			<h2 className="text-title font-bold text-text-primary">Blacklist</h2>
			<ProvisionBox title="Blocked players">
				List and unblock flows per club_owner_hub — UI only for now.
			</ProvisionBox>
			<ProvisionBox title="Audit trail">
				Who blocked whom and when.
			</ProvisionBox>
		</div>
	);
}
