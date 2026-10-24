import { Suspense } from "react";

import { ClubProfileLayoutClient } from "@/components/modules/club-profile/ClubProfileLayoutClient";

export default async function ClubIdLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ clubId: string }>;
}) {
	const { clubId } = await params;

	return (
		<Suspense
			fallback={
				<div className="max-w-[1100px] mx-auto p-8 text-small text-text-secondary">
					Loading club…
				</div>
			}
		>
			<ClubProfileLayoutClient clubId={clubId}>
				{children}
			</ClubProfileLayoutClient>
		</Suspense>
	);
}
