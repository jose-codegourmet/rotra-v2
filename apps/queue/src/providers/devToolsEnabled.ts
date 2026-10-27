/** Development controls show in dev builds, or in production when NEXT_PUBLIC_ROTRA_DEV_MENU=1. */
export const DEV_TOOLS_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ROTRA_DEV_MENU === '1'
