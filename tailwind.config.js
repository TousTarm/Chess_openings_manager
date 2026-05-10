/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chess: {
          dark: '#769656',
          light: '#eeeed2',
          bg: '#161512',
          panel: '#272522',
          border: '#3d3a37',
          green: '#81b64c',
          'green-hover': '#6fa33a',
          text: '#e8e6e3',
          muted: '#a8a29e',
        }
      },
    },
  },
  plugins: [],
}
