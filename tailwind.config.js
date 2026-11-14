/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        sky: {
          obsidian: '#090b14',
          glass: 'rgba(15, 19, 34, 0.78)',
          gold: '#e5a95c',
          amber: '#ff9d42',
          violet: '#7c5cff',
        }
      }
    },
  },
  plugins: [],
}
