import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export default function PostEffects() {
    return (
        <EffectComposer disableNormalPass>
            {/* Bloom for the glow */}
            <Bloom
                luminanceThreshold={1.0}
                mipmapBlur
                intensity={1.0} // Reduced from 1.5
                radius={0.4} // Reduced from 0.6
            />

            {/* Chromatic Aberration for that lens effect */}
            <ChromaticAberration
                offset={[0.001, 0.001]} // Reduced from 0.002
                radialModulation={false}
                modulationOffset={0}
            />

            {/* Noise for film grain texture - lowered for less grain and better perf */}
            <Noise opacity={0.03} />

            {/* Vignette to focus center */}
            <Vignette
                eskil={false}
                offset={0.1}
                darkness={1.1}
            />
        </EffectComposer>
    )
}
