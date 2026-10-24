import { z } from "zod";

export const changePlayerPasswordFormSchema = z
	.object({
		password: z
			.string()
			.trim()
			.min(8, "Password must be at least 8 characters."),
		confirmPassword: z.string().trim().min(8, "Confirm your password."),
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match.",
	});

export type ChangePlayerPasswordFormValues = z.infer<
	typeof changePlayerPasswordFormSchema
>;
