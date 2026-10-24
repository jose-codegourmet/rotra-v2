import type { Metadata } from "next";
import { SessionJoinedView } from "@/components/modules/session/session-joined-view/SessionJoinedView";

export const metadata: Metadata = {
	title: "ROTRA — You’re accepted",
	description: "You’re in the queue. Share the join QR with other players.",
};

export default function SessionJoinedPage() {
	return <SessionJoinedView />;
}
