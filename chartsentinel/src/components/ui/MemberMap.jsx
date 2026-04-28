import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MemberMap.css';

// Real-tile world map showing approximate public locations of community
// members. Coordinates are city-level only — no PII, no IP geolocation,
// no precise location. Members appear here only after opting in.
//
// Tiles: CartoDB Dark Matter (free, no token, OSM/CARTO attribution).
// We use react-leaflet so the map gets real geography plus drag/zoom,
// rather than a stylized SVG silhouette.

const PinIcon = L.divIcon({
    className: '', // disable Leaflet's default class so our CSS owns it
    html: '<div class="member-map-pin" aria-hidden="true"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
});

// Curated demo roster — anonymized handles and city-level coordinates.
// Replace with `GET /networking/members/public` (opt-in roster) once
// the backend route exists; the schema mirrors what this component
// already renders.
const SAMPLE_MEMBERS = [
    { handle: 'alpha-quant', city: 'New York, US',     lat: 40.71,  lng: -74.00,  role: 'Quant' },
    { handle: 'bay-trader',  city: 'San Francisco, US', lat: 37.77,  lng: -122.42, role: 'Equities' },
    { handle: 'maple-desk',  city: 'Toronto, CA',      lat: 43.65,  lng: -79.38,  role: 'FX' },
    { handle: 'thames-pm',   city: 'London, UK',       lat: 51.51,  lng: -0.13,   role: 'Macro' },
    { handle: 'alpine-vol',  city: 'Zurich, CH',       lat: 47.37,  lng: 8.54,    role: 'Vol' },
    { handle: 'frankfurt-1', city: 'Frankfurt, DE',    lat: 50.11,  lng: 8.68,    role: 'Rates' },
    { handle: 'soko-trader', city: 'Lagos, NG',        lat: 6.52,   lng: 3.38,    role: 'Crypto' },
    { handle: 'mumbai-fx',   city: 'Mumbai, IN',       lat: 19.08,  lng: 72.88,   role: 'FX' },
    { handle: 'sg-systems',  city: 'Singapore, SG',    lat: 1.35,   lng: 103.82,  role: 'Systematic' },
    { handle: 'tokyo-prop',  city: 'Tokyo, JP',        lat: 35.68,  lng: 139.69,  role: 'Prop' },
    { handle: 'sydney-desk', city: 'Sydney, AU',       lat: -33.87, lng: 151.21,  role: 'Commodities' },
    { handle: 'paulista-1',  city: 'São Paulo, BR',    lat: -23.55, lng: -46.63,  role: 'EM' },
    { handle: 'dxb-prop',    city: 'Dubai, AE',        lat: 25.20,  lng: 55.27,   role: 'Energy' },
    { handle: 'hk-arb',      city: 'Hong Kong, HK',    lat: 22.32,  lng: 114.17,  role: 'Arb' },
];

const MemberMap = ({ members = SAMPLE_MEMBERS }) => {
    const positions = useMemo(
        () => members.map((m) => ({ ...m, position: [m.lat, m.lng] })),
        [members]
    );

    return (
        <div className="member-map-wrapper relative w-full h-full rounded-3xl overflow-hidden border border-white/5 bg-[#050810]">
            {/* Header strip — sits above the map. pointer-events relaxed so
                it doesn't swallow drag gestures inside the map container. */}
            <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-primary text-base">public</span>
                    <span className="text-[11px] uppercase tracking-widest font-bold text-white">
                        Community Map
                    </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#d946ef]" />
                        {positions.length} members visible
                    </span>
                </div>
            </div>

            <MapContainer
                center={[20, 0]}
                zoom={2}
                minZoom={2}
                maxZoom={10}
                scrollWheelZoom
                worldCopyJump
                style={{ width: '100%', height: '100%' }}
                // Keep the world from infinitely repeating left/right and
                // stop users from panning into grey void below the south
                // pole or above the north pole.
                maxBounds={[[-85, -180], [85, 180]]}
                maxBoundsViscosity={1}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {positions.map((m) => (
                    <Marker key={m.handle} position={m.position} icon={PinIcon}>
                        <Popup>
                            <div>
                                <p className="text-[12px] font-bold text-white mb-0.5">@{m.handle}</p>
                                <p className="text-[10px] text-text-muted">
                                    {m.city} · {m.role}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Privacy footer */}
            <div className="absolute bottom-0 left-0 right-0 z-[1000] flex items-center justify-between px-5 py-2.5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
                <span className="text-[9px] uppercase tracking-widest text-text-muted">
                    City-level · opt-in only · no PII
                </span>
                <span className="text-[9px] uppercase tracking-widest text-text-muted">
                    Sample roster
                </span>
            </div>
        </div>
    );
};

export default MemberMap;
