/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            // Palette is driven by CSS variables defined in
            // index.css. Existing utility classes like
            // `bg-background-dark` keep working — the value of the
            // variable just changes when [data-theme="light"] is set
            // on <html>. Adding a new colour means: declare a CSS
            // variable for both themes in index.css, then map it
            // here as `var(--name)`.
            // Each token is `rgb(var(--xxx) / <alpha-value>)` so
            // Tailwind's alpha modifier works — `bg-background-dark/80`
            // becomes `rgb(... / 0.8)`. Variables are RGB triples set
            // in index.css per theme.
            colors: {
                primary: "rgb(var(--color-primary) / <alpha-value>)",
                "primary-light": "rgb(var(--color-primary-light) / <alpha-value>)",
                "primary-dark": "rgb(var(--color-primary-dark) / <alpha-value>)",
                accent: "rgb(var(--color-accent) / <alpha-value>)",
                "background-light": "rgb(var(--color-background-light) / <alpha-value>)",
                "background-dark": "rgb(var(--color-background-dark) / <alpha-value>)",
                "surface-dark": "rgb(var(--color-surface-dark) / <alpha-value>)",
                background: "rgb(var(--color-background) / <alpha-value>)",
                "text-primary": "rgb(var(--color-text-primary) / <alpha-value>)",
                "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
                "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
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
            },
            keyframes: {
                // Translate the duplicated row sequence one full row-width
                // left, then jump back. TickerMarquee duplicates its rows
                // so the loop seam is invisible.
                marquee: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
            animation: {
                marquee: 'marquee 60s linear infinite',
            },
        },
    },
    plugins: [],
}
