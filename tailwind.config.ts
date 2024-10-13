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
        background: "#f8fafc", // Light gray background for a clean look
        foreground: "#1a202c", // Dark gray text for contrast
        primary: "#4f46e5",    // A primary color (purple-ish)
        accent: "#38bdf8",     // Accent color for highlights (blue)
      },
      boxShadow: {
        xl: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", // Custom box shadow
      },
    },
  },
  plugins: [],
};

export default config;
