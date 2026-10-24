import type { Metadata } from "next";
import { PlayerStandingsView } from "@/components/modules/session/player-standings-view/PlayerStandingsView";

export const metadata: Metadata = {
	title: "ROTRA — Standings",
	description: "Session standings for tonight’s Smash Hub roster.",
};

export default function PlayerStandingsPage() {
	return <PlayerStandingsView />;
}
