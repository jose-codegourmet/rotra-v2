import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_DEV_STATE, type MockDevState } from '@rotra/data/mock/bridge'

const devSlice = createSlice({
  name: 'dev',
  initialState: { ...DEFAULT_DEV_STATE },
  reducers: {
    setDevToggle(state, action: PayloadAction<{ key: keyof MockDevState; value: boolean }>) {
      state[action.payload.key] = action.payload.value
    },
    resetDev: () => ({ ...DEFAULT_DEV_STATE }),
  },
})
export const { setDevToggle, resetDev } = devSlice.actions
export const devReducer = devSlice.reducer
export const selectDev = (state: { dev: MockDevState }) => state.dev
