// Curated list of major financial / trading hub cities.
//
// The opt-in form posts city + lat/lng straight from this table to the
// API, so we never have to geocode user-typed strings server-side. Add
// to this file rather than letting the form accept free-text — invalid
// coordinates would land in the public roster and the threat model is
// "user can put themselves anywhere on the map" if we let them.
//
// Coordinates are city centroids, rounded to two decimals (~1km), which
// is the right resolution for "city-level only" privacy framing.

const CITIES = [
    { city: 'New York',      country: 'US', lat: 40.71,  lng: -74.00 },
    { city: 'San Francisco', country: 'US', lat: 37.77,  lng: -122.42 },
    { city: 'Chicago',       country: 'US', lat: 41.88,  lng: -87.63 },
    { city: 'Boston',        country: 'US', lat: 42.36,  lng: -71.06 },
    { city: 'Miami',         country: 'US', lat: 25.76,  lng: -80.19 },
    { city: 'Los Angeles',   country: 'US', lat: 34.05,  lng: -118.24 },
    { city: 'Toronto',       country: 'CA', lat: 43.65,  lng: -79.38 },
    { city: 'Montreal',      country: 'CA', lat: 45.50,  lng: -73.57 },
    { city: 'Mexico City',   country: 'MX', lat: 19.43,  lng: -99.13 },
    { city: 'São Paulo',     country: 'BR', lat: -23.55, lng: -46.63 },
    { city: 'Buenos Aires',  country: 'AR', lat: -34.61, lng: -58.38 },
    { city: 'London',        country: 'UK', lat: 51.51,  lng: -0.13 },
    { city: 'Edinburgh',     country: 'UK', lat: 55.95,  lng: -3.19 },
    { city: 'Dublin',        country: 'IE', lat: 53.35,  lng: -6.26 },
    { city: 'Paris',         country: 'FR', lat: 48.86,  lng: 2.35 },
    { city: 'Frankfurt',     country: 'DE', lat: 50.11,  lng: 8.68 },
    { city: 'Berlin',        country: 'DE', lat: 52.52,  lng: 13.41 },
    { city: 'Amsterdam',     country: 'NL', lat: 52.37,  lng: 4.90 },
    { city: 'Brussels',      country: 'BE', lat: 50.85,  lng: 4.35 },
    { city: 'Zurich',        country: 'CH', lat: 47.37,  lng: 8.54 },
    { city: 'Geneva',        country: 'CH', lat: 46.20,  lng: 6.14 },
    { city: 'Milan',         country: 'IT', lat: 45.46,  lng: 9.19 },
    { city: 'Madrid',        country: 'ES', lat: 40.42,  lng: -3.70 },
    { city: 'Barcelona',     country: 'ES', lat: 41.39,  lng: 2.17 },
    { city: 'Lisbon',        country: 'PT', lat: 38.72,  lng: -9.14 },
    { city: 'Stockholm',     country: 'SE', lat: 59.33,  lng: 18.07 },
    { city: 'Oslo',          country: 'NO', lat: 59.91,  lng: 10.75 },
    { city: 'Copenhagen',    country: 'DK', lat: 55.68,  lng: 12.57 },
    { city: 'Helsinki',      country: 'FI', lat: 60.17,  lng: 24.94 },
    { city: 'Warsaw',        country: 'PL', lat: 52.23,  lng: 21.01 },
    { city: 'Prague',        country: 'CZ', lat: 50.08,  lng: 14.44 },
    { city: 'Vienna',        country: 'AT', lat: 48.21,  lng: 16.37 },
    { city: 'Budapest',      country: 'HU', lat: 47.50,  lng: 19.04 },
    { city: 'Athens',        country: 'GR', lat: 37.98,  lng: 23.73 },
    { city: 'Istanbul',      country: 'TR', lat: 41.01,  lng: 28.98 },
    { city: 'Tel Aviv',      country: 'IL', lat: 32.07,  lng: 34.78 },
    { city: 'Dubai',         country: 'AE', lat: 25.20,  lng: 55.27 },
    { city: 'Abu Dhabi',     country: 'AE', lat: 24.47,  lng: 54.37 },
    { city: 'Doha',          country: 'QA', lat: 25.29,  lng: 51.53 },
    { city: 'Riyadh',        country: 'SA', lat: 24.71,  lng: 46.68 },
    { city: 'Cairo',         country: 'EG', lat: 30.04,  lng: 31.24 },
    { city: 'Lagos',         country: 'NG', lat: 6.52,   lng: 3.38 },
    { city: 'Nairobi',       country: 'KE', lat: -1.29,  lng: 36.82 },
    { city: 'Johannesburg',  country: 'ZA', lat: -26.20, lng: 28.05 },
    { city: 'Cape Town',     country: 'ZA', lat: -33.92, lng: 18.42 },
    { city: 'Mumbai',        country: 'IN', lat: 19.08,  lng: 72.88 },
    { city: 'Delhi',         country: 'IN', lat: 28.61,  lng: 77.21 },
    { city: 'Bangalore',     country: 'IN', lat: 12.97,  lng: 77.59 },
    { city: 'Singapore',     country: 'SG', lat: 1.35,   lng: 103.82 },
    { city: 'Kuala Lumpur',  country: 'MY', lat: 3.14,   lng: 101.69 },
    { city: 'Bangkok',       country: 'TH', lat: 13.76,  lng: 100.50 },
    { city: 'Jakarta',       country: 'ID', lat: -6.21,  lng: 106.85 },
    { city: 'Manila',        country: 'PH', lat: 14.60,  lng: 120.98 },
    { city: 'Hong Kong',     country: 'HK', lat: 22.32,  lng: 114.17 },
    { city: 'Shanghai',      country: 'CN', lat: 31.23,  lng: 121.47 },
    { city: 'Beijing',       country: 'CN', lat: 39.90,  lng: 116.41 },
    { city: 'Shenzhen',      country: 'CN', lat: 22.54,  lng: 114.06 },
    { city: 'Taipei',        country: 'TW', lat: 25.03,  lng: 121.57 },
    { city: 'Seoul',         country: 'KR', lat: 37.57,  lng: 126.98 },
    { city: 'Tokyo',         country: 'JP', lat: 35.68,  lng: 139.69 },
    { city: 'Osaka',         country: 'JP', lat: 34.69,  lng: 135.50 },
    { city: 'Sydney',        country: 'AU', lat: -33.87, lng: 151.21 },
    { city: 'Melbourne',     country: 'AU', lat: -37.81, lng: 144.96 },
    { city: 'Auckland',      country: 'NZ', lat: -36.85, lng: 174.76 },
];

export const CITY_OPTIONS = CITIES.map((c) => ({
    ...c,
    label: `${c.city}, ${c.country}`,
    // Stable lookup key — avoids ambiguity for any two cities sharing
    // a name (none in the current list, but defensive).
    value: `${c.city}|${c.country}`,
}));

export const findCity = (value) => CITY_OPTIONS.find((c) => c.value === value);

export const ROLE_OPTIONS = [
    'Macro',
    'Quant',
    'Equities',
    'FX',
    'Rates',
    'Vol',
    'Crypto',
    'Commodities',
    'Energy',
    'Systematic',
    'Prop',
    'EM',
    'Arb',
    'Discretionary',
    'Researcher',
    'Member',
];
