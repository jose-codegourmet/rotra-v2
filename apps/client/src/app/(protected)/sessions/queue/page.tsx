import type { Metadata } from "next";
import { SessionQueueView } from "@/components/modules/session/session-queue-view/SessionQueueView";

export const metadata: Metadata = {
	title: "ROTRA — Queue",
	description: "Next-up pairing and upcoming matches for tonight’s session.",
};

export default function SessionQueuePage() {
	return <SessionQueueView />;
}
