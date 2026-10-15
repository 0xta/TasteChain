import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        avax: {
          DEFAULT: "#E84142",
          dark: "#D03536",
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["dark", "coffee", "cyberpunk", "retro", "emerald", "light"],
    defaultTheme: "dark",
  },
};

export default config;
