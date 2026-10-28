import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import {
  DEFAULT_DEV_STATE,
  type LeaderboardScenario,
  type MockDevState,
  type PlayerMockDevState,
  type PlayerRankScenario,
} from '@rotra/data/mock/bridge'

const initialState = {
  ...DEFAULT_DEV_STATE,
  playerRankScenario: 'on-leaderboard' as PlayerRankScenario,
  leaderboardScenario: 'normal' as LeaderboardScenario,
  offlineAt: null as number | null,
}

const devSlice = createSlice({
  name: 'dev',
  initialState,
  reducers: {
    setDevToggle(state, action: PayloadAction<{ key: keyof MockDevState; value: boolean }>) {
      state[action.payload.key] = action.payload.value
      if (action.payload.key === 'offline')
        state.offlineAt = action.payload.value ? Date.now() : null
    },
    setPlayerRankScenario(state, action: PayloadAction<PlayerRankScenario>) {
      state.playerRankScenario = action.payload
    },
    setLeaderboardScenario(state, action: PayloadAction<LeaderboardScenario>) {
      state.leaderboardScenario = action.payload
    },
    resetDev: () => ({ ...initialState }),
  },
})
export const { setDevToggle, setPlayerRankScenario, setLeaderboardScenario, resetDev } =
  devSlice.actions
export const devReducer = devSlice.reducer
export const selectDev = (state: { dev: PlayerMockDevState & { offlineAt: number | null } }) =>
  state.dev
