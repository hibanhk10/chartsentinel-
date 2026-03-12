import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, Loader, View, AdaptiveDpr } from '@react-three/drei'
import { Suspense, useState } from 'react'
import MainScene from './MainScene'
import useExperienceStore from '../../store/useExperienceStore'

export default function CanvasWrapper() {
    const dpr = useExperienceStore((state) => state.dpr)
    const setDpr = useExperienceStore((state) => state.setDpr)

    return (
        <>
            <Canvas
                dpr={1} // Hard-capped at 1 to prevent severe lag on high-DPI/Retina screens
                gl={{
                    antialias: false,
                    powerPreference: 'high-performance',
                    alpha: false, // Disabling alpha for performance
                    stencil: false,
                    depth: true,
                }}
                camera={{ position: [0, 0, 10], fov: 35 }}
                className="pointer-events-none" // Allow clicks to pass through to HTML
                eventSource={document.getElementById('root')}
            >
                <AdaptiveDpr pixelated /> {/* Lower resolution during heavy interactions */}
                <PerformanceMonitor
                    onIncline={() => setDpr(1.3)}
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
