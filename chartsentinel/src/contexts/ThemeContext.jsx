/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

// Light / dark theme controller. Dark is the default; the user's
// choice is persisted in localStorage and applied as a
// `data-theme="light"` attribute on <html>. Tailwind config maps the
// palette to CSS variables that flip on that attribute, so most of
// the existing components — which were written for the dark theme —
// switch automatically without per-component changes.
//
// We also write a `data-theme="dark"` for completeness so external
// CSS hooks (or third-party widgets) can react to either explicitly.

const STORAGE_KEY = 'chartsentinel.theme'
const ThemeContext = createContext({ theme: 'dark', setTheme: () => {} })

function readStoredTheme() {
    if (typeof window === 'undefined') return 'dark'
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'light' || stored === 'dark') return stored
    } catch {
        /* ignore — private mode */
    }
    return 'dark'
}

function applyTheme(theme) {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }) {
    // Read lazily so SSR-style mounts don't crash; useEffect below
    // mirrors the value into the DOM after the first render so the
    // very first paint already shows the correct theme.
    const [theme, setThemeState] = useState(() => readStoredTheme())

    // Apply on mount + every change. We also write to localStorage
    // here so toggling persists without each caller having to.
    useEffect(() => {
        applyTheme(theme)
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch {
            /* private mode */
        }
    }, [theme])

    const setTheme = (next) => {
        if (next !== 'light' && next !== 'dark') return
        setThemeState(next)
    }

    const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
