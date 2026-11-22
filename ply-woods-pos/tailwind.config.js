/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', '"Jameel Noori Nastaleeq"', 'serif'],
      },
      colors: {
        brand: {
          purple: '#7C5CFC',
          indigo: '#5B5BF0',
          cyan: '#3CD2F0',
          pink: '#E86CE0',
          lavender: '#F3F4FA',
          soft: '#EFEBFD',
        },
        dark: {
          bg: '#12131F',
          shell: '#171928',
          card: '#1B1D2E',
          border: '#2A2D45',
        },
      },
      boxShadow: {
        concured: '0 8px 30px rgba(110, 100, 200, 0.08)',
        shell: '0 24px 70px rgba(90, 82, 160, 0.09)',
        hero: '0 14px 36px rgba(124, 92, 252, 0.28)',
      },
      borderRadius: {
        shell: '28px',
        card: '20px',
      },
    },
  },
  plugins: [],
};
