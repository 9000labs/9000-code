/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claude-inspired color palette
        'claude-bg': '#1a1a1a',
        'claude-surface': '#252525',
        'claude-border': '#333333',
        'claude-text': '#e5e5e5',
        'claude-text-secondary': '#a3a3a3',
        'claude-accent': '#d97706', // Amber/Orange accent
        'claude-accent-hover': '#f59e0b',
        'claude-success': '#22c55e',
        'claude-warning': '#eab308',
        'claude-error': '#ef4444',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
