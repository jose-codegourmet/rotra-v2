"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input/Input";
import { PasswordInput } from "@/components/ui/password-input/PasswordInput";
import { signUpPlayer } from "@/lib/auth/client";
import { playerSignUpDefault } from "./default";
import { type PlayerSignUpValues, playerSignUpSchema } from "./schema";

export type PlayerSignUpCardFormProps = {
	onSuccess?: () => void;
	onError?: (error: unknown) => void;
};

export function PlayerSignUpCardForm({
	onSuccess,
	onError,
}: PlayerSignUpCardFormProps) {
	const router = useRouter();
	const form = useForm<PlayerSignUpValues>({
		resolver: zodResolver(playerSignUpSchema),
		defaultValues: playerSignUpDefault,
	});
	const mutation = useMutation({
		mutationFn: (values: PlayerSignUpValues) =>
			signUpPlayer({
				email: values.email.trim().toLowerCase(),
				password: values.password,
			}),
		onSuccess: (result) => {
			onSuccess?.();
			if (result.needsConfirmation) {
				toast.success("Check your email to confirm your account.");
				return;
			}
			toast.success("Account created.");
			router.replace("/onboarding");
			router.refresh();
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to create your account right now.",
			);
			onError?.(error);
		},
	});
	const busy = mutation.isPending;
	if (mutation.data?.needsConfirmation) {
		return (
			<div className="flex flex-col items-center gap-4 py-4 text-center">
				<CheckCircle2 className="text-accent" aria-hidden />
				<p className="text-sm text-text-secondary">
					Check your email to confirm your account, then return here to sign in.
				</p>
				<Link
					href="/login"
					className="font-semibold text-accent hover:text-accent-dim"
				>
					Back to sign in
				</Link>
			</div>
		);
	}

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
						name="email"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="signup-email">Email</FieldLabel>
								<Input
									{...field}
									id="signup-email"
									type="email"
									autoComplete="email"
									disabled={busy}
									aria-invalid={fieldState.invalid}
									className="h-11 border-border bg-bg-base text-text-primary"
								/>
								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>
					<Controller
						control={form.control}
						name="password"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="signup-password">Password</FieldLabel>
								<PasswordInput
									{...field}
									id="signup-password"
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
								<FieldLabel htmlFor="signup-confirm-password">
									Confirm password
								</FieldLabel>
								<PasswordInput
									{...field}
									id="signup-confirm-password"
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
							<span className="sr-only">Creating account</span>
						</>
					) : (
						"Create account"
					)}
				</Button>
				<p className="text-center text-sm text-text-secondary">
					Already have an account?{" "}
					<Link
						href="/login"
						className="font-semibold text-accent hover:text-accent-dim"
					>
						Sign in
					</Link>
				</p>
			</form>
		</FormProvider>
	);
}
