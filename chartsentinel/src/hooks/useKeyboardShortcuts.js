import { useEffect, useState } from 'react';

// Global keyboard-shortcut registry. Returns the open/close state of
// the command palette and the help overlay so the consumer can render
// the right components in response.
//
// Bindings:
//   ⌘K / Ctrl+K   open command palette
//   ?             open shortcut help overlay (only when no input focused)
//   g s           jump to Signals
//   g w           jump to Watchlist
//   g h           jump to Home
//   g b           jump to Backtester
//   g p           jump to Portfolio
//   g x           jump to Settings (s is taken by signals)
//
// 'g' is a leader key — pressing g alone arms the next-keystroke
// handler with a 1.2s timeout. This matches the convention from
// Linear / GitHub / Vercel where double-key shortcuts feel natural
// without colliding with single-key typing in inputs.

function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return target.isContentEditable === true;
}

const LEADER_TIMEOUT_MS = 1200;

export function useKeyboardShortcuts({ navigate, setActiveTab }) {
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

    useEffect(() => {
        let leaderArmed = false;
        let leaderTimer = null;

        const goto = (tab) => {
            setActiveTab?.(tab);
            navigate?.(`/dashboard?tab=${tab}`);
        };

        const onKeyDown = (e) => {
            const cmd = e.metaKey || e.ctrlKey;

            // ⌘K / Ctrl+K — palette. Always available, even from inputs,
            // because this is the "escape hatch" shortcut.
            if (cmd && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((v) => !v);
                return;
            }

            // Don't run leader / single-letter shortcuts while typing.
            if (isTypingTarget(e.target)) return;

            // ? for help overlay. Shift+/ on US layouts.
            if (e.key === '?' && !cmd) {
                e.preventDefault();
                setHelpOpen((v) => !v);
                return;
            }

            // Leader 'g' arms the next keystroke for ~1.2s.
            if (e.key === 'g' && !cmd) {
                e.preventDefault();
                leaderArmed = true;
                clearTimeout(leaderTimer);
                leaderTimer = setTimeout(() => {
                    leaderArmed = false;
                }, LEADER_TIMEOUT_MS);
                return;
            }

            if (leaderArmed) {
                leaderArmed = false;
                clearTimeout(leaderTimer);
                const map = {
                    s: 'signals',
                    w: 'watchlist',
                    h: 'home',
                    b: 'backtester',
                    p: 'portfolio',
                    x: 'settings',
                    t: 'terminal',
                    m: 'mood',
                    n: 'news',
                    r: 'reports',
                };
                const target = map[e.key.toLowerCase()];
                if (target) {
                    e.preventDefault();
                    goto(target);
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            clearTimeout(leaderTimer);
        };
    }, [navigate, setActiveTab]);

    return {
        paletteOpen,
        setPaletteOpen,
        helpOpen,
        setHelpOpen,
    };
}
