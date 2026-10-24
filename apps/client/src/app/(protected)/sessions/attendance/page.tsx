import type { Metadata } from "next";
import { SessionAttendanceView } from "@/components/modules/session/session-attendance-view/SessionAttendanceView";

export const metadata: Metadata = {
	title: "ROTRA — You’re accepted",
	description: "Check in when you get to the venue.",
};

export default function SessionAttendancePage() {
	return <SessionAttendanceView />;
}
