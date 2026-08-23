/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eeffef',
          100: '#d7ffe0',
          500: '#25d366', // WhatsApp Green
          600: '#1da851',
          700: '#178440',
        },
        dark: {
          bg: '#090d16',
          card: '#111827',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: '#1f293d',
        },
        lead: {
          hot: '#ef4444',
          warm: '#f59e0b',
          cold: '#3b82f6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 20px rgba(37, 211, 102, 0.25)',
      }
    },
  },
  plugins: [],
};
