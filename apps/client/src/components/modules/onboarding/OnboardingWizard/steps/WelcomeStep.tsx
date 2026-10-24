"use client";

type WelcomeStepProps = {
	heading: string;
	subtitle: string;
};

export function WelcomeStep({ heading, subtitle }: WelcomeStepProps) {
	return (
		<div className="flex flex-col gap-4 text-center md:text-center">
			<h1 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
				{heading}
			</h1>
			<p className="text-body text-text-secondary">{subtitle}</p>
		</div>
	);
}
