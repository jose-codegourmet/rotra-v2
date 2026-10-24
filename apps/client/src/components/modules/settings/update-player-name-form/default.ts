import type { UpdatePlayerNameFormValues } from "./schema";

export function buildUpdatePlayerNameFormDefaults(
	name: string,
): UpdatePlayerNameFormValues {
	return { name };
}
