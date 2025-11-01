/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fffef5',
          100: '#fffde8',
          200: '#fffbc6',
          300: '#fff9a3',
          400: '#fff580',
          500: '#D4AF37', // الذهبي البرونزي من الشعار
          600: '#B8860B',
          700: '#9C7C35',
          800: '#85692D',
          900: '#6B5725',
        },
        silver: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e0e0e0',
          300: '#d3d3d3',
          400: '#c0c0c0',
          500: '#CCCCCC', // الفضي من الشعار
          600: '#b8b8b8',
          700: '#a8a8a8',
          800: '#8e8e8e',
          900: '#757575',
        },
        dark: {
          50: '#2a2a2a',
          100: '#1f1f1f',
          200: '#1a1a1a', // الخلفية السوداء من الشعار
        },
      },
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
