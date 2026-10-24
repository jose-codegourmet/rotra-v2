import type {
	ClubApplicationStatusDto,
	ExpectedPlayerBucketDto,
} from "@/types/club-application";

const BUCKET_LABELS: Record<ExpectedPlayerBucketDto, string> = {
	one_to_ten: "1–10",
	eleven_to_twentyfive: "11–25",
	twentysix_to_fifty: "26–50",
	fiftyone_to_hundred: "51–100",
	hundred_plus: "100+",
};

export function expectedPlayerBucketLabel(
	bucket: ExpectedPlayerBucketDto,
): string {
	return BUCKET_LABELS[bucket] ?? bucket;
}

const STATUS_LABELS: Record<ClubApplicationStatusDto, string> = {
	pending: "Under review",
	in_review: "In review",
	approved: "Approved",
	rejected: "Rejected",
	cancelled: "Cancelled",
};

export function clubApplicationStatusLabel(
	status: ClubApplicationStatusDto,
): string {
	return STATUS_LABELS[status] ?? status;
}

/** Admin rejection codes surfaced to the player on the application screen. */
const REJECTION_REASON_LABELS: Record<string, string> = {
	insufficient_information: "Insufficient information",
	unverifiable_venue: "Venue could not be verified",
	unverifiable_contact: "Contact details could not be verified",
	duplicate_or_squatting: "Duplicate or squatting concern",
	policy_violation: "Policy violation",
	spam_or_low_quality: "Spam or low quality",
	applicant_history: "Account history",
	other: "Other",
};

export function applicationRejectionReasonLabel(code: string | null): string {
	if (!code) return "Not specified";
	return REJECTION_REASON_LABELS[code] ?? code.replaceAll("_", " ");
}
