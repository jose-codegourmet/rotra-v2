import { Suspense } from "react";

import { ClubManageTabNav } from "@/components/modules/club-profile/ClubManageTabNav";

export default async function ClubManageLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ clubId: string }>;
}) {
	const { clubId } = await params;

	return (
		<div className="max-w-[1100px] mx-auto p-4 md:p-8">
			<p className="text-micro font-bold uppercase tracking-widest text-accent mb-1">
				Administrative terminal
			</p>
			<h1 className="text-display font-bold text-text-primary tracking-tight mb-2">
				Club administration
			</h1>
			<p className="text-body text-text-secondary mb-8 max-w-2xl">
				Que Masters and owners use this area to run the club. This build is
				UI-only.
			</p>
			<Suspense fallback={null}>
				<ClubManageTabNav clubId={clubId} />
			</Suspense>
			{children}
		</div>
	);
}
