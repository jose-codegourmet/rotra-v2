import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DashboardViewMode } from "@/types/session-discovery";

interface UIState {
	isMobileDrawerOpen: boolean;
	dashboardViewMode: DashboardViewMode;
}

const initialState: UIState = {
	isMobileDrawerOpen: false,
	dashboardViewMode: "map",
};

const uiSlice = createSlice({
	name: "ui",
	initialState,
	reducers: {
		toggleMobileDrawer(state) {
			state.isMobileDrawerOpen = !state.isMobileDrawerOpen;
		},
		openMobileDrawer(state) {
			state.isMobileDrawerOpen = true;
		},
		closeMobileDrawer(state) {
			state.isMobileDrawerOpen = false;
		},
		setDashboardViewMode(state, action: PayloadAction<DashboardViewMode>) {
			state.dashboardViewMode = action.payload;
		},
		resetDashboardViewMode(state) {
			state.dashboardViewMode = "map";
		},
	},
});

export const {
	toggleMobileDrawer,
	openMobileDrawer,
	closeMobileDrawer,
	setDashboardViewMode,
	resetDashboardViewMode,
} = uiSlice.actions;

export default uiSlice.reducer;
