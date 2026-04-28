import { useEffect, useState } from 'react';
import { CITY_OPTIONS, findCity, ROLE_OPTIONS } from '../../lib/cities';
import { networkingService } from '../../services/networkingService';

// Opt-in form for the community map. Posts city + lat/lng straight from
// the curated picker so the backend never has to geocode user-typed
// strings. Mounted on the Networking dashboard tab right above the map.

const MyLocationCard = ({ onChange }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [optIn, setOptIn] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [roleTag, setRoleTag] = useState('');
    const [cityValue, setCityValue] = useState('');
    const [feedback, setFeedback] = useState({ type: 'idle', message: '' });

    useEffect(() => {
        let cancelled = false;
        networkingService
            .getMyLocation()
            .then((res) => {
                if (cancelled) return;
                const loc = res?.location || {};
                setOptIn(Boolean(loc.locationOptIn));
                setDisplayName(loc.displayName || '');
                setRoleTag(loc.roleTag || '');
                if (loc.city && loc.country) {
                    const match = CITY_OPTIONS.find(
                        (c) => c.city === loc.city && c.country === loc.country
                    );
                    if (match) setCityValue(match.value);
                }
            })
            .catch(() => {
                // Non-fatal — the user simply hasn't set anything yet.
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSave = async (nextOptIn) => {
        setFeedback({ type: 'idle', message: '' });

        if (nextOptIn) {
            if (displayName.trim().length < 2) {
                setFeedback({ type: 'error', message: 'Pick a display name (2+ characters).' });
                return;
            }
            if (!cityValue) {
                setFeedback({ type: 'error', message: 'Pick a city before opting in.' });
                return;
            }
        }

        setSaving(true);
        try {
            const payload = nextOptIn
                ? (() => {
                      const city = findCity(cityValue);
                      return {
                          optIn: true,
                          displayName: displayName.trim(),
                          roleTag: roleTag || null,
                          city: city.city,
                          country: city.country,
                          lat: city.lat,
                          lng: city.lng,
                      };
                  })()
                : { optIn: false };

            await networkingService.updateMyLocation(payload);
            setOptIn(nextOptIn);
            setFeedback({
                type: 'success',
                message: nextOptIn ? 'You\'re on the map.' : 'Removed from the map.',
            });
            // Let the parent refetch the public roster so the map updates
            // without a page reload.
            onChange?.();
        } catch (err) {
            setFeedback({
                type: 'error',
                message: err?.message || 'Could not save. Try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-surface-dark border border-white/5 rounded-2xl p-5 text-text-muted text-xs">
                Loading your visibility settings…
            </div>
        );
    }

    return (
        <div className="bg-surface-dark border border-white/5 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-sm font-bold text-white">Your visibility</h3>
                    <p className="text-[11px] text-text-muted leading-relaxed mt-1 max-w-md">
                        Appear on the community map with a public handle and a city
                        pin. We never expose your email, IP, or precise location.
                    </p>
                </div>
                <span
                    className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${
                        optIn
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-white/5 text-text-muted border border-white/10'
                    }`}
                >
                    {optIn ? 'On the map' : 'Hidden'}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                        Display name
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="alpha-quant"
                        maxLength={32}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                </div>
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                        City
                    </label>
                    <select
                        value={cityValue}
                        onChange={(e) => setCityValue(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                    >
                        <option value="" className="bg-surface-dark">Select a city…</option>
                        {CITY_OPTIONS.map((c) => (
                            <option key={c.value} value={c.value} className="bg-surface-dark">
                                {c.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1.5">
                        Role <span className="text-text-muted/60 normal-case">(optional)</span>
                    </label>
                    <select
                        value={roleTag}
                        onChange={(e) => setRoleTag(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                    >
                        <option value="" className="bg-surface-dark">No role</option>
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r} className="bg-surface-dark">{r}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {optIn ? (
                    <>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSave(true)}
                            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Update'}
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSave(false)}
                            className="px-4 py-2 bg-white/5 border border-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/10 transition disabled:opacity-50"
                        >
                            Remove from map
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave(true)}
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Show me on the map'}
                    </button>
                )}
                {feedback.message && (
                    <span
                        className={`text-[11px] ${
                            feedback.type === 'success' ? 'text-green-400' : 'text-red-400'
                        }`}
                    >
                        {feedback.message}
                    </span>
                )}
            </div>
        </div>
    );
};

export default MyLocationCard;
