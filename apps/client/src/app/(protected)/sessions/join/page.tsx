import type { Metadata } from "next";
import { SessionJoinView } from "@/components/modules/session/session-join-view/SessionJoinView";

export const metadata: Metadata = {
	title: "ROTRA — Join session",
	description: "Join tonight’s open session at Smash Hub Ortigas.",
};

export default function SessionJoinPage() {
	return <SessionJoinView />;
}
