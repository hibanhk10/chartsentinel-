import { Sphere } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

function PipelineStep({ position }) {
    return (
        <group position={position}>
            <Sphere args={[0.8, 32, 32]}>
                <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
            </Sphere>
            <mesh>
                <sphereGeometry args={[0.85, 32, 32]} />
                <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.3} />
            </mesh>
            {/* Glowing core */}
            <pointLight distance={3} intensity={2} color="#3b82f6" />
        </group>
    )
}

function Connection({ start, end }) {
    const curve = useMemo(() => {
        return new THREE.LineCurve3(new THREE.Vector3(...start), new THREE.Vector3(...end))
    }, [start, end])

    return (
        <mesh>
            <tubeGeometry args={[curve, 20, 0.1, 8, false]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.5} />
        </mesh>
    )
}

function DataParticles() {
    const particles = useRef()
    // 50 particles moving along the x-axis for simplicity in this demo
    // Ideally they follow the connection paths

    useFrame(({ clock }) => {
        if (!particles.current) return
        // const time = clock.getElapsedTime()

        // Simple linear movement simulation
        for (let i = 0; i < 50; i++) {
            // Reset if out of bounds
        }
    })

    // Simplified: Just some floating particles around the pipeline
    const [positions] = useState(() => {
        const pos = new Float32Array(50 * 3)
        for (let i = 0; i < 50; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 10
            pos[i * 3 + 1] = (Math.random() - 0.5) * 2
            pos[i * 3 + 2] = (Math.random() - 0.5) * 2
        }
        return pos
    })

    return (
        <points ref={particles}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={50} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#22d3ee" transparent opacity={0.8} />
        </points>

    )

}

export default function ProcessPipeline() {
    const group = useRef()
    // const scroll = useScroll() // We are inside a View, so useScroll from drei works if ScrollControls are present, 
    // BUT we are using Lenis on the DOM. So we don't have ScrollControls context here usually.
    // We can just auto-rotate or interact with mouse.

    useFrame(({ clock }) => {
        if (group.current) {
            group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.1
        }
    })

    return (
        <group ref={group}>
            <PipelineStep position={[-3, 0, 0]} label="Data In" />
            <Connection start={[-3, 0, 0]} end={[0, 0, 0]} />

            <PipelineStep position={[0, 0, 0]} label="Process" />
            <Connection start={[0, 0, 0]} end={[3, 0, 0]} />

            <PipelineStep position={[3, 0, 0]} label="Data Out" />

            <DataParticles />
        </group>
    )
}
