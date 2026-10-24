import type { ChangePlayerPasswordFormValues } from "./schema";

export function buildChangePlayerPasswordFormDefaults(): ChangePlayerPasswordFormValues {
	return {
		password: "",
		confirmPassword: "",
	};
}
