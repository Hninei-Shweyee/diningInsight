/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f97316',
          light:   '#fb923c',
          dark:    '#ea580c',
        },
      },
    },
  },
  plugins: [],
}

