import type { QuickSessionFormValues } from "./schema";

function getTodayIsoDate(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function getNextRoundedHour(): string {
	const now = new Date();
	now.setMinutes(0, 0, 0);
	now.setHours(now.getHours() + 1);
	return `${String(now.getHours()).padStart(2, "0")}:00`;
}

export function defaultQuickSessionValues(): QuickSessionFormValues {
	return {
		title: "",
		clubId: "",
		venue: {
			name: "",
			address: "",
			latitude: null,
			longitude: null,
			placeId: undefined,
			isNewSubmission: false,
		},
		date: getTodayIsoDate(),
		startTime: getNextRoundedHour(),
		durationHours: 2,
		numCourts: 1,
		playersPerCourt: "4",
		matchFormat: "best_of_1",
		scoreLimit: 21,
		visibility: "club_members",
	};
}
