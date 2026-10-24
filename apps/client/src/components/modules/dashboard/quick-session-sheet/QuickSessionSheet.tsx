"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Controller,
	type FieldPath,
	FormProvider,
	useForm,
	useWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/button/Button";
import { DatePicker } from "@/components/ui/date-picker/DatePicker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog/Dialog";
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
import { VenuePicker } from "@/components/ui/venue-picker/VenuePicker";
import { useMyClubs } from "@/hooks/useMyClubs";
import { useQuickSessionMutation } from "@/hooks/useQuickSessionMutation";
import { cn } from "@/lib/utils";
import { defaultQuickSessionValues } from "./default";
import { type QuickSessionFormValues, quickSessionFormSchema } from "./schema";

const DURATION_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const;

const STEP_FIELDS: Record<1 | 2 | 3, FieldPath<QuickSessionFormValues>[]> = {
	1: ["title", "clubId", "venue", "date", "startTime"],
	2: ["durationHours", "numCourts", "playersPerCourt"],
	3: ["matchFormat", "scoreLimit"],
};

function formatDurationHours(hours: number): string {
	return hours % 1 === 0 ? `${hours}h` : `${hours}h`;
}

function calculateGamesPerPlayer(
	numCourts: number,
	playersPerCourt: number,
	durationHours: number,
	avgGameMins: number,
): number {
	const totalPlayers = numCourts * playersPerCourt;
	if (totalPlayers === 0) return 0;

	const totalGameSlots =
		numCourts * Math.floor((durationHours * 60) / avgGameMins);
	const totalPlayerSlots = totalGameSlots * playersPerCourt;

	return Math.floor(totalPlayerSlots / totalPlayers);
}

function LiveEstimatePanel({
	numCourts,
	playersPerCourt,
	durationHours,
}: {
	numCourts: number;
	playersPerCourt: string;
	durationHours: number;
}) {
	const playersPerCourtNum = Number(playersPerCourt);
	const isValidDuration = DURATION_OPTIONS.includes(
		durationHours as (typeof DURATION_OPTIONS)[number],
	);

	if (numCourts < 1 || !playersPerCourt || !isValidDuration) {
		return null;
	}

	const totalPlayers = numCourts * playersPerCourtNum;
	const pessimistic = calculateGamesPerPlayer(
		numCourts,
		playersPerCourtNum,
		durationHours,
		30,
	);
	const typical = calculateGamesPerPlayer(
		numCourts,
		playersPerCourtNum,
		durationHours,
		15,
	);
	const optimistic = calculateGamesPerPlayer(
		numCourts,
		playersPerCourtNum,
		durationHours,
		10,
	);

	return (
		<div className="space-y-1 rounded-lg border border-border bg-bg-elevated p-4">
			<p className="text-sm text-text-secondary">Estimated games per player</p>
			<p className="text-lg font-bold text-text-primary">
				{pessimistic}–{optimistic} per player
			</p>
			<p className="text-sm text-text-secondary">
				~{typical} typical · {numCourts} courts · {totalPlayers} slots ·{" "}
				{formatDurationHours(durationHours)}
			</p>
			<p className="text-xs text-text-disabled">
				Based on 10–30 min avg per game
			</p>
		</div>
	);
}

export interface QuickSessionSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
	onError?: (error: unknown) => void;
	/** Optional overrides for Storybook / tests. */
	initialValues?: Partial<QuickSessionFormValues>;
}

export function QuickSessionSheet({
	open,
	onOpenChange,
	onSuccess,
	onError,
	initialValues,
}: QuickSessionSheetProps) {
	const { data: clubsData, isLoading: clubsLoading } = useMyClubs();
	const clubs = clubsData?.clubs ?? [];
	const createMutation = useQuickSessionMutation();

	const form = useForm<QuickSessionFormValues>({
		resolver: zodResolver(quickSessionFormSchema),
		defaultValues: defaultQuickSessionValues(),
		mode: "onBlur",
	});

	const { control, handleSubmit, reset, formState, trigger } = form;
	const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(
		null,
	);
	const [step, setStep] = useState<1 | 2 | 3>(1);

	const watchedNumCourts = useWatch({ control, name: "numCourts" });
	const watchedPlayersPerCourt = useWatch({ control, name: "playersPerCourt" });
	const watchedDurationHours = useWatch({ control, name: "durationHours" });

	const firstClubId = clubs[0]?.id;

	useEffect(() => {
		if (!open) {
			reset(defaultQuickSessionValues());
			setStep(1);
			return;
		}

		reset({
			...defaultQuickSessionValues(),
			...(firstClubId ? { clubId: firstClubId } : {}),
			...initialValues,
		});
		setStep(1);
	}, [open, firstClubId, reset, initialValues]);

	const onSubmit = handleSubmit((values) => {
		if (createMutation.isPending) return;
		createMutation.mutate(values, {
			onSuccess: () => {
				onOpenChange(false);
				onSuccess?.();
			},
			onError: (error) => {
				onError?.(error);
			},
		});
	});

	const handleNext = async () => {
		const fields = STEP_FIELDS[step];
		const valid = await trigger(fields);
		if (valid && step < 3) {
			setStep((current) => (current + 1) as 1 | 2 | 3);
		}
	};

	const handleBack = () => {
		if (step > 1) {
			setStep((current) => (current - 1) as 1 | 2 | 3);
		}
	};

	const isSubmitting = createMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				ref={setDialogContainer}
				className={cn(
					"max-h-[92dvh] overflow-y-auto sm:max-w-lg",
					"top-auto bottom-0 translate-y-0 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
					"rounded-b-none rounded-t-xl sm:rounded-xl",
				)}
			>
				<DialogHeader>
					<DialogTitle className="text-xl font-black tracking-tight">
						START QUICK SESSION
					</DialogTitle>
					<DialogDescription>
						Set up a casual session. A club is optional — either way, Quick
						Sessions are informal and earn no EXP or Rank.
					</DialogDescription>
					<p className="pt-1 text-sm text-text-secondary">Step {step} of 3</p>
				</DialogHeader>

				<FormProvider {...form}>
					<form onSubmit={onSubmit} className="space-y-4">
						<div className={cn("space-y-4", step !== 1 && "hidden")}>
							<Field data-invalid={!!formState.errors.title}>
								<FieldLabel htmlFor="quick-session-title">
									Session title
								</FieldLabel>
								<FieldContent>
									<Controller
										control={control}
										name="title"
										render={({ field }) => (
											<Input
												id="quick-session-title"
												placeholder="e.g. Friday Night Doubles"
												className="w-full"
												disabled={isSubmitting}
												{...field}
											/>
										)}
									/>
									<FieldError errors={[formState.errors.title]} />
								</FieldContent>
							</Field>

							<Field data-invalid={!!formState.errors.clubId}>
								<FieldLabel htmlFor="quick-session-club">
									Club{" "}
									<span className="font-normal text-text-secondary">
										(optional)
									</span>
								</FieldLabel>
								<FieldContent>
									<Controller
										control={control}
										name="clubId"
										render={({ field }) => (
											<NativeSelect
												id="quick-session-club"
												className="w-full"
												disabled={clubsLoading || isSubmitting}
												value={field.value ?? ""}
												onChange={field.onChange}
												onBlur={field.onBlur}
											>
												<NativeSelectOption value="">
													No club — casual
												</NativeSelectOption>
												{clubs.map((club) => (
													<NativeSelectOption key={club.id} value={club.id}>
														{club.name}
													</NativeSelectOption>
												))}
											</NativeSelect>
										)}
									/>
									<FieldError errors={[formState.errors.clubId]} />
								</FieldContent>
							</Field>

							<Field data-invalid={!!formState.errors.venue}>
								<FieldLabel>Venue</FieldLabel>
								<FieldContent>
									<Controller
										control={control}
										name="venue"
										render={({ field }) => (
											<VenuePicker
												value={field.value}
												onChange={field.onChange}
												disabled={isSubmitting}
											/>
										)}
									/>
									<FieldError
										errors={[
											formState.errors.venue?.name,
											formState.errors.venue?.address,
										]}
									/>
								</FieldContent>
							</Field>

							<div className="grid grid-cols-2 gap-4">
								<Field data-invalid={!!formState.errors.date}>
									<FieldLabel>Date</FieldLabel>
									<FieldContent>
										<Controller
											control={control}
											name="date"
											render={({ field }) => (
												<DatePicker
													value={field.value}
													onChange={field.onChange}
													fromDate={new Date()}
													disabled={isSubmitting}
													popoverContainer={dialogContainer}
												/>
											)}
										/>
										<FieldError errors={[formState.errors.date]} />
									</FieldContent>
								</Field>

								<Field data-invalid={!!formState.errors.startTime}>
									<FieldLabel htmlFor="quick-session-start-time">
										Start time
									</FieldLabel>
									<FieldContent>
										<Controller
											control={control}
											name="startTime"
											render={({ field }) => (
												<Input
													id="quick-session-start-time"
													type="time"
													className="w-full"
													disabled={isSubmitting}
													{...field}
												/>
											)}
										/>
										<FieldError errors={[formState.errors.startTime]} />
									</FieldContent>
								</Field>
							</div>
						</div>

						<div className={cn("space-y-4", step !== 2 && "hidden")}>
							<Field data-invalid={!!formState.errors.durationHours}>
								<FieldLabel>Duration</FieldLabel>
								<FieldContent>
									<Controller
										control={control}
										name="durationHours"
										render={({ field }) => {
											const currentIndex = DURATION_OPTIONS.indexOf(
												field.value as (typeof DURATION_OPTIONS)[number],
											);
											const safeIndex = currentIndex === -1 ? 1 : currentIndex;

											return (
												<div className="flex items-center gap-2">
													<Button
														type="button"
														variant="outline"
														size="icon"
														disabled={isSubmitting || safeIndex <= 0}
														onClick={() =>
															field.onChange(DURATION_OPTIONS[safeIndex - 1])
														}
														aria-label="Decrease duration"
													>
														<Minus className="size-4" />
													</Button>
													<span className="min-w-12 text-center text-sm font-semibold">
														{formatDurationHours(field.value)}
													</span>
													<Button
														type="button"
														variant="outline"
														size="icon"
														disabled={
															isSubmitting ||
															safeIndex >= DURATION_OPTIONS.length - 1
														}
														onClick={() =>
															field.onChange(DURATION_OPTIONS[safeIndex + 1])
														}
														aria-label="Increase duration"
													>
														<Plus className="size-4" />
													</Button>
												</div>
											);
										}}
									/>
									<FieldError errors={[formState.errors.durationHours]} />
								</FieldContent>
							</Field>

							<div className="grid grid-cols-2 gap-4">
								<Field data-invalid={!!formState.errors.numCourts}>
									<FieldLabel>Courts</FieldLabel>
									<FieldContent>
										<Controller
											control={control}
											name="numCourts"
											render={({ field }) => (
												<div className="flex items-center gap-2">
													<Button
														type="button"
														variant="outline"
														size="icon"
														disabled={isSubmitting || field.value <= 1}
														onClick={() =>
															field.onChange(Math.max(1, field.value - 1))
														}
														aria-label="Decrease courts"
													>
														<Minus className="size-4" />
													</Button>
													<span className="min-w-8 text-center text-sm font-semibold">
														{field.value}
													</span>
													<Button
														type="button"
														variant="outline"
														size="icon"
														disabled={isSubmitting || field.value >= 12}
														onClick={() =>
															field.onChange(Math.min(12, field.value + 1))
														}
														aria-label="Increase courts"
													>
														<Plus className="size-4" />
													</Button>
												</div>
											)}
										/>
										<FieldError errors={[formState.errors.numCourts]} />
									</FieldContent>
								</Field>

								<Field data-invalid={!!formState.errors.playersPerCourt}>
									<FieldLabel htmlFor="quick-session-players">
										Players per court
									</FieldLabel>
									<FieldContent>
										<Controller
											control={control}
											name="playersPerCourt"
											render={({ field }) => (
												<NativeSelect
													id="quick-session-players"
													className="w-full"
													disabled={isSubmitting}
													value={field.value}
													onChange={field.onChange}
													onBlur={field.onBlur}
												>
													<NativeSelectOption value="2">2</NativeSelectOption>
													<NativeSelectOption value="4">4</NativeSelectOption>
												</NativeSelect>
											)}
										/>
										<FieldError errors={[formState.errors.playersPerCourt]} />
									</FieldContent>
								</Field>
							</div>

							<LiveEstimatePanel
								numCourts={watchedNumCourts ?? 0}
								playersPerCourt={watchedPlayersPerCourt ?? ""}
								durationHours={watchedDurationHours ?? 0}
							/>
						</div>

						<div className={cn("space-y-4", step !== 3 && "hidden")}>
							<div className="grid grid-cols-2 gap-4">
								<Field data-invalid={!!formState.errors.matchFormat}>
									<FieldLabel htmlFor="quick-session-format">
										Match format
									</FieldLabel>
									<FieldContent>
										<Controller
											control={control}
											name="matchFormat"
											render={({ field }) => (
												<NativeSelect
													id="quick-session-format"
													className="w-full"
													disabled={isSubmitting}
													value={field.value}
													onChange={field.onChange}
													onBlur={field.onBlur}
												>
													<NativeSelectOption value="best_of_1">
														Best of 1
													</NativeSelectOption>
													<NativeSelectOption value="best_of_3">
														Best of 3
													</NativeSelectOption>
												</NativeSelect>
											)}
										/>
										<FieldError errors={[formState.errors.matchFormat]} />
									</FieldContent>
								</Field>

								<Field data-invalid={!!formState.errors.scoreLimit}>
									<FieldLabel htmlFor="quick-session-score">
										Score limit
									</FieldLabel>
									<FieldContent>
										<Controller
											control={control}
											name="scoreLimit"
											render={({ field }) => (
												<Input
													id="quick-session-score"
													type="number"
													min={11}
													max={30}
													className="w-full"
													disabled={isSubmitting}
													value={field.value}
													onChange={(e) =>
														field.onChange(
															e.target.value === ""
																? ""
																: Number(e.target.value),
														)
													}
													onBlur={field.onBlur}
												/>
											)}
										/>
										<FieldError errors={[formState.errors.scoreLimit]} />
									</FieldContent>
								</Field>
							</div>
						</div>

						<DialogFooter className="gap-2 pt-2 sm:justify-between">
							{step === 1 ? (
								<Button
									type="button"
									variant="ghost"
									disabled={isSubmitting}
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
							) : (
								<Button
									type="button"
									variant="ghost"
									disabled={isSubmitting}
									onClick={handleBack}
								>
									← Back
								</Button>
							)}

							{step < 3 ? (
								<Button
									type="button"
									disabled={isSubmitting || (step === 1 && clubsLoading)}
									onClick={() => void handleNext()}
								>
									Next →
								</Button>
							) : (
								<Button
									type="submit"
									disabled={isSubmitting || clubsLoading}
									className="bg-gradient-to-r from-accent to-accent-dim text-bg-base hover:opacity-90"
								>
									{isSubmitting ? "Opening…" : "OPEN SESSION"}
								</Button>
							)}
						</DialogFooter>
					</form>
				</FormProvider>
			</DialogContent>
		</Dialog>
	);
}
