import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { MockAccount as AuthAccount } from '@rotra/data/auth/types'

const authSlice = createSlice({
  name: 'auth',
  initialState: { account: null as AuthAccount | null },
  reducers: {
    setAccount(state, action: PayloadAction<AuthAccount | null>) {
      state.account = action.payload
    },
  },
})
export const { setAccount } = authSlice.actions
export const authReducer = authSlice.reducer
export const selectAccount = (state: { auth: { account: AuthAccount | null } }) =>
  state.auth.account
