// Help overlay listing every keyboard shortcut. Opened by `?` and
// closed by Esc / clicking the backdrop. Single source of truth — if
// you bind a new shortcut in useKeyboardShortcuts, add the row here.

const ROWS = [
    {
        section: 'Navigation',
        items: [
            { keys: ['⌘', 'K'], label: 'Open command palette' },
            { keys: ['g', 's'], label: 'Go to Signals' },
            { keys: ['g', 'w'], label: 'Go to Watchlist' },
            { keys: ['g', 'h'], label: 'Go to Home' },
            { keys: ['g', 'b'], label: 'Go to Backtester' },
            { keys: ['g', 'p'], label: 'Go to Portfolio' },
            { keys: ['g', 'x'], label: 'Go to Settings' },
            { keys: ['g', 't'], label: 'Go to Terminal' },
        ],
    },
    {
        section: 'General',
        items: [
            { keys: ['?'], label: 'Toggle this help overlay' },
            { keys: ['esc'], label: 'Close any modal' },
        ],
    },
];

const Kbd = ({ children }) => (
    <kbd className="text-[10px] font-mono text-white px-1.5 py-0.5 bg-white/10 rounded border border-white/15">
        {children}
    </kbd>
);

const ShortcutHelp = ({ open, onClose }) => {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface-dark border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-white">Keyboard shortcuts</h3>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-white"
                        aria-label="Close"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {ROWS.map((section) => (
                    <div key={section.section} className="mb-4 last:mb-0">
                        <h4 className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                            {section.section}
                        </h4>
                        <ul className="space-y-1.5">
                            {section.items.map((row) => (
                                <li key={row.label} className="flex items-center justify-between text-sm">
                                    <span className="text-text-secondary">{row.label}</span>
                                    <span className="flex items-center gap-1">
                                        {row.keys.map((k, i) => (
                                            <Kbd key={i}>{k}</Kbd>
                                        ))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                <p className="text-[10px] text-text-muted mt-4 pt-4 border-t border-white/5">
                    Press <Kbd>?</Kbd> any time to bring this back up.
                </p>
            </div>
        </div>
    );
};

export default ShortcutHelp;
