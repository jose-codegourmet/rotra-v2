/**
 * Describes a component, form or app container for people and agents
 * (docs/coding-conventions.md §4). Every `<Name>.meta.ts` exports one, with `satisfies ComponentMeta`.
 */
export type ComponentMeta = {
  /** Component name, same as the file */
  name: string
  /** One or two sentences, using product terms */
  description: string
  /** When to use it, and when to use something else */
  usage: string[]
  /** Prototype file and screen it must match. Required for @rotra/ui components */
  prototype?: { file: string; screen: string }
  /** Screen or business doc paths with the rules it shows */
  docs?: string[]
  /** Variant names, same as the cva keys */
  variants?: string[]
  /** Components often used with it, or easily confused with it */
  related?: string[]
}
