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
