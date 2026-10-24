import { Info } from "lucide-react";

export function FacebookManagedPasswordInfo() {
	return (
		<div className="flex gap-4">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bg-elevated">
				<Info size={20} strokeWidth={1.5} className="text-accent" aria-hidden />
			</div>
			<div className="min-w-0 flex-1 space-y-2">
				<p className="text-body font-medium text-text-primary">
					Signed in with Facebook
				</p>
				<p className="text-small text-text-secondary">
					This account is managed through Facebook. Your password and security
					settings are handled on Facebook and cannot be changed here.
				</p>
				<p className="text-small text-text-disabled">
					To update your password, visit your Facebook account settings.
				</p>
			</div>
		</div>
	);
}

FacebookManagedPasswordInfo.displayName = "FacebookManagedPasswordInfo";
