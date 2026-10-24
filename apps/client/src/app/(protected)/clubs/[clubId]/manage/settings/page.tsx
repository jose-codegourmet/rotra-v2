import type { Metadata } from "next";

import { ManageSettingsClient } from "@/components/modules/club-profile/ManageSettingsClient";

export const metadata: Metadata = {
	title: "Club settings — ROTRA",
	description: "Club configuration.",
};

export default async function ManageSettingsPage({
	params,
}: {
	params: Promise<{ clubId: string }>;
}) {
	await params;

	return <ManageSettingsClient />;
}
