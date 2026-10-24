import type { Metadata } from "next";
import { PlayerQueueView } from "@/components/modules/session/player-queue-view/PlayerQueueView";

export const metadata: Metadata = {
	title: "ROTRA — Queue",
	description: "Next-up pairing and upcoming matches for tonight’s session.",
};

export default function PlayerQueuePage() {
	return <PlayerQueueView />;
}
