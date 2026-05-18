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
            colors: {
                primary: "var(--color-primary)",
                "primary-light": "var(--color-primary-light)",
                "primary-dark": "var(--color-primary-dark)",
                accent: "var(--color-accent)",
                "background-light": "var(--color-background-light)",
                "background-dark": "var(--color-background-dark)",
                "surface-dark": "var(--color-surface-dark)",
                background: "var(--color-background)",
                "text-primary": "var(--color-text-primary)",
                "text-secondary": "var(--color-text-secondary)",
                "text-muted": "var(--color-text-muted)",
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
