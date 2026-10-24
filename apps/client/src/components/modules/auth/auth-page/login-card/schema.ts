import { z } from "zod";

export const loginCardSchema = z.object({
	intent: z.literal("facebook"),
});

export type LoginCardValues = z.infer<typeof loginCardSchema>;
