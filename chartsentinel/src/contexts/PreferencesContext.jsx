import { createContext, useContext, useEffect, useState } from 'react';

// User preferences that persist across sessions but never need a backend
// round-trip. Right now: density (comfortable / compact) and a sound
// toggle reserved for the audio batch. Stored as a single object in
// localStorage so adding a third preference doesn't multiply keys.

const STORAGE_KEY = 'chartsentinel.prefs.v1';

const DEFAULTS = {
    density: 'comfortable', // 'comfortable' | 'compact'
    sound: false,           // opt-in subtle audio
};

function load() {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULTS;
        const parsed = JSON.parse(raw);
        return { ...DEFAULTS, ...parsed };
    } catch {
        return DEFAULTS;
    }
}

const PreferencesContext = createContext({
    prefs: DEFAULTS,
    setDensity: () => {},
    setSound: () => {},
});

export const PreferencesProvider = ({ children }) => {
    const [prefs, setPrefs] = useState(load);

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch {
            // localStorage can throw in private mode / over-quota — just
            // forget the new value rather than crash the app.
        }

        // Reflect density on the document root so Tailwind utilities
        // can opt in via the `data-density` attribute selector. We
        // don't use a class because density is orthogonal to dark mode
        // (which already owns the .dark class).
        document.documentElement.setAttribute('data-density', prefs.density);
    }, [prefs]);

    const setDensity = (density) =>
        setPrefs((p) => ({ ...p, density: density === 'compact' ? 'compact' : 'comfortable' }));

    const setSound = (enabled) => setPrefs((p) => ({ ...p, sound: !!enabled }));

    return (
        <PreferencesContext.Provider value={{ prefs, setDensity, setSound }}>
            {children}
        </PreferencesContext.Provider>
    );
};

export function usePreferences() {
    return useContext(PreferencesContext);
}
