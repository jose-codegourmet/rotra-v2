import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from './slices/authSlice'
import { devReducer } from './slices/devSlice'
import { googleReducer } from './slices/googleSlice'
import { uiReducer } from './slices/uiSlice'
/** Each provider owns its store; no cross-request singleton and no async thunks. */
export function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, ui: uiReducer, dev: devReducer, google: googleReducer },
    middleware: (getDefault) => getDefault({ thunk: false }),
  })
}
export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
