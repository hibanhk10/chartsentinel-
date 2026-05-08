// Tiny Web Audio sound layer. Synthesises tones on demand instead of
// shipping audio assets — keeps the bundle lean (no .mp3) and gives us
// full control over volume, pitch, and reduced-motion fallbacks.
//
// Two ambient sounds:
//   tick()  — soft 60Hz pop, used when AnimatedNumber starts a transition
//   chime() — mellow two-note chord, used when a watchlist alert fires
//
// All output is gated by the user's PreferencesContext sound flag at
// the call site; this module just produces audio when asked.

let ctx = null;

// Lazy AudioContext init — browsers refuse to construct one before a
// user gesture, so we delay until the first tick/chime call. If we
// can't construct (e.g. very old browser), every helper becomes a noop.
function getContext() {
    if (ctx) return ctx;
    if (typeof window === 'undefined') return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
        ctx = new Ctx();
    } catch {
        ctx = null;
    }
    return ctx;
}

// Generic ADSR-shaped tone helper. duration in seconds, vol 0-1.
function tone({ freq, duration, vol = 0.05, type = 'sine' }) {
    const audio = getContext();
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume().catch(() => {});

    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Fast attack, exponential release — gives a soft pop, not a click.
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration);
}

export const sound = {
    // Soft sine pop. Use sparingly — every score change in a screener
    // would be torture.
    tick() {
        tone({ freq: 880, duration: 0.08, vol: 0.04, type: 'sine' });
    },
    // Two-note "ding" — a perfect-fifth interval feels mellow + non-
    // urgent. For confirmations and successful alerts.
    chime() {
        tone({ freq: 880, duration: 0.18, vol: 0.05, type: 'sine' });
        setTimeout(() => tone({ freq: 1320, duration: 0.22, vol: 0.05, type: 'sine' }), 80);
    },
    // Low-frequency thud for failures / errors. Currently unused but
    // wired so future code can call it without re-thinking the API.
    error() {
        tone({ freq: 220, duration: 0.16, vol: 0.05, type: 'triangle' });
    },
};
