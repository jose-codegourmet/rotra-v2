import { format } from "date-fns";
import { z } from "zod";

export const quickSessionFormSchema = z.object({
	title: z
		.string()
		.min(1, "Session title is required")
		.max(80, "Session title must be 80 characters or fewer"),

	clubId: z
		.union([z.string().uuid("Select a valid club"), z.literal("")])
		.optional(),

	venue: z
		.object({
			name: z.string().min(2, "Venue name is required").max(120),
			address: z.string().max(200).optional(),
			latitude: z.number().nullable().optional(),
			longitude: z.number().nullable().optional(),
			placeId: z.string().uuid().optional(),
			isNewSubmission: z.boolean().optional(),
		})
		.refine(
			(v) => (v.latitude != null && v.longitude != null) || v.placeId != null,
			{
				message: "Pin a location or select a confirmed venue",
				path: ["name"],
			},
		),

	date: z
		.string()
		.min(1, "Date is required")
		.refine(
			(val) => val >= format(new Date(), "yyyy-MM-dd"),
			"Session date must be today or in the future",
		),
	startTime: z.string().min(1, "Start time is required"),
	durationHours: z
		.number()
		.refine(
			(v) => [1, 1.5, 2, 2.5, 3, 3.5, 4].includes(v),
			"Duration must be between 1h and 4h in 0.5h steps",
		),
	numCourts: z.coerce.number().int().min(1).max(12),
	playersPerCourt: z.enum(["2", "4"]),
	matchFormat: z.enum(["best_of_1", "best_of_3"]),
	scoreLimit: z.coerce.number().int().min(11).max(30),
	visibility: z.enum(["club_members", "open"]),
});

export type QuickSessionFormValues = z.infer<typeof quickSessionFormSchema>;
