import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { hasFeature, requiredPlanFor, planLabel } from '../../lib/plan'

// Interactive 3D globe with live finance / geopolitical signal overlays.
// Ported in spirit from the preregister build. The shape of the WebGL
// scene (Earth sphere, atmosphere glow, orbital rings, satellite
// particles, hotspot dots, animated arcs, raycaster hover) is the same;
// the difference is that headlines are live — each hotspot pulls the
// latest matching story from /api/news instead of a hardcoded string.
//
// Mapping news → hotspot: each location declares a regex of regional /
// financial keywords. When the globe mounts and every 5 minutes after,
// we fetch the live news feed and pin the most recent matching headline
// to the corresponding hotspot. Anything that doesn't match keeps a
// neutral fallback so the HUD never reads as broken when the wires are
// quiet.

const HOTSPOTS_BASE = [
    {
        name: 'New York',
        lat: 40.71,
        lon: -74.01,
        color: '#d946ef',
        category: 'Financial Hub',
        keywords: /\b(fed|federal reserve|powell|wall street|nyse|s&p|nasdaq|dow|treasury yield|sec|fdic)\b/i,
        fallback: 'Fed minutes and Wall Street flows pinned here.',
        tickers: ['SPY', 'QQQ', 'DIA', 'JPM', 'GS'],
    },
    {
        name: 'London',
        lat: 51.51,
        lon: -0.13,
        color: '#d946ef',
        category: 'Financial Hub',
        keywords: /\b(bank of england|boe|bailey|ftse|gilt|sterling|gbp|lse|city of london)\b/i,
        fallback: 'BoE policy and FTSE / sterling commentary pinned here.',
        tickers: ['GBPUSD=X', 'EURGBP=X'],
    },
    {
        name: 'Tokyo',
        lat: 35.68,
        lon: 139.69,
        color: '#22d3ee',
        category: 'Asia-Pacific',
        keywords: /\b(bank of japan|boj|ueda|nikkei|topix|yen|jpy|japan)\b/i,
        fallback: 'BoJ policy, yen moves, and Nikkei prints pinned here.',
        tickers: ['USDJPY=X', 'EURJPY=X', 'GBPJPY=X'],
    },
    {
        name: 'Frankfurt',
        lat: 50.11,
        lon: 8.68,
        color: '#d946ef',
        category: 'Financial Hub',
        keywords: /\b(ecb|european central bank|lagarde|euro|eur|bund|dax|eurozone)\b/i,
        fallback: 'ECB rate path and DAX / euro flows pinned here.',
        tickers: ['EURUSD=X', 'EURGBP=X', 'EURJPY=X'],
    },
    {
        name: 'Riyadh',
        lat: 24.71,
        lon: 46.68,
        color: '#f59e0b',
        category: 'OPEC Region',
        keywords: /\b(opec|saudi|crude|brent|wti|oil price|mbs|aramco)\b/i,
        fallback: 'OPEC+ supply, crude pricing, and Aramco moves pinned here.',
        tickers: ['USO', 'XOM', 'CVX'],
    },
    {
        name: 'Shanghai',
        lat: 31.23,
        lon: 121.47,
        color: '#22d3ee',
        category: 'Asia-Pacific',
        keywords: /\b(china|pboc|yuan|cny|csi|shanghai|beijing|xi jinping|evergrande|property)\b/i,
        fallback: 'PBoC liquidity and China property / yuan signals pinned here.',
        tickers: ['BABA', 'BIDU', 'NIO'],
    },
    {
        name: 'Hong Kong',
        lat: 22.32,
        lon: 114.17,
        color: '#22d3ee',
        category: 'Asia-Pacific',
        keywords: /\b(hong kong|hang seng|hkma|hkd)\b/i,
        fallback: 'Hang Seng flows and HKD policy pinned here.',
        tickers: ['BABA', 'TCEHY'],
    },
    {
        name: 'Singapore',
        lat: 1.35,
        lon: 103.82,
        color: '#22d3ee',
        category: 'Asia-Pacific',
        keywords: /\b(singapore|mas|sgx|sgd|asean)\b/i,
        fallback: 'Singapore reserves, MAS policy, and ASEAN trade pinned here.',
        tickers: ['USDSGD=X'],
    },
    {
        name: 'Dubai',
        lat: 25.2,
        lon: 55.27,
        color: '#f59e0b',
        category: 'OPEC Region',
        keywords: /\b(uae|emirates|dubai|abu dhabi|adia)\b/i,
        fallback: 'UAE sovereign wealth + energy desk activity pinned here.',
        tickers: ['USO', 'XOM'],
    },
    {
        name: 'São Paulo',
        lat: -23.55,
        lon: -46.63,
        color: '#22c55e',
        category: 'Emerging Markets',
        keywords: /\b(brazil|brazilian|bovespa|real|brl|petrobras|lula)\b/i,
        fallback: 'Bovespa, real, and Brazil EM commentary pinned here.',
        tickers: ['EWZ', 'PBR', 'VALE'],
    },
    {
        name: 'Mumbai',
        lat: 19.08,
        lon: 72.88,
        color: '#22c55e',
        category: 'Emerging Markets',
        keywords: /\b(india|rbi|rupee|inr|sensex|nifty|modi)\b/i,
        fallback: 'RBI, rupee, and Nifty / Sensex moves pinned here.',
        tickers: ['INDA', 'INFY'],
    },
    {
        name: 'Moscow',
        lat: 55.75,
        lon: 37.62,
        color: '#ef4444',
        category: 'Conflict Zone',
        keywords: /\b(russia|kremlin|putin|ruble|rub|gazprom|sanction|moscow)\b/i,
        fallback: 'Sanctions, ruble flows, and Russia commodity desk pinned here.',
        tickers: ['USO', 'GLD'],
    },
    {
        name: 'Kyiv',
        lat: 50.43,
        lon: 30.52,
        color: '#ef4444',
        category: 'Conflict Zone',
        keywords: /\b(ukraine|kyiv|kiev|zelensky|ukrainian|grain corridor)\b/i,
        fallback: 'Ukraine front-line risk and grain corridor status pinned here.',
        tickers: ['DBA', 'WEAT'],
    },
    {
        name: 'Tel Aviv',
        lat: 32.07,
        lon: 34.78,
        color: '#ef4444',
        category: 'Conflict Zone',
        keywords: /\b(israel|gaza|netanyahu|idf|shekel|ils|tase|tel aviv)\b/i,
        fallback: 'Middle East risk premium and Israeli equities pinned here.',
        tickers: ['EIS', 'GLD', 'USO'],
    },
    {
        name: 'Lagos',
        lat: 6.52,
        lon: 3.38,
        color: '#22c55e',
        category: 'Emerging Markets',
        keywords: /\b(nigeria|naira|ngn|lagos|africa)\b/i,
        fallback: 'African energy supply, naira, and frontier flows pinned here.',
        tickers: ['EZA', 'XOM'],
    },
]

const CATEGORIES = ['Financial Hub', 'Asia-Pacific', 'OPEC Region', 'Conflict Zone', 'Emerging Markets']

// Arc connections between hotspots — purely decorative trade-route lines.
// Indexes reference HOTSPOTS_BASE order above.
const ARCS = [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 3], [1, 5], [2, 5], [2, 6],
    [2, 7], [3, 5], [4, 8], [5, 6], [9, 0], [10, 6], [11, 12], [12, 13],
    [13, 4], [14, 1], [3, 11], [10, 7],
]

function latLonToVec3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
    )
}

function createArcGeometry(from, to, segments = 64) {
    const points = []
    const mid = from.clone().add(to).multiplyScalar(0.5)
    const dist = from.distanceTo(to)
    mid.normalize().multiplyScalar(1 + dist * 0.2)
    for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const p = new THREE.Vector3()
        p.x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mid.x + t * t * to.x
        p.y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * mid.y + t * t * to.y
        p.z = (1 - t) * (1 - t) * from.z + 2 * (1 - t) * t * mid.z + t * t * to.z
        points.push(p)
    }
    return new THREE.BufferGeometry().setFromPoints(points)
}

function matchHotspots(headlines) {
    const now = Date.now()
    return HOTSPOTS_BASE.map((spot) => {
        const match = headlines.find((h) => spot.keywords.test(`${h.title} ${h.summary || ''}`))
        if (!match) {
            return { ...spot, headline: spot.fallback, source: 'standby', isLive: false, freshnessHours: null }
        }
        const publishedAt = match.publishedAt
        const ageMs = publishedAt ? now - new Date(publishedAt).getTime() : Number.POSITIVE_INFINITY
        const freshnessHours = Number.isFinite(ageMs) ? ageMs / 3_600_000 : null
        return {
            ...spot,
            headline: match.title,
            source: match.source,
            url: match.url,
            publishedAt,
            freshnessHours,
            isLive: true,
        }
    })
}

// Pulse intensity tier from a hotspot's freshness. Used by the
// animation loop to scale dot size, ring amplitude, and arc-traveler
// speed so the globe visibly "burns hotter" near recent events.
function intensityFor(spot) {
    if (!spot || !spot.isLive) return { tier: 'standby', amp: 0.35, speed: 1.3, scale: 0.85 }
    const h = spot.freshnessHours ?? 24
    if (h < 1) return { tier: 'breaking', amp: 1.1, speed: 3.4, scale: 1.4 }
    if (h < 6) return { tier: 'hot', amp: 0.85, speed: 2.4, scale: 1.25 }
    if (h < 24) return { tier: 'live', amp: 0.6, speed: 1.8, scale: 1.1 }
    return { tier: 'recent', amp: 0.45, speed: 1.4, scale: 1.0 }
}

// Convert lat/lon to the camera-target Y rotation that brings the
// hotspot to the front of the globe. The globe spins on Y, so we
// just need to negate the longitude (in radians) plus the running
// rotation offset accounted for in the animation loop.
function lonToYRotation(lon) {
    return -((lon + 180) * Math.PI) / 180 + Math.PI / 2
}

export default function GlobeMap({ height = 480 }) {
    const mountRef = useRef(null)
    const hotspotsRef = useRef(matchHotspots([]))
    const [hotspots, setHotspots] = useState(hotspotsRef.current)
    const [hovered, setHovered] = useState(null)
    const [activeIdx, setActiveIdx] = useState(0)
    const [selected, setSelected] = useState(null)
    const [categoryFilter, setCategoryFilter] = useState('All')

    // Tier gating. Unauthed visitors get the visual + hover; clicking
    // a hotspot sends them to the funnel. Free users see an upgrade
    // prompt. Pro unlocks click-to-drill + category filter. Ultimate
    // adds auto-pan camera.
    const { user, isAuthenticated } = useAuth()
    const canDrillDown = hasFeature(user, 'globe-drilldown')
    const canFilter = hasFeature(user, 'globe-filter')
    const canAutoPan = hasFeature(user, 'globe-autopan')
    const drillDownPlan = requiredPlanFor(user, 'globe-drilldown')
    const filterPlan = requiredPlanFor(user, 'globe-filter')
    const autoPanRef = useRef(false)
    autoPanRef.current = canAutoPan

    // Camera target Y rotation. The animation loop eases toward this
    // value when auto-pan is on. Updated whenever the active hotspot
    // changes — the cycling HUD doubles as the camera director.
    const cameraTargetRef = useRef(0)

    // Refs mirror the filter state so the WebGL animation loop can
    // read the latest values without re-binding when state changes.
    const canFilterRef = useRef(false)
    const categoryFilterRef = useRef('All')
    canFilterRef.current = canFilter
    categoryFilterRef.current = categoryFilter

    // Load live news on mount and refresh every 5 minutes.
    useEffect(() => {
        let active = true
        const refresh = async () => {
            try {
                const news = await api.get('/news')
                if (!active) return
                const headlines = Array.isArray(news) ? news : []
                const next = matchHotspots(headlines)
                hotspotsRef.current = next
                setHotspots(next)
            } catch {
                /* keep previous state — fallbacks already render */
            }
        }
        refresh()
        const id = setInterval(refresh, 5 * 60 * 1000)
        return () => {
            active = false
            clearInterval(id)
        }
    }, [])

    // Auto-cycle the active hotspot HUD. Prefers slots that hit a live
    // story so the headline stays interesting; falls back to plain
    // round-robin if none of the spots have live data yet. Respects the
    // category filter so Ultimate users watching only conflict zones
    // don't get pulled to the Fed every five seconds.
    useEffect(() => {
        const tick = () => {
            const visible = hotspots
                .map((h, i) => ({ h, i }))
                .filter(({ h }) => categoryFilter === 'All' || h.category === categoryFilter)
            if (visible.length === 0) return
            const live = visible.filter(({ h }) => h.isLive)
            const pool = live.length > 0 ? live : visible
            const next = pool[Math.floor(Math.random() * pool.length)]
            setActiveIdx(next.i)
        }
        const id = setInterval(tick, 4500)
        return () => clearInterval(id)
    }, [hotspots, categoryFilter])

    // When the active hotspot changes, point the camera at it. Just
    // updates the target — the animation loop does the easing so
    // turning auto-pan on/off doesn't need a re-render of the scene.
    useEffect(() => {
        const spot = hotspots[activeIdx]
        if (spot) cameraTargetRef.current = lonToYRotation(spot.lon)
    }, [activeIdx, hotspots])

    // Build the WebGL scene once. The hotspot dots and arcs reference the
    // mutable hotspotsRef so updates to live headlines re-tint dots
    // without a full scene rebuild.
    const sceneRefs = useMemo(() => {
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
        camera.position.z = 2.8

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x000000, 0)

        const textureLoader = new THREE.TextureLoader()
        textureLoader.setCrossOrigin('anonymous')
        const earthTex = textureLoader.load(
            'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
        )

        const globeGeo = new THREE.SphereGeometry(1, 64, 64)
        const globeMat = new THREE.MeshPhongMaterial({
            map: earthTex,
            color: 0xffffff,
            emissive: 0x110a24,
            shininess: 80,
            transparent: true,
            opacity: 0.95,
        })
        const globe = new THREE.Mesh(globeGeo, globeMat)
        scene.add(globe)

        const innerGeo = new THREE.SphereGeometry(0.98, 32, 32)
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0x110524,
            transparent: true,
            opacity: 0.8,
        })
        globe.add(new THREE.Mesh(innerGeo, innerMat))

        // Atmospheric glow — backside-rendered larger sphere.
        const atmGeo = new THREE.SphereGeometry(1.06, 64, 64)
        const atmMat = new THREE.MeshBasicMaterial({
            color: 0xd946ef,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
        })
        scene.add(new THREE.Mesh(atmGeo, atmMat))

        // Orbital rings.
        const rings = []
        const r1 = new THREE.Mesh(
            new THREE.TorusGeometry(1.2, 0.002, 16, 100),
            new THREE.MeshBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.35 }),
        )
        r1.rotation.x = Math.PI / 2
        scene.add(r1)
        rings.push(r1)
        const r2 = new THREE.Mesh(
            new THREE.TorusGeometry(1.4, 0.0015, 16, 100),
            new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.25 }),
        )
        r2.rotation.x = Math.PI / 3
        r2.rotation.y = Math.PI / 4
        scene.add(r2)
        rings.push(r2)

        // Satellite-like particle field above the globe surface.
        // Trimmed from the original 500 so the scene reads as
        // "atmospheric ambience" instead of "noisy snow."
        const particleCount = 220
        const particleGeo = new THREE.BufferGeometry()
        const particlePos = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount * 3; i += 3) {
            const r = 1.05 + Math.random() * 0.35
            const theta = 2 * Math.PI * Math.random()
            const phi = Math.acos(2 * Math.random() - 1)
            particlePos[i] = r * Math.sin(phi) * Math.cos(theta)
            particlePos[i + 1] = r * Math.sin(phi) * Math.sin(theta)
            particlePos[i + 2] = r * Math.cos(phi)
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
        const particles = new THREE.Points(
            particleGeo,
            new THREE.PointsMaterial({
                color: 0xd946ef,
                size: 0.015,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
            }),
        )
        scene.add(particles)

        // Lighting.
        scene.add(new THREE.AmbientLight(0xffffff, 0.6))
        const dLight = new THREE.DirectionalLight(0xd946ef, 2.5)
        dLight.position.set(5, 3, 5)
        scene.add(dLight)
        const dLight2 = new THREE.DirectionalLight(0x22d3ee, 1.5)
        dLight2.position.set(-5, -3, -5)
        scene.add(dLight2)

        // Hotspot dots + pulse rings + outer "shockwave" rings that
        // expand and fade out for breaking events. Three layers per
        // hotspot give us a fast-pulse / steady-pulse / shockwave
        // hierarchy that scales naturally with freshness.
        const dots = []
        const pulseRings = []
        const shockwaveRings = []
        HOTSPOTS_BASE.forEach((hotspot, idx) => {
            const pos = latLonToVec3(hotspot.lat, hotspot.lon, 1.01)
            const dot = new THREE.Mesh(
                new THREE.SphereGeometry(0.014, 12, 12),
                new THREE.MeshBasicMaterial({ color: new THREE.Color(hotspot.color) }),
            )
            dot.position.copy(pos)
            dot.userData = { idx }
            scene.add(dot)
            dots.push(dot)

            const pulseRing = new THREE.Mesh(
                new THREE.RingGeometry(0.018, 0.022, 24),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color(hotspot.color),
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide,
                }),
            )
            pulseRing.position.copy(pos)
            pulseRing.lookAt(new THREE.Vector3(0, 0, 0))
            scene.add(pulseRing)
            pulseRings.push(pulseRing)

            // Outer shockwave: invisible most of the time, expands and
            // fades for live hotspots. The animation loop offsets each
            // ring's wave by index so they don't all detonate in unison.
            const shock = new THREE.Mesh(
                new THREE.RingGeometry(0.022, 0.026, 32),
                new THREE.MeshBasicMaterial({
                    color: new THREE.Color(hotspot.color),
                    transparent: true,
                    opacity: 0,
                    side: THREE.DoubleSide,
                }),
            )
            shock.position.copy(pos)
            shock.lookAt(new THREE.Vector3(0, 0, 0))
            shock.userData = { phaseOffset: idx * 0.7 }
            scene.add(shock)
            shockwaveRings.push(shock)
        })

        // Arcs + a "traveler" sphere riding along each one. The
        // traveler is what makes the globe feel like data is actually
        // flowing — opacity-pulsing static lines feel decorative, a
        // moving glowing dot feels like a packet.
        const arcs = []
        const arcProgress = []
        const arcTravelers = []
        const arcEndpoints = []
        ARCS.forEach(([a, b]) => {
            if (!HOTSPOTS_BASE[a] || !HOTSPOTS_BASE[b]) return
            const from = latLonToVec3(HOTSPOTS_BASE[a].lat, HOTSPOTS_BASE[a].lon, 1.01)
            const to = latLonToVec3(HOTSPOTS_BASE[b].lat, HOTSPOTS_BASE[b].lon, 1.01)
            const mid = from.clone().add(to).multiplyScalar(0.5)
            const dist = from.distanceTo(to)
            mid.normalize().multiplyScalar(1 + dist * 0.2)

            const line = new THREE.Line(
                createArcGeometry(from, to),
                new THREE.LineBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.4 }),
            )
            scene.add(line)
            arcs.push(line)
            arcProgress.push({ value: Math.random(), speed: 0.003 + Math.random() * 0.004 })
            arcEndpoints.push({ a, b, from, to, mid })

            const traveler = new THREE.Mesh(
                new THREE.SphereGeometry(0.012, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: 0xd946ef,
                    transparent: true,
                    opacity: 0.95,
                    blending: THREE.AdditiveBlending,
                }),
            )
            scene.add(traveler)
            arcTravelers.push(traveler)
        })

        return {
            scene,
            camera,
            renderer,
            globe,
            arcs,
            arcProgress,
            arcTravelers,
            arcEndpoints,
            dots,
            pulseRings,
            shockwaveRings,
            rings,
            particles,
        }
    }, [])

    // Mount + resize + animation loop. Single useEffect keeps cleanup tidy.
    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return
        const {
            scene,
            camera,
            renderer,
            globe,
            arcs,
            arcProgress,
            arcTravelers,
            arcEndpoints,
            dots,
            pulseRings,
            shockwaveRings,
            rings,
            particles,
        } = sceneRefs

        mount.appendChild(renderer.domElement)
        const setSize = () => {
            const w = mount.clientWidth
            const h = mount.clientHeight
            renderer.setSize(w, h)
            camera.aspect = w / h
            camera.updateProjectionMatrix()
        }
        setSize()

        const raycaster = new THREE.Raycaster()
        const mouseVec = new THREE.Vector2()

        const handleMove = (e) => {
            const rect = mount.getBoundingClientRect()
            mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouseVec, camera)
            const hits = raycaster.intersectObjects(dots)
            if (hits.length > 0) {
                const idx = hits[0].object.userData.idx
                const spot = hotspotsRef.current[idx]
                setHovered({
                    ...spot,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                })
                mount.style.cursor = 'pointer'
            } else {
                setHovered(null)
                mount.style.cursor = 'default'
            }
        }
        const handleLeave = () => setHovered(null)
        const handleClick = (e) => {
            const rect = mount.getBoundingClientRect()
            mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouseVec, camera)
            const hits = raycaster.intersectObjects(dots)
            if (hits.length === 0) return
            const idx = hits[0].object.userData.idx
            const spot = hotspotsRef.current[idx]
            // Selection always opens — the panel itself shows the
            // upgrade prompt for non-eligible viewers. Keeps the
            // interaction discoverable even on the gated path.
            setSelected(spot)
        }
        mount.addEventListener('mousemove', handleMove)
        mount.addEventListener('mouseleave', handleLeave)
        mount.addEventListener('click', handleClick)

        let animId
        let t = 0
        const animate = () => {
            animId = requestAnimationFrame(animate)
            t += 0.005

            // Idle drift, plus a gentle ease toward the active
            // hotspot when auto-pan is on (Ultimate). Easing factor
            // is small enough the rotation feels intentional rather
            // than mechanical.
            if (autoPanRef.current) {
                const target = cameraTargetRef.current
                const current = globe.rotation.y % (Math.PI * 2)
                let diff = target - current
                while (diff > Math.PI) diff -= Math.PI * 2
                while (diff < -Math.PI) diff += Math.PI * 2
                globe.rotation.y += diff * 0.012 + 0.0006
            } else {
                globe.rotation.y += 0.002
            }

            // Arcs whose endpoints are both live get full opacity +
            // their traveler sphere. Dead arcs dim almost out of sight
            // so the visible web reads as "where data is moving right
            // now" rather than a static decoration.
            arcs.forEach((arc, i) => {
                const ep = arcEndpoints[i]
                if (!ep) return
                const aSpot = hotspotsRef.current[ep.a]
                const bSpot = hotspotsRef.current[ep.b]
                const matchesFilterA =
                    !aSpot ||
                    !canFilterRef.current ||
                    categoryFilterRef.current === 'All' ||
                    aSpot.category === categoryFilterRef.current
                const matchesFilterB =
                    !bSpot ||
                    !canFilterRef.current ||
                    categoryFilterRef.current === 'All' ||
                    bSpot.category === categoryFilterRef.current
                const matches = matchesFilterA && matchesFilterB
                const liveBoth = aSpot?.isLive && bSpot?.isLive
                const intensity = liveBoth
                    ? Math.max(intensityFor(aSpot).speed, intensityFor(bSpot).speed)
                    : 0.6
                arcProgress[i].speed = liveBoth
                    ? 0.005 + intensity * 0.002
                    : 0.0015
                arcProgress[i].value += arcProgress[i].speed
                if (arcProgress[i].value > 1) arcProgress[i].value = 0
                const baseOpacity = liveBoth ? 0.65 : 0.18
                arc.material.opacity = matches
                    ? baseOpacity + 0.25 * Math.sin(arcProgress[i].value * Math.PI)
                    : 0.04
                arc.rotation.y = globe.rotation.y

                // Traveler position along the bezier curve (from → mid → to).
                const tr = arcTravelers[i]
                if (tr) {
                    const u = arcProgress[i].value
                    const ux = (1 - u) * (1 - u) * ep.from.x + 2 * (1 - u) * u * ep.mid.x + u * u * ep.to.x
                    const uy = (1 - u) * (1 - u) * ep.from.y + 2 * (1 - u) * u * ep.mid.y + u * u * ep.to.y
                    const uz = (1 - u) * (1 - u) * ep.from.z + 2 * (1 - u) * u * ep.mid.z + u * u * ep.to.z
                    tr.position.set(ux, uy, uz)
                    tr.rotation.y = globe.rotation.y
                    tr.material.opacity = liveBoth && matches ? 0.95 : 0
                    // Tint the traveler the destination color so the
                    // direction of flow reads at a glance.
                    if (bSpot) tr.material.color.set(bSpot.color)
                    const trScale = liveBoth ? 1 + 0.35 * Math.sin(t * 4 + i) : 0.5
                    tr.scale.setScalar(trScale)
                }
            })

            dots.forEach((dot, i) => {
                dot.rotation.y = globe.rotation.y
                const spot = hotspotsRef.current[i]
                const matchesFilter =
                    !spot ||
                    !canFilterRef.current ||
                    categoryFilterRef.current === 'All' ||
                    spot.category === categoryFilterRef.current
                const dimmed = !matchesFilter
                const intensity = intensityFor(spot)
                // Breaking events pulse the dot itself, not just the ring.
                const dotPulse =
                    spot && spot.isLive
                        ? 1 + 0.18 * Math.sin(t * intensity.speed * 2)
                        : 1
                const filterScale = dimmed ? 0.55 : 1
                dot.scale.setScalar(intensity.scale * dotPulse * filterScale)
                if (dot.material) {
                    dot.material.opacity = dimmed ? 0.22 : 1
                    dot.material.transparent = true
                }
            })

            pulseRings.forEach((ring, i) => {
                ring.rotation.y = globe.rotation.y
                const spot = hotspotsRef.current[i]
                const matchesFilter =
                    !spot ||
                    !canFilterRef.current ||
                    categoryFilterRef.current === 'All' ||
                    spot.category === categoryFilterRef.current
                const intensity = intensityFor(spot)
                const pulse = 1 + intensity.amp * Math.sin(t * intensity.speed + i)
                ring.scale.set(pulse, pulse, pulse)
                const baseOpacity = spot && spot.isLive ? 0.6 : 0.22
                ring.material.opacity = matchesFilter
                    ? baseOpacity + 0.25 * Math.cos(t * intensity.speed + i)
                    : 0.04
            })

            // Shockwaves — only render meaningfully for live hotspots,
            // and only the breaking-tier ones get the wide expanding
            // wave. Each ring is offset by its phase so the detonations
            // are staggered around the globe instead of all firing at
            // the same beat.
            shockwaveRings.forEach((ring, i) => {
                ring.rotation.y = globe.rotation.y
                const spot = hotspotsRef.current[i]
                if (!spot || !spot.isLive) {
                    ring.material.opacity = 0
                    return
                }
                const matchesFilter =
                    !canFilterRef.current ||
                    categoryFilterRef.current === 'All' ||
                    spot.category === categoryFilterRef.current
                const intensity = intensityFor(spot)
                if (intensity.tier === 'breaking' || intensity.tier === 'hot') {
                    const phase = (t * 1.4 + (ring.userData.phaseOffset || 0)) % 2.5
                    if (phase < 1.5) {
                        const expand = 1 + phase * 4
                        ring.scale.set(expand, expand, expand)
                        ring.material.opacity = matchesFilter ? Math.max(0, 0.5 - phase * 0.35) : 0
                    } else {
                        ring.material.opacity = 0
                    }
                } else {
                    ring.material.opacity = 0
                }
            })
            if (rings[0]) rings[0].rotation.z -= 0.002
            if (rings[1]) rings[1].rotation.z += 0.0015
            if (particles) {
                particles.rotation.y += 0.001
                particles.rotation.z += 0.0005
            }

            renderer.render(scene, camera)
        }
        animate()

        const ro = new ResizeObserver(setSize)
        ro.observe(mount)

        return () => {
            cancelAnimationFrame(animId)
            ro.disconnect()
            mount.removeEventListener('mousemove', handleMove)
            mount.removeEventListener('mouseleave', handleLeave)
            mount.removeEventListener('click', handleClick)
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
            renderer.dispose()
        }
    }, [sceneRefs])

    const active = hotspots[activeIdx] || hotspots[0]
    const liveCount = hotspots.filter((h) => h.isLive).length
    const breakingCount = hotspots.filter((h) => intensityFor(h).tier === 'breaking').length

    return (
        <div
            className="relative w-full bg-[#050505] rounded-2xl border border-white/5 overflow-hidden"
            style={{ height }}
        >
            <div ref={mountRef} className="w-full h-full" />

            {/* Header label + live ticker counters */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d946ef] animate-pulse shadow-[0_0_8px_#d946ef]" />
                <span className="text-[#d946ef] text-[9px] font-bold tracking-widest uppercase">
                    Global Situational Awareness
                </span>
                <span className="text-[8px] uppercase tracking-widest font-bold text-[#22d3ee] bg-[#22d3ee]/10 border border-[#22d3ee]/30 px-1.5 py-0.5 rounded tabular-nums">
                    {liveCount} live
                </span>
                {breakingCount > 0 && (
                    <span className="text-[8px] uppercase tracking-widest font-bold text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/30 px-1.5 py-0.5 rounded animate-pulse">
                        {breakingCount} breaking
                    </span>
                )}
                {canAutoPan && (
                    <span className="text-[8px] uppercase tracking-widest font-bold text-[#22d3ee] bg-[#22d3ee]/10 border border-[#22d3ee]/30 px-1.5 py-0.5 rounded">
                        Auto-pan
                    </span>
                )}
            </div>

            {/* Filter chips — Pro+ feature. Free / anonymous viewers
                see them disabled with an upgrade hint, so the gate is
                visible rather than hidden. */}
            <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5 max-w-[60%] justify-end pointer-events-auto">
                {['All', ...CATEGORIES].map((cat) => {
                    const active = categoryFilter === cat
                    return (
                        <button
                            key={cat}
                            disabled={!canFilter}
                            onClick={() => canFilter && setCategoryFilter(cat)}
                            title={
                                canFilter
                                    ? `Filter to ${cat}`
                                    : `Filter is a ${planLabel(filterPlan)} feature`
                            }
                            className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border transition-colors ${
                                active
                                    ? 'bg-[#d946ef] text-white border-[#d946ef]'
                                    : 'bg-white/5 text-[#a1a1aa] border-white/10 hover:bg-white/10'
                            } ${!canFilter ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {cat}
                        </button>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
                {[
                    { color: '#d946ef', label: 'Financial Hub' },
                    { color: '#ef4444', label: 'Conflict Zone' },
                    { color: '#f59e0b', label: 'OPEC Region' },
                    { color: '#22d3ee', label: 'Asia-Pacific' },
                    { color: '#22c55e', label: 'Emerging Markets' },
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[#71717a] text-[9px] tracking-wide">{label}</span>
                    </div>
                ))}
            </div>

            {/* Auto-cycling Active Signal HUD */}
            {active && (
                <div className="absolute top-10 left-3 max-w-[260px] pointer-events-none">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${active.name}-${active.headline}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col gap-1.5 p-3 rounded-xl border border-[#26262f]/60 bg-[rgba(10,10,18,0.7)] backdrop-blur-md"
                            style={{ borderLeftColor: active.color, borderLeftWidth: '2px' }}
                        >
                            <div className="flex items-center gap-1.5 border-b border-[#26262f]/80 pb-1.5">
                                <span
                                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                                    style={{
                                        backgroundColor: active.color,
                                        boxShadow: `0 0 6px ${active.color}`,
                                    }}
                                />
                                <span className="text-white text-[9px] font-black tracking-widest uppercase truncate">
                                    {active.name}
                                </span>
                                <span
                                    className="ml-auto text-[8px] font-mono tracking-widest uppercase"
                                    style={{
                                        color: active.isLive
                                            ? intensityFor(active).tier === 'breaking'
                                                ? '#ef4444'
                                                : '#22d3ee'
                                            : '#71717a',
                                    }}
                                >
                                    {active.isLive ? intensityFor(active).tier : 'standby'}
                                </span>
                            </div>
                            <p className="text-[#d4d4d8] text-[10px] leading-relaxed font-medium line-clamp-3">
                                {active.headline}
                            </p>
                            {active.source && active.isLive && (
                                <span className="text-[8px] uppercase tracking-widest text-[#71717a]">
                                    {active.source}
                                </span>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            {/* Click drill-down panel. Renders for any visitor who clicks
                a dot — Pro+ get the full payload (related tickers,
                source link, "Track these tickers" CTA), Free / anon get
                an upgrade prompt with the same headline so the value of
                the gate is concrete. */}
            <AnimatePresence>
                {selected && (
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="absolute top-12 right-3 w-[280px] max-h-[85%] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(8,8,16,0.92)] backdrop-blur-xl p-5 shadow-2xl z-30"
                    >
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <div
                                    className="text-[9px] uppercase tracking-widest font-bold mb-1"
                                    style={{ color: selected.color }}
                                >
                                    {selected.category}
                                </div>
                                <div className="text-white text-lg font-bold">{selected.name}</div>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                aria-label="Close"
                                className="text-text-muted hover:text-white w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5"
                            >
                                <span className="material-icons text-base">close</span>
                            </button>
                        </div>

                        <div
                            className="border-l-2 pl-3 mb-4"
                            style={{ borderColor: selected.color }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span
                                    className="text-[8px] font-mono uppercase tracking-widest font-bold"
                                    style={{ color: selected.isLive ? '#22d3ee' : '#71717a' }}
                                >
                                    {selected.isLive ? 'Live wire' : 'Standby'}
                                </span>
                                {selected.publishedAt && selected.isLive && (
                                    <span className="text-[8px] text-text-muted">
                                        {new Date(selected.publishedAt).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                )}
                            </div>
                            <p className="text-[#d4d4d8] text-xs leading-relaxed">
                                {selected.headline}
                            </p>
                            {selected.url && selected.isLive && (
                                <a
                                    href={selected.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-[10px] text-primary hover:underline"
                                >
                                    Open source
                                    <span className="material-icons text-xs">open_in_new</span>
                                </a>
                            )}
                        </div>

                        {/* Related tickers — Pro+ only. Free path swaps
                            the grid for an upgrade prompt; the panel
                            stays open so the visitor can compare what
                            they'd unlock against the headline above. */}
                        {canDrillDown ? (
                            <>
                                {selected.tickers && selected.tickers.length > 0 && (
                                    <>
                                        <div className="text-[9px] uppercase tracking-widest text-text-muted font-bold mb-2">
                                            Tickers exposed
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5 mb-3">
                                            {selected.tickers.map((t) => (
                                                <Link
                                                    key={t}
                                                    to={`/t/${t}`}
                                                    className="text-center text-xs font-mono text-white bg-white/5 border border-white/10 rounded-md px-2 py-1.5 hover:bg-white/10 hover:border-primary/40 transition-colors"
                                                >
                                                    {t}
                                                </Link>
                                            ))}
                                        </div>
                                    </>
                                )}
                                <Link
                                    to="/insider"
                                    className="block text-center text-[10px] uppercase tracking-widest font-bold text-primary border border-primary/30 bg-primary/10 rounded-full px-3 py-2 hover:bg-primary/20 transition-colors"
                                >
                                    See live insider activity →
                                </Link>
                            </>
                        ) : (
                            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                                <div className="text-[9px] uppercase tracking-widest text-primary font-bold mb-2">
                                    {planLabel(drillDownPlan)} feature
                                </div>
                                <p className="text-text-secondary text-xs leading-relaxed mb-3">
                                    Drill into related tickers, source links, and an action path
                                    on every hotspot.
                                </p>
                                <Link
                                    to={isAuthenticated ? `/upgrade?to=${drillDownPlan}` : '/funnel'}
                                    className="inline-block text-[10px] uppercase tracking-widest font-bold text-white bg-primary rounded-full px-4 py-2 hover:bg-primary-dark transition-colors"
                                >
                                    Unlock with {planLabel(drillDownPlan)}
                                </Link>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hover tooltip */}
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute pointer-events-none z-50 flex flex-col gap-1 px-3 py-2 bg-[rgba(10,10,18,0.95)] backdrop-blur-xl border border-[#26262f] rounded-lg shadow-xl w-[230px]"
                        style={{ left: hovered.x + 15, top: hovered.y + 15 }}
                    >
                        <div className="flex items-center gap-1.5 border-b border-[#26262f]/80 pb-1.5 mb-1">
                            <span
                                className="w-1.5 h-1.5 rounded-full animate-pulse"
                                style={{
                                    backgroundColor: hovered.color,
                                    boxShadow: `0 0 6px ${hovered.color}`,
                                }}
                            />
                            <span className="text-white text-[10px] font-black tracking-widest uppercase truncate">
                                {hovered.name}
                            </span>
                        </div>
                        <p className="text-[#a1a1aa] text-[9px] leading-snug font-medium line-clamp-3 mb-1">
                            {hovered.headline}
                        </p>
                        <div className="flex justify-between items-center gap-4 mt-auto pt-1 border-t border-[#26262f]/40">
                            <span className="text-[#71717a] text-[8px] uppercase tracking-wide">
                                {hovered.category}
                            </span>
                            <span
                                className="text-[9px] font-bold uppercase"
                                style={{ color: hovered.isLive ? '#22d3ee' : '#71717a' }}
                            >
                                {hovered.isLive ? 'Live' : 'Standby'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
