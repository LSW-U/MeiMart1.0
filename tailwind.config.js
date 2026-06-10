/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#720003',
        'primary-container': '#961813',
        surface: '#fff8f7',
        'surface-warm': '#fff8f7',
        'surface-container': '#ffe9e6',
        'surface-container-low': '#fff0ee',
        'surface-container-high': '#fde2df',
        'surface-variant': '#f7ddd9',
        'on-surface': '#261816',
        'on-surface-variant': '#59413d',
        outline: '#8d706c',
        'outline-variant': '#e1bfba',
        tertiary: '#463200',
        'tertiary-container': '#634700',
        error: '#ba1a1a',
      },
    },
  },
};
