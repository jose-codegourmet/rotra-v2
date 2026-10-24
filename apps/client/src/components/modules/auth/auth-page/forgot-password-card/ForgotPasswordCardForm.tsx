"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
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
import { requestPasswordReset } from "@/lib/auth/client";
import { forgotPasswordDefault } from "./default";
import { type ForgotPasswordValues, forgotPasswordSchema } from "./schema";

export type ForgotPasswordCardFormProps = {
	onSuccess?: () => void;
	onError?: (error: unknown) => void;
};

export function ForgotPasswordCardForm({
	onSuccess,
	onError,
}: ForgotPasswordCardFormProps) {
	const form = useForm<ForgotPasswordValues>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: forgotPasswordDefault,
	});
	const mutation = useMutation({
		mutationFn: (values: ForgotPasswordValues) =>
			requestPasswordReset({ email: values.email.trim().toLowerCase() }),
		onSuccess: () => {
			toast.success("If that email has a ROTRA account, we sent a reset link.");
			onSuccess?.();
		},
		onError: (error) => {
			toast.error("Unable to request a reset right now.");
			onError?.(error);
		},
	});
	const busy = mutation.isPending;
	if (mutation.isSuccess) {
		return (
			<div className="flex flex-col items-center gap-4 py-4 text-center">
				<CheckCircle2 className="text-accent" aria-hidden />
				<p className="text-sm text-text-secondary">
					If that email has a ROTRA account, we sent a reset link.
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
								<FieldLabel htmlFor="forgot-email">Email</FieldLabel>
								<Input
									{...field}
									id="forgot-email"
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
							<span className="sr-only">Sending reset link</span>
						</>
					) : (
						"Send reset link"
					)}
				</Button>
				<Link
					href="/login"
					className="text-center text-sm font-semibold text-accent hover:text-accent-dim"
				>
					Back to sign in
				</Link>
			</form>
		</FormProvider>
	);
}
