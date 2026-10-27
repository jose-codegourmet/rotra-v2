import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { navCollapsed: false },
  reducers: {
    setNavCollapsed(state, action: PayloadAction<boolean>) {
      state.navCollapsed = action.payload
    },
  },
})
export const { setNavCollapsed } = uiSlice.actions
export const uiReducer = uiSlice.reducer
export const selectNavCollapsed = (state: { ui: { navCollapsed: boolean } }) =>
  state.ui.navCollapsed
