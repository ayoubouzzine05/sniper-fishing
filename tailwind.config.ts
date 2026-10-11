import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sniper Fishing marine palette: deep navy, ocean teal, white, subtle silver.
        navy: {
          50: '#f2f6fb',
          100: '#e2ebf5',
          200: '#c3d6ea',
          300: '#94b7d9',
          400: '#5f92c4',
          500: '#3c75ad',
          600: '#2c5d90',
          700: '#264c75',
          800: '#1d3a5a',
          900: '#12283f',
          950: '#0b1b2d'
        },
        ocean: {
          50: '#effefa',
          100: '#d4f6f0',
          200: '#aeeceb',
          300: '#79dfd4',
          400: '#40c6bd',
          500: '#21aca4',
          600: '#1b8b88',
          700: '#1a6f6e',
          800: '#195958',
          900: '#184a4a',
          950: '#0b2e2e'
        },
        silver: {
          50: '#f7f9fa',
          100: '#eef1f3',
          200: '#dde3e8',
          300: '#c2ccd4',
          400: '#9aa9b5',
          500: '#7c8e9c',
          600: '#667785',
          700: '#54626e',
          800: '#49545e',
          900: '#414a53',
          950: '#2c333a'
        }
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
        arabic: [
          '"Noto Sans Arabic"',
          'Tajawal',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        card: '0 1px 3px rgba(11, 27, 45, 0.08), 0 4px 16px rgba(11, 27, 45, 0.06)'
      }
    }
  },
  plugins: []
};

export default config;
