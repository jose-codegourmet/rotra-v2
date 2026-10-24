import { PlayerProfileError } from "@rotra/db";
import { NextResponse } from "next/server";

export function playerProfileErrorResponse(error: unknown, context: string) {
	if (error instanceof PlayerProfileError) {
		const statusByCode: Record<PlayerProfileError["code"], number> = {
			not_found: 404,
			forbidden: 403,
			bad_input: 400,
			bad_state: 409,
		};
		return NextResponse.json(
			{ error: error.message, code: error.code },
			{ status: statusByCode[error.code] },
		);
	}
	console.error(context, error);
	return NextResponse.json(
		{ error: "Failed to process profile request." },
		{ status: 500 },
	);
}
