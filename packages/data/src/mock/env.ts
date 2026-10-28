// @rotra/data ships without Node types; Next inlines process.env.NODE_ENV at build time.
declare const process: { env: { NODE_ENV?: string } }

/** Mock dev toggles never apply to a production build. */
export function isProductionBuild() {
  return process.env.NODE_ENV === 'production'
}
