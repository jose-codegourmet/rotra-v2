import { z } from "zod";

export const playerSignUpSchema = z
	.object({
		email: z.string().email("Enter a valid email address."),
		password: z.string().min(8, "Password must be at least 8 characters."),
		confirmPassword: z.string().min(1, "Please confirm your password."),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

export type PlayerSignUpValues = z.infer<typeof playerSignUpSchema>;
