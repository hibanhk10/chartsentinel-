/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#d946ef", // Vibrant Magenta/Purple
                "primary-light": "#f0abfc", // Lighter magenta for highlights
                "primary-dark": "#c026d3", // Deeper magenta for depth
                accent: "#a855f7", // Purple accent for variety
                "background-light": "#ffffff",
                "background-dark": "#0a0a0a", // Slightly lighter than pure black
                "surface-dark": "#1a1a1a", // Better layering visibility
                background: "#0a0a0a",
                "text-primary": "#f1f5f9", // Brighter white for headings
                "text-secondary": "#cbd5e1", // Medium gray for body text
                "text-muted": "#94a3b8", // Subtle gray for less important text
            },
            fontFamily: {
                display: ["Outfit", "sans-serif"],
                body: ["Inter", "sans-serif"],
                sans: ["Inter", "sans-serif"],
            },
            borderRadius: {
                DEFAULT: "12px",
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            }
        },
    },
    plugins: [],
}
