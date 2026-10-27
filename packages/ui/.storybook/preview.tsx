import type { Decorator, Preview } from '@storybook/react-vite'
import { useEffect } from 'react'
import './storybook.css'

type Theme = 'dark' | 'light'

// Sets data-theme on <html> like the apps do, so stories render exactly as they will in a screen.
const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme ?? 'dark') as Theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return <Story />
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'ROTRA theme',
      toolbar: {
        title: 'Theme',
        icon: 'contrast',
        items: [
          { value: 'dark', title: 'Dark (default)' },
          { value: 'light', title: 'Light' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    viewport: {
      options: {
        phone: { name: 'Phone 375', styles: { width: '375px', height: '812px' }, type: 'mobile' },
        desktop: {
          name: 'Desktop 1280',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop',
        },
      },
    },
    controls: { matchers: { color: /(background|color)$/i } },
  },
}

export default preview
