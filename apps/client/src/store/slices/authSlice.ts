import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
import type { User } from "@supabase/supabase-js";

export type AuthState = {
	user: User | null;
	initialized: boolean;
};

const initialState: AuthState = {
	user: null,
	initialized: false,
};

const authSlice = createSlice({
	name: "auth",
	initialState,
	reducers: {
		setAuthUser(state, action: PayloadAction<{ user: User | null }>) {
			state.user = action.payload.user;
			state.initialized = true;
		},
	},
});

export const { setAuthUser } = authSlice.actions;
export default authSlice.reducer;
