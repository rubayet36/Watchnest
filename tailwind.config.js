/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#8b5cf6',
          50:  '#f5f3ff',
          100: '#ede9fe',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        nest: {
          bg:      '#0d0d1a',
          card:    '#1a1a3e',
          border:  'rgba(139, 92, 246, 0.2)',
        }
      },
      backgroundImage: {
        'gradient-nest': 'linear-gradient(135deg, #8b5cf6, #f43f5e, #f59e0b)',
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        float:   'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
