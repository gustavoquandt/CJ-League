import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'faceit-orange': '#ff5500',
        'faceit-dark': '#0d0f12',
        'faceit-darker': '#07080a',
        'faceit-gray': '#1e2126',
        'faceit-light-gray': '#2d3137',
        'text-primary': '#ffffff',
        'text-secondary': '#b0b3b8',
        'success': '#22c55e',
        'warning': '#f59e0b',
        'danger': '#ef4444'
      }
    }
  },
  plugins: []
};
export default config;
