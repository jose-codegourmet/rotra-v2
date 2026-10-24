import type { Metadata } from "next";
import { PlayerCourtsView } from "@/components/modules/session/player-courts-view/PlayerCourtsView";

export const metadata: Metadata = {
	title: "ROTRA — Courts",
	description: "Live courts for tonight’s session.",
};

export default function PlayerCourtsPage() {
	return <PlayerCourtsView />;
}
