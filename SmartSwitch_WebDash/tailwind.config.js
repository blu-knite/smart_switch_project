module.exports = {
  darkMode: 'class',
  content: [
    "./public/**/*.{html,js}",   // <-- critical
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(225, 50%, 4%)",
        foreground: "hsl(210, 40%, 98%)",
        primary: "hsl(187, 100%, 50%)",
        secondary: "hsl(225, 30%, 12%)",
        muted: "hsl(225, 30%, 16%)",
        border: "hsl(225, 30%, 22%)",
        success: "hsl(142, 76%, 45%)",
        warning: "hsl(38, 92%, 50%)",
        destructive: "hsl(0, 84%, 60%)",
        sidebar: "hsl(225, 40%, 8%)",
        accent: "hsl(267, 100%, 65%)",
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      }
    }
  },
  plugins: [],
}