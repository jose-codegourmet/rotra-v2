export type SessionAttendanceMetaIcon =
	| "location"
	| "date"
	| "window"
	| "format";

export type SessionAttendanceMetaCard = {
	id: string;
	label: string;
	value: string;
	icon: SessionAttendanceMetaIcon;
};

export const MOCK_SESSION_ATTENDANCE = {
	venue: "Smash Hub Ortigas",
	arrivalStatus: "NOT ARRIVED",
	arrivedStatus: "ARRIVED",
	headline: "You’re accepted",
	subLine: "Check in when you get to the venue.",
	subLinkLine: "Open via link",
	statusLabel: "YOUR STATUS",
	statusValue: "Joined • not arrived",
	arrivedStatusValue: "Joined • arrived",
	acceptedBadge: "ACCEPTED",
	acceptedCount: 8,
	waitlistRest: "rest waitlisted",
	locationLabel: "Smash Hub Ortigas",
	dateLabel: "Sun, Aug 23",
	windowLabel: "7:00—9:00 PM",
	formatLabel: "Doubles • 2 x 4",
	attendanceTitle: "ATTENDANCE",
	stepProgress: "Step 1 of 2",
	step1Eyebrow: "STEP 1 • CURRENT",
	step1ArrivedEyebrow: "STEP 1 • DONE",
	step1Title: "I am in",
	step1Description: "Tap when you arrive at the venue",
	step1ArrivedDescription: "Checked in at the venue",
	step1Badge: "NOW",
	step1ArrivedBadge: "IN",
	step2Eyebrow: "STEP 2 • UPCOMING",
	step2Title: "I am prepared",
	step2Description: "Unlocks after you check in",
	step2Badge: "LOCKED",
	ctaLabel: "I AM IN",
	arrivedCtaLabel: "YOU’RE IN",
	checkInToast: "You’re in.",
} as const;

export type SessionAttendanceFixture = typeof MOCK_SESSION_ATTENDANCE;

export const MOCK_SESSION_ATTENDANCE_META: SessionAttendanceMetaCard[] = [
	{
		id: "location",
		label: "LOCATION",
		value: MOCK_SESSION_ATTENDANCE.locationLabel,
		icon: "location",
	},
	{
		id: "date",
		label: "DATE",
		value: MOCK_SESSION_ATTENDANCE.dateLabel,
		icon: "date",
	},
	{
		id: "window",
		label: "WINDOW",
		value: MOCK_SESSION_ATTENDANCE.windowLabel,
		icon: "window",
	},
	{
		id: "format",
		label: "FORMAT",
		value: MOCK_SESSION_ATTENDANCE.formatLabel,
		icon: "format",
	},
];
