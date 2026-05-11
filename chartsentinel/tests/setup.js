// Adds jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...) to
// vitest's expect. Without this, assertions on rendered DOM read more
// awkwardly and produce worse failure messages.
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia. A handful of components (Sidebar,
// LoginModal animations) probe it on mount; stub it to a "no, doesn't
// match" sentinel so they don't crash on first render.
window.matchMedia ??= () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
});

// Same story for IntersectionObserver — used by lazy-loaded image
// components that occasionally render in tests.
window.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// jsdom's localStorage is sometimes a sealed Storage proxy that throws
// on access in CI. Replace it with a tiny in-memory replica when the
// real one doesn't expose a working getItem. AuthProvider calls
// localStorage.getItem('authToken') on mount and a missing function
// crashes the whole render tree.
if (typeof window.localStorage?.getItem !== 'function') {
    const store = new Map();
    Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
            getItem: (k) => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: (k) => store.delete(k),
            clear: () => store.clear(),
            key: (i) => Array.from(store.keys())[i] ?? null,
            get length() {
                return store.size;
            },
        },
    });
}
