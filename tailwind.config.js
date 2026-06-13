module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#961813', container: '#b83228' },
        cultural: { gold: '#D4A030', tais: '#e4beba' },
      },
    },
  },
  plugins: [],
};
