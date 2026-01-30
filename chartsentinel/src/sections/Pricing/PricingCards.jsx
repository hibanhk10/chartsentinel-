import { Center, Float, Text, MeshTransmissionMaterial, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'

function PricingCard({ position, title, price, highlighted = false }) {
    const mesh = useRef()
    const [hovered, setHover] = useState(false)

    useFrame((state, delta) => {
        if (!mesh.current) return

        // Scale effect
        const baseScale = highlighted ? 1.1 : 1
        const targetScale = hovered ? baseScale * 1.05 : baseScale
        mesh.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)

        // Color pulse if highlighted
        // We can animate material color if we had a ref to material, or just rely on transmission
    })

    return (
        <group position={position}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
        >
            <RoundedBox ref={mesh} args={[2.2, 3.5, 0.2]} radius={0.1} smoothness={4}>
                <MeshTransmissionMaterial
                    thickness={0.5}
                    roughness={0}
                    transmission={0.95}
                    ior={1.5}
                    chromaticAberration={0.4}
                    background={new THREE.Color('#0f172a')}
                    color={highlighted ? "#3b82f6" : "#ffffff"}
                    anisotropy={0.5}
                />
            </RoundedBox>

            {/* Content */}
            <group position={[0, 0, 0.15]}>
                <Text position={[0, 1, 0]} fontSize={0.2} color={highlighted ? "#3b82f6" : "#94a3b8"} anchorX="center" anchorY="middle">
                    {title}
                </Text>
                <Text position={[0, 0.2, 0]} fontSize={0.5} color="white" anchorX="center" anchorY="middle" font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff">
                    {price}
                </Text>
                <Text position={[0, -0.5, 0]} fontSize={0.15} color="#94a3b8" anchorX="center" anchorY="middle">
                    / month
                </Text>
                <Text position={[0, -1, 0]} fontSize={0.12} color="white" anchorX="center" anchorY="middle">
                    {highlighted ? "Advanced Analytics" : "Basic Features"}
                </Text>
            </group>
        </group>
    )
}

export default function PricingCards() {
    return (
        <Center>
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <PricingCard position={[-2.5, 0, 0]} title="STARTER" price="$49" />
                <PricingCard position={[0, 0, 0.5]} title="PRO" price="$149" highlighted />
                <PricingCard position={[2.5, 0, 0]} title="ENTERPRISE" price="Custom" />
            </Float>

            {/* Floor reflection plane could be added here or via Environment */}
        </Center>
    )
}
