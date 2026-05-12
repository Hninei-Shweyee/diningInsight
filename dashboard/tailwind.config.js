/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a5c4a',
          light:   '#2d7a62',
          dark:    '#0f3d31',
        },
      },
    },
  },
  plugins: [],
}

