/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: '#050505',
        panel: '#0a0a0a',
        border: '#333333',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        accent: 'var(--accent-color)',
        'accent-hover': 'var(--accent-hover)',
      },
      boxShadow: {
        glow: '0 0 10px rgba(0, 229, 255, 0.2)',
      },
    },
  },
  plugins: [],
}
