"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { playerProfileQueryKey } from "@/hooks/usePlayerProfile/queryKey";
import { patchPlayerName } from "@/hooks/usePlayerProfile/server";

import { buildUpdatePlayerNameFormDefaults } from "./default";
import {
	type UpdatePlayerNameFormValues,
	updatePlayerNameFormSchema,
} from "./schema";

export type UpdatePlayerNameFormProps = {
	name: string;
	email: string | null;
	emailHelperText?: string;
	onSuccess: () => void;
	onError: (error: Error) => void;
};

export function UpdatePlayerNameForm({
	name,
	email,
	emailHelperText = "Email cannot be changed.",
	onSuccess,
	onError,
}: UpdatePlayerNameFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const form = useForm<UpdatePlayerNameFormValues>({
		resolver: zodResolver(updatePlayerNameFormSchema),
		defaultValues: buildUpdatePlayerNameFormDefaults(name),
	});
	const {
		control,
		handleSubmit,
		formState: { errors },
	} = form;

	const mutation = useMutation({
		mutationFn: (values: UpdatePlayerNameFormValues) =>
			patchPlayerName(values.name.trim()),
		onSuccess: () => {
			toast.success("Profile updated.");
			void queryClient.invalidateQueries({ queryKey: playerProfileQueryKey });
			onSuccess();
			router.refresh();
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
				<Field data-invalid={!!errors.name}>
					<FieldLabel htmlFor="player-profile-name">Name</FieldLabel>
					<FieldContent>
						<Controller
							control={control}
							name="name"
							render={({ field, fieldState }) => (
								<>
									<Input
										id="player-profile-name"
										type="text"
										autoComplete="name"
										disabled={isPending}
										aria-invalid={!!fieldState.error}
										{...field}
									/>
									<FieldError errors={[fieldState.error]} />
								</>
							)}
						/>
					</FieldContent>
				</Field>

				<Field>
					<FieldLabel htmlFor="player-profile-email">Email</FieldLabel>
					<FieldContent>
						<Input
							id="player-profile-email"
							type="email"
							value={email ?? ""}
							readOnly
							disabled
							placeholder="Not linked"
							className="cursor-not-allowed opacity-70"
						/>
						<p className="mt-1 text-small text-text-secondary">
							{email ? emailHelperText : "No email on file for this account."}
						</p>
					</FieldContent>
				</Field>

				<div className="flex justify-end pt-2">
					<Button type="submit" disabled={isPending}>
						{isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden />
								<span className="sr-only">Saving</span>
							</>
						) : (
							"Save changes"
						)}
					</Button>
				</div>
			</form>
		</FormProvider>
	);
}

UpdatePlayerNameForm.displayName = "UpdatePlayerNameForm";
