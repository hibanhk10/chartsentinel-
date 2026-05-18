import { useTheme } from '../../contexts/ThemeContext'

// Pill-shaped theme switch. Two-button layout (Dark / Light) rather
// than a binary toggle because users want to see which mode they're
// in at a glance — a sun/moon icon swapping is cute but a labelled
// segmented control reads as "this is a setting" instantly.

export default function ThemeToggle({ compact = false }) {
    const { theme, setTheme } = useTheme()
    const isDark = theme === 'dark'

    if (compact) {
        return (
            <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center text-text-secondary hover:text-text-primary"
            >
                <span className="material-icons text-base">
                    {isDark ? 'dark_mode' : 'light_mode'}
                </span>
            </button>
        )
    }

    return (
        <div
            role="radiogroup"
            aria-label="Theme"
            className="inline-flex items-center gap-1 p-1 rounded-full border border-white/10 bg-white/[0.03]"
        >
            <button
                type="button"
                role="radio"
                aria-checked={isDark}
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                    isDark
                        ? 'bg-primary text-white shadow-lg shadow-primary/25'
                        : 'text-text-muted hover:text-text-primary'
                }`}
            >
                <span className="material-icons text-sm">dark_mode</span>
                Dark
            </button>
            <button
                type="button"
                role="radio"
                aria-checked={!isDark}
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                    !isDark
                        ? 'bg-primary text-white shadow-lg shadow-primary/25'
                        : 'text-text-muted hover:text-text-primary'
                }`}
            >
                <span className="material-icons text-sm">light_mode</span>
                Light
            </button>
        </div>
    )
}
