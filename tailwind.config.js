/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#D4A843',
        stone: '#2C2C2C',
        granite: '#1A1A1A',
        cream: '#F5F0E8',
        slate: '#3D3D3D',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
