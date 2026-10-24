"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { signInPlayer } from "@/lib/auth/client";
import { playerSignInDefault } from "./default";
import { type PlayerSignInValues, playerSignInSchema } from "./schema";

export type PlayerSignInCardFormProps = {
	nextPath?: string | undefined;
	onSuccess?: (redirectTo: string) => void;
	onError?: (error: unknown) => void;
};

export function PlayerSignInCardForm({
	nextPath,
	onSuccess,
	onError,
}: PlayerSignInCardFormProps) {
	const router = useRouter();
	const form = useForm<PlayerSignInValues>({
		resolver: zodResolver(playerSignInSchema),
		defaultValues: playerSignInDefault,
	});
	const mutation = useMutation({
		mutationFn: (values: PlayerSignInValues) =>
			signInPlayer({
				email: values.email.trim().toLowerCase(),
				password: values.password,
				next: nextPath,
			}),
		onSuccess: ({ redirectTo }) => {
			toast.success("Signed in.");
			onSuccess?.(redirectTo);
			router.replace(redirectTo);
			router.refresh();
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Unable to sign in right now.",
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
						name="email"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="login-email">Email</FieldLabel>
								<Input
									{...field}
									id="login-email"
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
								<FieldLabel htmlFor="login-password">Password</FieldLabel>
								<PasswordInput
									{...field}
									id="login-password"
									autoComplete="current-password"
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
							<span className="sr-only">Signing in</span>
						</>
					) : (
						"Sign in"
					)}
				</Button>
				<div className="flex items-center justify-between gap-4 text-sm">
					<Link
						href="/forgot-password"
						className="text-text-secondary hover:text-text-primary"
					>
						Forgot password?
					</Link>
					<Link
						href="/sign-up"
						className="font-semibold text-accent hover:text-accent-dim"
					>
						Create an account
					</Link>
				</div>
			</form>
		</FormProvider>
	);
}
