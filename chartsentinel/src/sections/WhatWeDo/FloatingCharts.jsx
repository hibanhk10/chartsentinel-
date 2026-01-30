import { Center, Text, Float, MeshTransmissionMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'

function GlassCard({ position, title, subtitle, color, rotation }) {
    const mesh = useRef()
    const [hovered, setHover] = useState(false)

    useFrame((state, delta) => {
        if (!mesh.current) return

        // Tilt effect
        const targetScale = hovered ? 1.1 : 1
        mesh.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)

        // Subtle float is handled by parent <Float> but we can add more rotation here
        if (hovered) {
            mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, 0.2, delta * 5)
        } else {
            mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, 0, delta * 5)
        }
    })

    return (
        <group position={position} rotation={rotation}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            <mesh ref={mesh}>
                <boxGeometry args={[2.5, 3.5, 0.2]} />
                <MeshTransmissionMaterial
                    thickness={0.5}
                    roughness={0}
                    transmission={0.95}
                    ior={1.5}
                    chromaticAberration={0.4}
                    background={new THREE.Color('#0f172a')}
                    color={color}
                />
            </mesh>

            {/* Text Content inside the card */}
            <group position={[0, 0, 0.15]}>
                <Text position={[0, 0.5, 0]} fontSize={0.25} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff" color="white" anchorX="center" anchorY="middle" maxWidth={2}>
                    {title}
                </Text>
                <Text position={[0, -0.2, 0]} fontSize={0.15} font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff" color="#94a3b8" anchorX="center" anchorY="middle" maxWidth={2} textAlign="center">
                    {subtitle}
                </Text>
            </group>
        </group>
    )
}

export default function FloatingCharts() {
    return (
        <Center>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                <GlassCard
                    position={[-3, 0, 0]}
                    rotation={[0, 0.2, 0]}
                    title="Real-Time Analysis"
                    subtitle="Live data streams from global markets processed in milliseconds."
                    color="#3b82f6"
                />
            </Float>
            <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
                <GlassCard
                    position={[0, 0, 0.5]}
                    rotation={[0, 0, 0]}
                    title="Sentiment Tracking"
                    subtitle="AI-driven social sentiment analysis for predictive trends."
                    color="#22d3ee"
                />
            </Float>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                <GlassCard
                    position={[3, 0, 0]}
                    rotation={[0, -0.2, 0]}
                    title="Risk Metrics"
                    subtitle="Advanced volatility indicators and portfolio exposure alerts."
                    color="#a855f7"
                />
            </Float>
        </Center>
    )
}
