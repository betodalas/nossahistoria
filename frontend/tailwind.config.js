/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7c3aed',
          pink: '#be185d',
          light: '#c4b5fd',
          bg: '#0f0a1a',
          card: '#1a1030',
          deep: '#13082a',
          hover: '#1e1035',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
      backgroundImage: {
        'grad-brand': 'linear-gradient(135deg, #7c3aed, #be185d)',
        'grad-header': 'linear-gradient(135deg, #2d1060, #6b21a8)',
        'grad-hero': 'linear-gradient(160deg, #2d1060, #6b21a8 50%, #be185d)',
      }
    },
  },
  plugins: [],
}
