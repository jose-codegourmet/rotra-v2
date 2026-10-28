import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type AdminAuthAccount = { email: string } | { accountDescription: string }
const authSlice = createSlice({
  name: 'auth',
  initialState: { account: null as AdminAuthAccount | null },
  reducers: {
    setAccount(state, action: PayloadAction<AdminAuthAccount | null>) {
      state.account = action.payload
    },
  },
})
export const { setAccount } = authSlice.actions
export const authReducer = authSlice.reducer
export const selectAccount = (state: { auth: { account: AdminAuthAccount | null } }) => state.auth.account
