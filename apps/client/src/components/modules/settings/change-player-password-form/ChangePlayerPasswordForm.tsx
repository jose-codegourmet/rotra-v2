"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button/Button";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field/Field";
import { Input } from "@/components/ui/input/Input";
import { postChangePlayerPassword } from "@/hooks/usePlayerProfile/server";

import { buildChangePlayerPasswordFormDefaults } from "./default";
import {
	type ChangePlayerPasswordFormValues,
	changePlayerPasswordFormSchema,
} from "./schema";

export type ChangePlayerPasswordFormProps = {
	onSuccess: () => void;
	onError: (error: Error) => void;
};

export function ChangePlayerPasswordForm({
	onSuccess,
	onError,
}: ChangePlayerPasswordFormProps) {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const form = useForm<ChangePlayerPasswordFormValues>({
		resolver: zodResolver(changePlayerPasswordFormSchema),
		defaultValues: buildChangePlayerPasswordFormDefaults(),
	});
	const {
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = form;

	const mutation = useMutation({
		mutationFn: (values: ChangePlayerPasswordFormValues) =>
			postChangePlayerPassword(values.password),
		onSuccess: () => {
			toast.success("Password updated.");
			reset(buildChangePlayerPasswordFormDefaults());
			onSuccess();
		},
		onError: (error) => {
			const safeMessage =
				error instanceof Error
					? error.message
					: "Something went wrong. Please try again.";
			toast.error(safeMessage);
			onError(error instanceof Error ? error : new Error(safeMessage));
		},
	});

	const isPending = mutation.isPending;
	const onSubmit = handleSubmit((values) => {
		if (isPending) return;
		mutation.mutate(values);
	});

	return (
		<FormProvider {...form}>
			<form onSubmit={onSubmit} className="space-y-4">
				<Field data-invalid={!!errors.password}>
					<FieldLabel htmlFor="player-profile-password">
						New password
					</FieldLabel>
					<FieldContent>
						<Controller
							control={control}
							name="password"
							render={({ field, fieldState }) => (
								<>
									<div className="relative">
										<Input
											id="player-profile-password"
											type={showPassword ? "text" : "password"}
											autoComplete="new-password"
											placeholder="At least 8 characters"
											disabled={isPending}
											aria-invalid={!!fieldState.error}
											className="pr-11"
											{...field}
										/>
										<button
											type="button"
											className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-disabled transition-colors hover:text-text-primary"
											onClick={() => setShowPassword((current) => !current)}
											aria-label={
												showPassword ? "Hide password" : "Show password"
											}
											disabled={isPending}
										>
											{showPassword ? (
												<EyeOff className="size-4" aria-hidden />
											) : (
												<Eye className="size-4" aria-hidden />
											)}
										</button>
									</div>
									<FieldError errors={[fieldState.error]} />
								</>
							)}
						/>
					</FieldContent>
				</Field>

				<Field data-invalid={!!errors.confirmPassword}>
					<FieldLabel htmlFor="player-profile-password-confirm">
						Confirm password
					</FieldLabel>
					<FieldContent>
						<Controller
							control={control}
							name="confirmPassword"
							render={({ field, fieldState }) => (
								<>
									<div className="relative">
										<Input
											id="player-profile-password-confirm"
											type={showConfirmPassword ? "text" : "password"}
											autoComplete="new-password"
											placeholder="Re-enter your password"
											disabled={isPending}
											aria-invalid={!!fieldState.error}
											className="pr-11"
											{...field}
										/>
										<button
											type="button"
											className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-disabled transition-colors hover:text-text-primary"
											onClick={() =>
												setShowConfirmPassword((current) => !current)
											}
											aria-label={
												showConfirmPassword ? "Hide password" : "Show password"
											}
											disabled={isPending}
										>
											{showConfirmPassword ? (
												<EyeOff className="size-4" aria-hidden />
											) : (
												<Eye className="size-4" aria-hidden />
											)}
										</button>
									</div>
									<FieldError errors={[fieldState.error]} />
								</>
							)}
						/>
					</FieldContent>
				</Field>

				<div className="flex justify-end pt-2">
					<Button type="submit" disabled={isPending}>
						{isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden />
								<span className="sr-only">Updating password</span>
							</>
						) : (
							"Update password"
						)}
					</Button>
				</div>
			</form>
		</FormProvider>
	);
}

ChangePlayerPasswordForm.displayName = "ChangePlayerPasswordForm";
