tailwind.config = {
  safelist: ["overflow-hidden"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF6F0",
        sand: "#F3E7DA",
        ink: "#241C16",
        bark: "#5C4636",
        muted: "#6F5E52",
        terracotta: "#C56A3A",
        "terracotta-deep": "#9C4E24",
        clay: "#E2B08A",
        line: "#E7D9CC",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        portrait:
          "0 34px 70px -28px rgba(74, 42, 18, 0.62), 0 14px 30px -18px rgba(74, 42, 18, 0.38)",
        card: "0 24px 50px -32px rgba(36, 28, 22, 0.45)",
      },
    },
  },
};
