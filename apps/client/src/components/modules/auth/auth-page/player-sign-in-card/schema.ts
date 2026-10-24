import { z } from "zod";

export const playerSignInSchema = z.object({
	email: z.string().email("Enter a valid email address."),
	password: z.string().min(1, "Password is required."),
});

export type PlayerSignInValues = z.infer<typeof playerSignInSchema>;
