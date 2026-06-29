/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './public/**/*.html', './src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        primary: '#135bec',
        'background-light': '#f6f6f8',
        'background-dark': '#101622',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

