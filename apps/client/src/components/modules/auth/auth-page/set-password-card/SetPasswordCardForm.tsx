"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button/Button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field/Field";
import { PasswordInput } from "@/components/ui/password-input/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { setPasswordDefault } from "./default";
import { type SetPasswordValues, setPasswordSchema } from "./schema";

async function submitSetPassword(password: string): Promise<void> {
	const response = await fetch("/api/auth/set-password", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ password }),
	});
	const payload = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	if (!response.ok)
		throw new Error(payload?.error ?? "Unable to set password right now.");
}

export type SetPasswordCardFormProps = {
	mode: "invite" | "reset";
	onSuccess?: () => void;
	onError?: (error: unknown) => void;
};

export function SetPasswordCardForm({
	mode,
	onSuccess,
	onError,
}: SetPasswordCardFormProps) {
	const router = useRouter();
	const form = useForm<SetPasswordValues>({
		resolver: zodResolver(setPasswordSchema),
		defaultValues: setPasswordDefault,
	});
	const mutation = useMutation({
		mutationFn: (values: SetPasswordValues) =>
			submitSetPassword(values.password),
		onSuccess: async () => {
			toast.success(mode === "reset" ? "Password updated." : "Password saved.");
			onSuccess?.();
			await createClient().auth.signOut();
			router.replace(mode === "reset" ? "/login?reset=1" : "/login?password=1");
			router.refresh();
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to set password right now.",
			);
			onError?.(error);
		},
	});
	const busy = mutation.isPending;
	return (
		<FormProvider {...form}>
			<form
				className="flex flex-col gap-5"
				onSubmit={form.handleSubmit((values) => {
					if (!busy) mutation.mutate(values);
				})}
			>
				<FieldGroup>
					<Controller
						control={form.control}
						name="password"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="set-password">Password</FieldLabel>
								<PasswordInput
									{...field}
									id="set-password"
									autoComplete="new-password"
									disabled={busy}
									aria-invalid={fieldState.invalid}
								/>
								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>
					<Controller
						control={form.control}
						name="confirmPassword"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="set-password-confirm">
									Confirm password
								</FieldLabel>
								<PasswordInput
									{...field}
									id="set-password-confirm"
									autoComplete="new-password"
									disabled={busy}
									aria-invalid={fieldState.invalid}
								/>
								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>
				</FieldGroup>
				<Button
					type="submit"
					className="h-12 w-full font-bold uppercase tracking-widest"
					disabled={busy}
				>
					{busy ? (
						<>
							<Loader2
								data-icon="inline-start"
								className="animate-spin"
								aria-hidden
							/>
							<span className="sr-only">Saving password</span>
						</>
					) : (
						"Save password"
					)}
				</Button>
			</form>
		</FormProvider>
	);
}
