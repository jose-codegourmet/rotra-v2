import type { Metadata } from "next";
import { SessionCourtView } from "@/components/modules/session/session-court-view/SessionCourtView";

export const metadata: Metadata = {
	title: "ROTRA — Court view",
	description: "Live courts, scores, and hold controls for tonight’s session.",
};

export default function SessionCourtPage() {
	return <SessionCourtView />;
}
