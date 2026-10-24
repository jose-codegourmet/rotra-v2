/** Canonical onboarding submit body (matches docs/business_logic/client_app/20_onboarding.md §20.7). */
export type OnboardingPayload = {
	name: string;
	phone: string;
	age: number;
	playing_since: number | null;
	playing_since_less_than_one_year: boolean;
	playing_level: "beginner" | "intermediate" | "advanced";
	format_preference: "singles" | "doubles" | "both";
	court_position: "front" | "back" | "both";
	play_mode: "competitive" | "social" | "both";
	tournament_wins_last_year: "none" | "1_to_3" | "4_plus";
};

const PLAYING_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const FORMAT_PREFS = ["singles", "doubles", "both"] as const;
const COURT = ["front", "back", "both"] as const;
const PLAY_MODE = ["competitive", "social", "both"] as const;
const WINS = ["none", "1_to_3", "4_plus"] as const;

const NAME_RE = /^[\p{L}\s'-]{2,40}$/u;

/** E.164: + then 7–15 digits (ITU max). */
const E164_RE = /^\+[1-9]\d{6,14}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateOnboardingPayload(
	body: unknown,
): { ok: true; data: OnboardingPayload } | { ok: false; message: string } {
	if (!isRecord(body)) {
		return { ok: false, message: "Invalid JSON body." };
	}

	const name = body.name;
	if (typeof name !== "string" || name.length < 2 || name.length > 40) {
		return { ok: false, message: "Name must be at least 2 characters." };
	}
	if (!NAME_RE.test(name)) {
		return { ok: false, message: "Name contains invalid characters." };
	}

	const phone = body.phone;
	if (typeof phone !== "string" || !E164_RE.test(phone.trim())) {
		return { ok: false, message: "Please enter a valid phone number." };
	}
	const phoneE164 = phone.trim();

	const age = body.age;
	if (
		typeof age !== "number" ||
		!Number.isInteger(age) ||
		age < 13 ||
		age > 99
	) {
		return { ok: false, message: "Please select your age." };
	}

	const lessThanOne = body.playing_since_less_than_one_year;
	const playingSince = body.playing_since;

	if (lessThanOne === true) {
		if (playingSince !== null && playingSince !== undefined) {
			return { ok: false, message: "Invalid playing since combination." };
		}
	} else {
		if (
			typeof playingSince !== "number" ||
			!Number.isInteger(playingSince) ||
			playingSince < 1960 ||
			playingSince > new Date().getFullYear()
		) {
			return { ok: false, message: "Please tell us when you started playing." };
		}
	}

	if (typeof lessThanOne !== "boolean") {
		return { ok: false, message: "Please tell us when you started playing." };
	}

	const playing_level = body.playing_level;
	if (
		!PLAYING_LEVELS.includes(playing_level as (typeof PLAYING_LEVELS)[number])
	) {
		return { ok: false, message: "Please select your playing level." };
	}

	const format_preference = body.format_preference;
	if (
		!FORMAT_PREFS.includes(format_preference as (typeof FORMAT_PREFS)[number])
	) {
		return { ok: false, message: "Please select your format preference." };
	}

	const court_position = body.court_position;
	if (!COURT.includes(court_position as (typeof COURT)[number])) {
		return { ok: false, message: "Please select your court position." };
	}

	const play_mode = body.play_mode;
	if (!PLAY_MODE.includes(play_mode as (typeof PLAY_MODE)[number])) {
		return { ok: false, message: "Please select your play style." };
	}

	const tournament_wins_last_year = body.tournament_wins_last_year;
	if (!WINS.includes(tournament_wins_last_year as (typeof WINS)[number])) {
		return { ok: false, message: "Please select your recent tournament wins." };
	}

	const data: OnboardingPayload = {
		name: name.trim(),
		phone: phoneE164,
		age,
		playing_since: lessThanOne ? null : (playingSince as number),
		playing_since_less_than_one_year: lessThanOne,
		playing_level: playing_level as OnboardingPayload["playing_level"],
		format_preference:
			format_preference as OnboardingPayload["format_preference"],
		court_position: court_position as OnboardingPayload["court_position"],
		play_mode: play_mode as OnboardingPayload["play_mode"],
		tournament_wins_last_year:
			tournament_wins_last_year as OnboardingPayload["tournament_wins_last_year"],
	};

	return { ok: true, data };
}
