import { Environment, PerspectiveCamera, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import useExperienceStore from '../../store/useExperienceStore'
import PostEffects from './PostEffects'
import HeroSphere from '../../sections/Hero/HeroSphere'

export default function MainScene() {
    const cameraRef = useRef()
    const mouse = useExperienceStore((state) => state.mouse)

    // Simplified camera parallax
    useFrame((state, delta) => {
        const targetX = mouse.x * 0.3 // Reduced range
        const targetY = mouse.y * 0.3

        if (cameraRef.current) {
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, targetX, delta * 2)
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, targetY, delta * 2)
            cameraRef.current.lookAt(0, 0, 0)
        }
    })

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 12]} ref={cameraRef} />

            {/* Lighting & Environment */}
            <ambientLight intensity={0.5} color="#d946ef" />
            <pointLight position={[10, 10, 10]} intensity={1} color="#d946ef" />
            <spotLight position={[-10, 10, 5]} angle={0.3} penumbra={1} intensity={2} color="#ffffff" />
            <Environment preset="city" />

            {/* Background Elements - significantly reduced stars */}
            <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
            <fog attach="fog" args={['#050505', 8, 20]} />

            <group position={[0, 0, 0]}>
                <HeroSphere />
            </group>

            <PostEffects />
        </>
    )
}
