import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    navCollapsed: false,
    /** An open form has edits that aren't saved; the shell asks before leaving (D-DISCARD) */
    unsavedDraft: false,
    /** Where the player tried to go while unsavedDraft was set */
    pendingLeave: null as string | null,
    /** The fullscreen onboarding (P-ONBOARD) is showing: no top bar, bands or dock */
    onboardingFullscreen: false,
  },
  reducers: {
    setNavCollapsed(state, action: PayloadAction<boolean>) {
      state.navCollapsed = action.payload
    },
    setUnsavedDraft(state, action: PayloadAction<boolean>) {
      state.unsavedDraft = action.payload
      if (!action.payload) state.pendingLeave = null
    },
    requestLeave(state, action: PayloadAction<string>) {
      state.pendingLeave = action.payload
    },
    setOnboardingFullscreen(state, action: PayloadAction<boolean>) {
      state.onboardingFullscreen = action.payload
    },
    clearLeave(state) {
      state.pendingLeave = null
    },
  },
})
export const {
  setNavCollapsed,
  setUnsavedDraft,
  requestLeave,
  clearLeave,
  setOnboardingFullscreen,
} = uiSlice.actions
export const uiReducer = uiSlice.reducer
type UiState = { ui: ReturnType<typeof uiReducer> }
export const selectNavCollapsed = (state: UiState) => state.ui.navCollapsed
export const selectUnsavedDraft = (state: UiState) => state.ui.unsavedDraft
export const selectPendingLeave = (state: UiState) => state.ui.pendingLeave
export const selectOnboardingFullscreen = (state: UiState) => state.ui.onboardingFullscreen
