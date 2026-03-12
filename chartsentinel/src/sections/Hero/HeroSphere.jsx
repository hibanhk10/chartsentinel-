import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import * as THREE from 'three'

export default function HeroSphere() {
    const meshRef = useRef()

    useFrame(({ clock }) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = clock.getElapsedTime() * 0.1
            meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.1
        }
    })

    return (
        <Sphere ref={meshRef} args={[1, 24, 24]} scale={2.5}>
            <meshStandardMaterial
                color="#d946ef"
                emissive="#d946ef"
                emissiveIntensity={0.4}
                roughness={0.2}
                metalness={0.8}
                transparent={true}
                opacity={0.4}
            />
        </Sphere>
    )
}
