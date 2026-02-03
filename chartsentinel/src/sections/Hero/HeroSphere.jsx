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
            <meshPhysicalMaterial
                color="#d946ef"
                emissive="#d946ef"
                emissiveIntensity={0.2}
                roughness={0.1}
                metalness={0.0}
                transmission={0.9} // Glass effect
                thickness={1.0}
                ior={1.5}
                clearcoat={1}
                clearcoatRoughness={0.1}
                attenuationColor="#ffffff"
                attenuationDistance={1}
                transparent={true}
            />
        </Sphere>
    )
}
