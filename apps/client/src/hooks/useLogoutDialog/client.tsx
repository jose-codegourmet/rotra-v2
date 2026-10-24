"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

import { LogoutConfirmDialog } from "@/components/modules/auth/LogoutConfirmDialog";
import { createClient } from "@/lib/supabase/client";

const POST_LOGOUT_REDIRECT_PATH = "/login" as const;

type LogoutDialogContextValue = {
	open: boolean;
	setOpen: (open: boolean) => void;
	openDialog: () => void;
	closeDialog: () => void;
	isPending: boolean;
	confirmLogout: () => Promise<void>;
};

const LogoutDialogContext = createContext<LogoutDialogContextValue | null>(
	null,
);

export function LogoutDialogProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const supabase = useMemo(() => createClient(), []);

	const openDialog = useCallback(() => {
		setOpen(true);
	}, []);

	const closeDialog = useCallback(() => {
		setOpen(false);
	}, []);

	const confirmLogout = useCallback(async () => {
		setIsPending(true);
		try {
			await supabase.auth.signOut();
			window.location.href = POST_LOGOUT_REDIRECT_PATH;
		} finally {
			setIsPending(false);
		}
	}, [supabase]);

	return (
		<LogoutDialogContext.Provider
			value={{
				open,
				setOpen,
				openDialog,
				closeDialog,
				isPending,
				confirmLogout,
			}}
		>
			{children}
			<LogoutConfirmDialog
				open={open}
				onOpenChange={setOpen}
				onConfirm={confirmLogout}
				isPending={isPending}
			/>
		</LogoutDialogContext.Provider>
	);
}

export function useLogoutDialog() {
	const context = useContext(LogoutDialogContext);
	if (!context) {
		throw new Error("useLogoutDialog must be used within LogoutDialogProvider");
	}
	return context;
}
