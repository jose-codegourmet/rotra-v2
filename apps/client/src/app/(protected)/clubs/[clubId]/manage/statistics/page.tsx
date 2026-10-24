import type { Metadata } from "next";

import { ProvisionBox } from "@/components/modules/club-profile/ProvisionBox";

export const metadata: Metadata = {
	title: "Club statistics — ROTRA",
	description: "Club statistics and analytics.",
};

export default async function ManageStatisticsPage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return (
		<div className="flex flex-col gap-6">
			<h2 className="text-title font-bold text-text-primary">Statistics</h2>
			<div className="grid gap-4 md:grid-cols-2">
				<ProvisionBox title="Session volume">
					Charts for completed sessions and attendance.
				</ProvisionBox>
				<ProvisionBox title="Member growth">
					Joins, churn, and tier breakdown.
				</ProvisionBox>
				<ProvisionBox title="Court utilization">
					Peak hours and capacity.
				</ProvisionBox>
				<ProvisionBox title="MMR / competitive blocks">
					Competitive progression summaries.
				</ProvisionBox>
			</div>
		</div>
	);
}
