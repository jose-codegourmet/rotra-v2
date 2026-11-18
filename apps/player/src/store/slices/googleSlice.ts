import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** A Google account picked on P-LOGIN whose email is a password account's ROTRA email (P-GOOGLE-LINK). */
export type PendingGoogleLink = {
  google: { email: string; name: string }
  playerId: string
  playerName: string
  /** Where to go after Connect Google and sign in: the safe `returnTo` /login was opened with */
  returnTo?: string
}

const googleSlice = createSlice({
  name: 'google',
  initialState: {
    /** Held between /login and /connect-google; never in the URL (it holds an email) */
    pendingLink: null as PendingGoogleLink | null,
    /** "Use my password instead": /login opens with this email filled, then clears it */
    loginEmail: null as string | null,
  },
  reducers: {
    setPendingLink(state, action: PayloadAction<PendingGoogleLink | null>) {
      state.pendingLink = action.payload
    },
    setLoginEmail(state, action: PayloadAction<string | null>) {
      state.loginEmail = action.payload
    },
  },
})
export const { setPendingLink, setLoginEmail } = googleSlice.actions
export const googleReducer = googleSlice.reducer
type GoogleState = { google: ReturnType<typeof googleReducer> }
export const selectPendingLink = (state: GoogleState) => state.google.pendingLink
export const selectLoginEmail = (state: GoogleState) => state.google.loginEmail
