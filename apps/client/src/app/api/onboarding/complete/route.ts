import { db, type Prisma } from "@rotra/db";
import { NextResponse } from "next/server";
import { validateOnboardingPayload } from "@/lib/onboarding/validate-payload";
import { getCurrentProfile } from "@/lib/server/current-profile";

export async function POST(request: Request) {
	const profile = await getCurrentProfile();
	if (!profile) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (profile.onboardingCompleted) {
		return NextResponse.json(
			{ error: "Onboarding already completed." },
			{ status: 400 },
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
	}

	const validated = validateOnboardingPayload(body);
	if (!validated.ok) {
		return NextResponse.json({ error: validated.message }, { status: 400 });
	}

	const d = validated.data;

	try {
		const updated = await db.$transaction(async (tx) => {
			const before = await tx.profile.findUniqueOrThrow({
				where: { id: profile.id },
				select: { profileCompletedBonusClaimed: true },
			});

			const grantBonus = !before.profileCompletedBonusClaimed;

			const row = await tx.profile.update({
				where: { id: profile.id },
				data: {
					name: d.name,
					phone: d.phone,
					age: d.age,
					playingSince: d.playing_since,
					playingSinceLessThanOneYear: d.playing_since_less_than_one_year,
					playingLevel: d.playing_level,
					formatPreference: d.format_preference,
					courtPosition: d.court_position,
					playMode: d.play_mode,
					tournamentWinsLastYear: d.tournament_wins_last_year,
					onboardingCompleted: true,
					...(grantBonus
						? {
								expTotal: { increment: 20 },
								profileCompletedBonusClaimed: true,
							}
						: {}),
				} as Prisma.ProfileUpdateInput,
				select: {
					id: true,
					name: true,
					onboardingCompleted: true,
					playingLevel: true,
					formatPreference: true,
					courtPosition: true,
					playMode: true,
				},
			});

			if (grantBonus) {
				await tx.expTransaction.create({
					data: {
						playerId: profile.id,
						amount: 20,
						reason: "profile_completed",
					},
				});
			}

			return row;
		});

		return NextResponse.json({ ok: true, profile: updated });
	} catch {
		return NextResponse.json(
			{ error: "Something went wrong. Please try again." },
			{ status: 500 },
		);
	}
}
