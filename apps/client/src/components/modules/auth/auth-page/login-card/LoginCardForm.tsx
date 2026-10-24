"use client";

// Dormant while Meta review is blocked; preserved for the Facebook-linking follow-up (#85).

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input/Input";
import { startFacebookSignInAction } from "@/lib/auth/login-actions";
import { cn } from "@/lib/utils";
import { loginCardDefault } from "./default";
import { type LoginCardValues, loginCardSchema } from "./schema";

type LoginCardFormProps = {
	onSuccess?: (redirectUrl: string) => void;
	onError?: (error: unknown) => void;
};

function FacebookIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			className={className}
		>
			<path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
		</svg>
	);
}

function Spinner({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			aria-hidden="true"
			className={cn("animate-spin", className)}
		>
			<circle
				className="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="4"
			/>
			<path
				className="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			/>
		</svg>
	);
}

export function LoginCardForm({ onSuccess, onError }: LoginCardFormProps) {
	const form = useForm<LoginCardValues>({
		resolver: zodResolver(loginCardSchema),
		defaultValues: loginCardDefault,
	});

	const signInMutation = useMutation({
		mutationFn: async () =>
			startFacebookSignInAction({
				redirectOrigin: window.location.origin,
			}),
		onSuccess: (redirectUrl) => {
			toast.success("Redirecting to Facebook...");
			onSuccess?.(redirectUrl);
			window.location.href = redirectUrl;
		},
		onError: (error) => {
			toast.error("Login failed. Please try again.");
			onError?.(error);
		},
	});

	const onSubmit = form.handleSubmit(() => {
		if (signInMutation.isPending) return;
		signInMutation.mutate();
	});

	return (
		<FormProvider {...form}>
			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<Controller
					control={form.control}
					name="intent"
					render={({ field }) => (
						<Input {...field} type="hidden" readOnly aria-hidden="true" />
					)}
				/>
				{form.formState.errors.intent ? (
					<p className="sr-only" role="alert">
						{form.formState.errors.intent.message}
					</p>
				) : null}
				<button
					type="submit"
					disabled={signInMutation.isPending}
					className={cn(
						"flex h-12 w-full items-center justify-center gap-3 rounded-lg text-sm font-bold uppercase tracking-widest text-white transition-all duration-150",
						signInMutation.isPending
							? "cursor-not-allowed opacity-80"
							: "hover:brightness-90 active:scale-[0.98]",
					)}
					style={{
						// Facebook brand blue — official identity; no theme token. Same in both themes.
						backgroundColor: signInMutation.isPending ? "#1467D4" : "#1877F2",
					}}
					aria-label="Continue with Facebook"
				>
					{signInMutation.isPending ? (
						<Spinner className="size-5" />
					) : (
						<>
							<FacebookIcon className="size-5 shrink-0" />
							<span>Continue with Facebook</span>
						</>
					)}
				</button>
			</form>
		</FormProvider>
	);
}
