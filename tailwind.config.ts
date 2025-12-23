import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "coral-glow": "#0353a4",
        "pacific-cyan": "#b9d6f2",
        "pacific-blue": "#006daa",
        "pitch-black": "#061a40",
        "deep-mocha": "#003559",
      },
    },
  },
};

export default config;
