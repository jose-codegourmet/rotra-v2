"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ClubApplicationSubmitConfirmDialog } from "@/components/modules/clubs/club-application/ClubApplicationSubmitConfirmDialog";
import { Button } from "@/components/ui/button/Button";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field/Field";
import { Input } from "@/components/ui/input/Input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@/components/ui/native-select/NativeSelect";
import { Textarea } from "@/components/ui/textarea/Textarea";
import {
	useMyClubApplication,
	useSaveClubApplicationMutation,
} from "@/hooks/useClubApplication/client";
import { expectedPlayerBucketLabel } from "@/lib/club-application-labels";
import {
	clubApplicationToFormValues,
	emptyClubApplicationForm,
} from "./club-application-defaults";
import {
	type ClubApplicationCreateFormValues,
	clubApplicationCreateBodySchema,
	EXPECTED_PLAYER_BUCKETS,
	CLUB_APPLICATION_FIELD_LIMITS as L,
} from "./schema";

export type ClubApplicationFormProps = {
	/** When set, form defaults sync from this pending application. */
	syncFromPending: ClubApplicationCreateFormValues | null;
	disabled?: boolean;
};

export function ClubApplicationForm({
	syncFromPending,
	disabled,
}: ClubApplicationFormProps) {
	const router = useRouter();
	const saveMut = useSaveClubApplicationMutation();
	const { data, refetch } = useMyClubApplication();
	const pending = data?.pending ?? null;

	const [confirmOpen, setConfirmOpen] = useState(false);
	const [submitBody, setSubmitBody] =
		useState<ClubApplicationCreateFormValues | null>(null);

	const form = useForm<ClubApplicationCreateFormValues>({
		resolver: zodResolver(clubApplicationCreateBodySchema),
		defaultValues: emptyClubApplicationForm(),
		mode: "onBlur",
	});

	const { register, control, reset, handleSubmit, formState } = form;

	useEffect(() => {
		if (syncFromPending) {
			reset(clubApplicationToFormValues(syncFromPending));
		} else {
			reset(emptyClubApplicationForm());
		}
	}, [syncFromPending, reset]);

	const descriptionLen =
		useWatch({
			control,
			name: "description",
			defaultValue: "",
		})?.length ?? 0;
	const intentLen =
		useWatch({ control, name: "intent", defaultValue: "" })?.length ?? 0;
	const notesLen =
		useWatch({ control, name: "additionalNotes", defaultValue: "" })?.length ??
		0;

	return (
		<>
			<form
				className="space-y-5 w-full"
				onSubmit={(e) => {
					e.preventDefault();
				}}
			>
				<Field data-invalid={!!formState.errors.clubName}>
					<FieldLabel htmlFor="club-application-club-name">
						Club name
					</FieldLabel>
					<FieldContent>
						<Input
							id="club-application-club-name"
							disabled={disabled}
							aria-invalid={!!formState.errors.clubName}
							{...register("clubName")}
						/>
						<FieldError errors={[formState.errors.clubName]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.description}>
					<div className="flex justify-between gap-2">
						<FieldLabel htmlFor="club-application-description">
							Club description
						</FieldLabel>
						<span className="text-micro text-text-disabled tabular-nums">
							{descriptionLen}/{L.description}
						</span>
					</div>
					<FieldContent>
						<Textarea
							id="club-application-description"
							disabled={disabled}
							aria-invalid={!!formState.errors.description}
							rows={4}
							{...register("description")}
						/>
						<FieldError errors={[formState.errors.description]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.intent}>
					<div className="flex justify-between gap-2">
						<FieldLabel htmlFor="club-application-intent">
							Why do you want this club?
						</FieldLabel>
						<span className="text-micro text-text-disabled tabular-nums">
							{intentLen}/{L.intent}
						</span>
					</div>
					<FieldContent>
						<Textarea
							id="club-application-intent"
							disabled={disabled}
							aria-invalid={!!formState.errors.intent}
							rows={4}
							{...register("intent")}
						/>
						<FieldError errors={[formState.errors.intent]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.locationCity}>
					<FieldLabel htmlFor="club-application-city">City</FieldLabel>
					<FieldContent>
						<Input
							id="club-application-city"
							disabled={disabled}
							aria-invalid={!!formState.errors.locationCity}
							{...register("locationCity")}
						/>
						<FieldError errors={[formState.errors.locationCity]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.locationVenue}>
					<FieldLabel htmlFor="club-application-venue">Venue name</FieldLabel>
					<FieldContent>
						<Input
							id="club-application-venue"
							disabled={disabled}
							aria-invalid={!!formState.errors.locationVenue}
							{...register("locationVenue")}
						/>
						<FieldError errors={[formState.errors.locationVenue]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.venueAddress}>
					<FieldLabel htmlFor="club-application-address">
						Venue address
					</FieldLabel>
					<FieldContent>
						<Textarea
							id="club-application-address"
							disabled={disabled}
							aria-invalid={!!formState.errors.venueAddress}
							rows={3}
							{...register("venueAddress")}
						/>
						<FieldError errors={[formState.errors.venueAddress]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.facebookPageUrl}>
					<FieldLabel htmlFor="club-application-fb-page">
						Club Facebook page URL (optional)
					</FieldLabel>
					<FieldContent>
						<Input
							id="club-application-fb-page"
							type="url"
							disabled={disabled}
							aria-invalid={!!formState.errors.facebookPageUrl}
							{...register("facebookPageUrl")}
						/>
						<FieldError errors={[formState.errors.facebookPageUrl]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.facebookProfileUrl}>
					<FieldLabel htmlFor="club-application-fb-profile">
						Your Facebook profile URL (optional)
					</FieldLabel>
					<FieldContent>
						<Input
							id="club-application-fb-profile"
							type="url"
							disabled={disabled}
							aria-invalid={!!formState.errors.facebookProfileUrl}
							{...register("facebookProfileUrl")}
						/>
						<FieldError errors={[formState.errors.facebookProfileUrl]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.contactNumber}>
					<FieldLabel htmlFor="club-application-contact">
						Contact number (optional)
					</FieldLabel>
					<FieldContent>
						<Input
							id="club-application-contact"
							type="tel"
							disabled={disabled}
							aria-invalid={!!formState.errors.contactNumber}
							{...register("contactNumber")}
						/>
						<FieldError errors={[formState.errors.contactNumber]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.expectedPlayerCount}>
					<FieldLabel htmlFor="club-application-bucket">
						Expected player count
					</FieldLabel>
					<FieldContent>
						<NativeSelect
							id="club-application-bucket"
							className="w-full max-w-md"
							disabled={disabled}
							aria-invalid={!!formState.errors.expectedPlayerCount}
							{...register("expectedPlayerCount")}
						>
							{EXPECTED_PLAYER_BUCKETS.map((b) => (
								<NativeSelectOption key={b} value={b}>
									{expectedPlayerBucketLabel(b)}
								</NativeSelectOption>
							))}
						</NativeSelect>
						<FieldError errors={[formState.errors.expectedPlayerCount]} />
					</FieldContent>
				</Field>

				<Field data-invalid={!!formState.errors.additionalNotes}>
					<div className="flex justify-between gap-2">
						<FieldLabel htmlFor="club-application-notes">
							Anything else we should know? (optional)
						</FieldLabel>
						<span className="text-micro text-text-disabled tabular-nums">
							{notesLen}/{L.additionalNotes}
						</span>
					</div>
					<FieldContent>
						<Textarea
							id="club-application-notes"
							disabled={disabled}
							aria-invalid={!!formState.errors.additionalNotes}
							rows={3}
							{...register("additionalNotes")}
						/>
						<FieldError errors={[formState.errors.additionalNotes]} />
					</FieldContent>
				</Field>

				<div className="pt-2">
					<Button
						type="button"
						disabled={disabled}
						onClick={() =>
							void handleSubmit((values) => {
								setSubmitBody(values);
								setConfirmOpen(true);
							})()
						}
					>
						{syncFromPending ? "Update application" : "Submit application"}
					</Button>
				</div>
			</form>
			<ClubApplicationSubmitConfirmDialog
				open={confirmOpen}
				onOpenChange={(open) => {
					setConfirmOpen(open);
					if (!open) setSubmitBody(null);
				}}
				isUpdate={Boolean(pending)}
				busy={saveMut.isPending}
				onConfirm={() => {
					if (!submitBody) return;
					saveMut.mutate(
						{ applicationId: pending?.id ?? null, body: submitBody },
						{
							onSuccess: () => {
								toast.success(
									pending ? "Application updated." : "Application submitted.",
								);
								setConfirmOpen(false);
								setSubmitBody(null);
								void refetch();
								void router.push("/clubs");
							},
							onError: (e) => {
								toast.error(String(e.message));
							},
						},
					);
				}}
			/>
		</>
	);
}
