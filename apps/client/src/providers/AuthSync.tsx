"use client";

import { useEffect, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser } from "@/store/slices/authSlice";

export function AuthSync({ children }: { children: React.ReactNode }) {
	const dispatch = useAppDispatch();
	const supabase = useMemo(() => createClient(), []);

	useEffect(() => {
		let cancelled = false;

		async function init() {
			const { data } = await supabase.auth.getSession();
			if (cancelled) return;
			dispatch(setAuthUser({ user: data.session?.user ?? null }));
		}

		void init();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			dispatch(setAuthUser({ user: session?.user ?? null }));
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [dispatch, supabase]);

	return <>{children}</>;
}
