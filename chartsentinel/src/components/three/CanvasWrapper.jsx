import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, Loader, View } from '@react-three/drei'
import { Suspense, useState } from 'react'
import MainScene from './MainScene'
import useExperienceStore from '../../store/useExperienceStore'

export default function CanvasWrapper() {
    const dpr = useExperienceStore((state) => state.dpr)
    const setDpr = useExperienceStore((state) => state.setDpr)

    return (
        <>
            <Canvas
                dpr={dpr}
                gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
                camera={{ position: [0, 0, 10], fov: 35 }}
                className="pointer-events-none" // Allow clicks to pass through to HTML
                eventSource={document.getElementById('root')}
            >
                <PerformanceMonitor
                    onIncline={() => setDpr(2)}
                    onDecline={() => setDpr(1)}
                    flipflops={3}
                    onFallback={() => setDpr(1)}
                />
                <Suspense fallback={null}>
                    <MainScene />
                    <View.Port />
                </Suspense>
            </Canvas>
            <Loader
                containerStyles={{
                    background: '#050505',
                }}
                innerStyles={{
                    backgroundColor: '#d946ef',
                    width: '200px',
                }}
                barStyles={{
                    backgroundColor: '#fdf4ff',
                }}
                dataStyles={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    fontFamily: 'Inter, sans-serif'
                }}
            />
        </>
    )
}
