import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/modules/dashboard/dashboard-skeleton/DashboardSkeleton";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = {
	title: "Dashboard — ROTRA",
	description: "Discover nearby badminton sessions on the map.",
};

export default function DashboardPage() {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<DashboardClient />
		</Suspense>
	);
}
