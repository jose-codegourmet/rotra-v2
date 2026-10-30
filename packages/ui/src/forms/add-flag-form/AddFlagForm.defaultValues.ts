import type { AddFlagFormInput } from './AddFlagForm.schema'

/** New flags start off, so a flag can be added before the feature is ready. */
export const addFlagDefaultValues: AddFlagFormInput = {
  name: '',
  key: '',
  description: '',
  on: false,
}
