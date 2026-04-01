import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./utils/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/**/*.{js,ts,jsx,tsx,mdx}", // Добавил на всякий случай
    ],
    theme: {
        extend: {
            colors: {
                background: "#0A0A0A",
                surface: "#1A1A1A",
                "surface-hover": "#2A2A2A",
                primary: "#FFFFFF",
                secondary: "#A0A0A0",
                accent: "#39FF14",
                danger: "#FF3366",
            },
        },
    },
    plugins: [],
};
export default config;