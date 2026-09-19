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
        'codigix': {
          navy: '#1e2b4a',
          'navy-dark': '#141d32',
          'navy-light': '#2a3d66',
          red: '#e02626',
          'red-dark': '#b81f1f',
          'red-light': '#f03434',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};
