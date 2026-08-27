/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Golos Text"', 'sans-serif'],
      },
      colors: {
        'border-light': '#E8E8E8',
      },
    },
  },
  plugins: [],
};
