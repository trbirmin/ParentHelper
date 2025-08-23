/**
 * Tailwind CSS configuration
 * - content: files to scan for class names
 * - theme.extend: custom brand palette, radii, and base font sizes
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5fbff',
          100: '#e6f6ff',
          200: '#cdeaff',
          300: '#a5d7ff',
          400: '#78beff',
          500: '#4ea6ff',
          600: '#2e86e6',
          700: '#2268b4',
          800: '#1e548f',
          900: '#1e4875'
        },
        mint: '#e8f5f2',
        peach: '#ffe9df',
        sand: '#f7f4ef'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      fontSize: {
        base: '1.05rem',
        lg: '1.2rem'
      }
    }
  },
  // Add Tailwind plugins here if needed (forms, typography, etc.)
  plugins: []
}
