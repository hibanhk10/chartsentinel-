import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import api from '../../services/api'

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
    },
    {
        name: 'London',
        lat: 51.51,
        lon: -0.13,
        color: '#d946ef',
        category: 'Financial Hub',
        keywords: /\b(bank of england|boe|bailey|ftse|gilt|sterling|gbp|lse|city of london)\b/i,
        fallback: 'BoE policy and FTSE / sterling commentary pinned here.',
    },
    {
        name: 'Tokyo',
        lat: 35.68,
        lon: 139.69,
        color: '#22d3ee',
        category: 'Asia-Pacific',
        keywords: /\b(bank of japan|boj|ueda|nikkei|topix|yen|jpy|japan)\b/i,
        fallback: 'BoJ policy, yen moves, and Nikkei prints pinned here.',
    },
    {
        name: 'Frankfurt',
        lat: 50.11,
        lon: 8.68,
        color: '#d946ef',
        category: 'Financial Hub',
        keywords: /\b(ecb|european central bank|lagarde|euro|eur|bund|dax|eurozone)\b/i,
        fallback: 'ECB rate path and DAX / euro flows pinned here.',
    },
    {
        name: 'Riyadh',
        lat: 24.71,
        lon: 46.68,
        color: '#f59e0b',
        category: 'OPEC Region',
        keywords: /\b(opec|saudi|crude|brent|wti|oil price|mbs|aramco)\b/i,
        fallback: 'OPEC+ supply, crude pricing, and Aramco moves pinned here.',
    },
    {
        name: 'Shanghai',
        lat: 31.23,
        lon: 121.47,
        color: '#22d3ee',
        category: 'Asia-Pacific',
        keywords: /\b(china|pboc|yuan|cny|csi|shanghai|beijing|xi jinping|evergrande|property)\b/i,
        fallback: 'PBoC liquidity and China property / yuan signals pinned here.',
    },
    {
        name: 'Hong Kong',
        lat: 22.32,
        lon: 114.17,
        color: '#22d3ee',
        category: 'Asia-Pacific',
        keywords: /\b(hong kong|hang seng|hkma|hkd)\b/i,
        fallback: 'Hang Seng flows and HKD policy pinned here.',
    },
    {
        name: 'Singapore',
        lat: 1.35,
        lon: 103.82,
        color: '#22d3ee',
        category: 'Asia-Pacific',
        keywords: /\b(singapore|mas|sgx|sgd|asean)\b/i,
        fallback: 'Singapore reserves, MAS policy, and ASEAN trade pinned here.',
    },
    {
        name: 'Dubai',
        lat: 25.2,
        lon: 55.27,
        color: '#f59e0b',
        category: 'OPEC Region',
        keywords: /\b(uae|emirates|dubai|abu dhabi|adia)\b/i,
        fallback: 'UAE sovereign wealth + energy desk activity pinned here.',
    },
    {
        name: 'São Paulo',
        lat: -23.55,
        lon: -46.63,
        color: '#22c55e',
        category: 'Emerging Markets',
        keywords: /\b(brazil|brazilian|bovespa|real|brl|petrobras|lula)\b/i,
        fallback: 'Bovespa, real, and Brazil EM commentary pinned here.',
    },
    {
        name: 'Mumbai',
        lat: 19.08,
        lon: 72.88,
        color: '#22c55e',
        category: 'Emerging Markets',
        keywords: /\b(india|rbi|rupee|inr|sensex|nifty|modi)\b/i,
        fallback: 'RBI, rupee, and Nifty / Sensex moves pinned here.',
    },
    {
        name: 'Moscow',
        lat: 55.75,
        lon: 37.62,
        color: '#ef4444',
        category: 'Conflict Zone',
        keywords: /\b(russia|kremlin|putin|ruble|rub|gazprom|sanction|moscow)\b/i,
        fallback: 'Sanctions, ruble flows, and Russia commodity desk pinned here.',
    },
    {
        name: 'Kyiv',
        lat: 50.43,
        lon: 30.52,
        color: '#ef4444',
        category: 'Conflict Zone',
        keywords: /\b(ukraine|kyiv|kiev|zelensky|ukrainian|grain corridor)\b/i,
        fallback: 'Ukraine front-line risk and grain corridor status pinned here.',
    },
    {
        name: 'Tel Aviv',
        lat: 32.07,
        lon: 34.78,
        color: '#ef4444',
        category: 'Conflict Zone',
        keywords: /\b(israel|gaza|netanyahu|idf|shekel|ils|tase|tel aviv)\b/i,
        fallback: 'Middle East risk premium and Israeli equities pinned here.',
    },
    {
        name: 'Lagos',
        lat: 6.52,
        lon: 3.38,
        color: '#22c55e',
        category: 'Emerging Markets',
        keywords: /\b(nigeria|naira|ngn|lagos|africa)\b/i,
        fallback: 'African energy supply, naira, and frontier flows pinned here.',
    },
]

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
    return HOTSPOTS_BASE.map((spot) => {
        const match = headlines.find((h) => spot.keywords.test(`${h.title} ${h.summary || ''}`))
        return match
            ? {
                  ...spot,
                  headline: match.title,
                  source: match.source,
                  url: match.url,
                  isLive: true,
              }
            : { ...spot, headline: spot.fallback, source: 'standby', isLive: false }
    })
}

export default function GlobeMap({ height = 480 }) {
    const mountRef = useRef(null)
    const hotspotsRef = useRef(matchHotspots([]))
    const [hotspots, setHotspots] = useState(hotspotsRef.current)
    const [hovered, setHovered] = useState(null)
    const [activeIdx, setActiveIdx] = useState(0)

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
    // round-robin if none of the spots have live data yet.
    useEffect(() => {
        const tick = () => {
            const liveIdxs = hotspots
                .map((h, i) => (h.isLive ? i : null))
                .filter((i) => i !== null)
            if (liveIdxs.length > 0) {
                setActiveIdx(liveIdxs[Math.floor(Math.random() * liveIdxs.length)])
            } else {
                setActiveIdx((prev) => (prev + 1) % hotspots.length)
            }
        }
        const id = setInterval(tick, 4500)
        return () => clearInterval(id)
    }, [hotspots])

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
        const particleCount = 500
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

        // Hotspot dots + pulse rings.
        const dots = []
        const pulseRings = []
        HOTSPOTS_BASE.forEach((hotspot, idx) => {
            const pos = latLonToVec3(hotspot.lat, hotspot.lon, 1.01)
            const dot = new THREE.Mesh(
                new THREE.SphereGeometry(0.014, 8, 8),
                new THREE.MeshBasicMaterial({ color: new THREE.Color(hotspot.color) }),
            )
            dot.position.copy(pos)
            dot.userData = { idx }
            scene.add(dot)
            dots.push(dot)

            const pulseRing = new THREE.Mesh(
                new THREE.RingGeometry(0.018, 0.022, 16),
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
        })

        // Arcs.
        const arcs = []
        const arcProgress = []
        ARCS.forEach(([a, b]) => {
            if (!HOTSPOTS_BASE[a] || !HOTSPOTS_BASE[b]) return
            const from = latLonToVec3(HOTSPOTS_BASE[a].lat, HOTSPOTS_BASE[a].lon, 1.01)
            const to = latLonToVec3(HOTSPOTS_BASE[b].lat, HOTSPOTS_BASE[b].lon, 1.01)
            const line = new THREE.Line(
                createArcGeometry(from, to),
                new THREE.LineBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.5 }),
            )
            scene.add(line)
            arcs.push(line)
            arcProgress.push({ value: Math.random(), speed: 0.003 + Math.random() * 0.004 })
        })

        return { scene, camera, renderer, globe, arcs, arcProgress, dots, pulseRings, rings, particles }
    }, [])

    // Mount + resize + animation loop. Single useEffect keeps cleanup tidy.
    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return
        const { scene, camera, renderer, globe, arcs, arcProgress, dots, pulseRings, rings, particles } =
            sceneRefs

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
        mount.addEventListener('mousemove', handleMove)
        mount.addEventListener('mouseleave', handleLeave)

        let animId
        let t = 0
        const animate = () => {
            animId = requestAnimationFrame(animate)
            t += 0.005

            globe.rotation.y += 0.002
            arcs.forEach((arc, i) => {
                arcProgress[i].value += arcProgress[i].speed
                if (arcProgress[i].value > 1) arcProgress[i].value = 0
                arc.material.opacity = 0.3 + 0.4 * Math.sin(arcProgress[i].value * Math.PI)
                arc.rotation.y = globe.rotation.y
            })
            dots.forEach((dot) => {
                dot.rotation.y = globe.rotation.y
            })
            pulseRings.forEach((ring, i) => {
                ring.rotation.y = globe.rotation.y
                const pulse = 1 + 0.4 * Math.sin(t * 2 + i)
                ring.scale.set(pulse, pulse, pulse)
                ring.material.opacity = 0.3 + 0.3 * Math.cos(t * 2 + i)
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
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
            renderer.dispose()
        }
    }, [sceneRefs])

    const active = hotspots[activeIdx] || hotspots[0]

    return (
        <div
            className="relative w-full bg-[#050505] rounded-2xl border border-white/5 overflow-hidden"
            style={{ height }}
        >
            <div ref={mountRef} className="w-full h-full" />

            {/* Header label */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d946ef] animate-pulse shadow-[0_0_8px_#d946ef]" />
                <span className="text-[#d946ef] text-[9px] font-bold tracking-widest uppercase">
                    Global Situational Awareness
                </span>
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
                                    style={{ color: active.isLive ? '#22d3ee' : '#71717a' }}
                                >
                                    {active.isLive ? 'LIVE' : 'STANDBY'}
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
