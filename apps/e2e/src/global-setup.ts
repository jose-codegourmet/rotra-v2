import { assertE2eEnv } from './guard.ts'
import { e2eEnv, readStackKeys } from './stack.ts'

/** Refuses the whole run unless the runner and the values it hands the apps are the local stack. */
export default function globalSetup() {
  assertE2eEnv(e2eEnv(readStackKeys()))
  assertE2eEnv(process.env)
}
