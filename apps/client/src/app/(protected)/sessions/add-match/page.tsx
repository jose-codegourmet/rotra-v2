import type { Metadata } from "next";
import { SessionAddMatchView } from "@/components/modules/session/session-add-match-view/SessionAddMatchView";

export const metadata: Metadata = {
	title: "ROTRA — Add match",
	description: "Pick players from the waiting pool to add a match.",
};

export default function SessionAddMatchPage() {
	return <SessionAddMatchView />;
}
