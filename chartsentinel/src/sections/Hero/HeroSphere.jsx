import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial, Sphere } from '@react-three/drei'
import * as THREE from 'three'

export default function HeroSphere() {
    const meshRef = useRef()
    // Using a primitive Sphere instead of GLTF for now to ensure it works immediately without assets
    // The user provided snippet used useGLTF('/models/data-sphere.glb'), I'll stick to a generated Sphere for reliability if they don't have the file yet.
    // Actually, I should try to follow the snippet but fallback if it fails?
    // User provided snippet:
    /*
    const { nodes } = useGLTF('/models/data-sphere.glb')
    */
    // Since I don't have the GLB, I will use a R3F <Sphere> component which is standard.

    useFrame(({ clock }) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = clock.getElapsedTime() * 0.1
            meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.1
        }
    })

    return (
        <Sphere ref={meshRef} args={[1, 64, 64]} scale={2.5}>
            <MeshTransmissionMaterial
                resolution={1024}
                distortion={0.25}
                color="#d946ef"
                thickness={1.5}
                anisotropy={1}
                chromaticAberration={0.5}
                roughness={0.15}
                toneMapped={true}
            />
        </Sphere>
    )
}
