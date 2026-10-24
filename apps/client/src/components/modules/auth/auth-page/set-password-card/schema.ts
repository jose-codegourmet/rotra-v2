import { z } from "zod";

export const setPasswordSchema = z
	.object({
		password: z.string().min(8, "Password must be at least 8 characters."),
		confirmPassword: z.string().min(1, "Please confirm your password."),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
