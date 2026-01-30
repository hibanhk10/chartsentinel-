import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export default function PostEffects() {
    return (
        <EffectComposer disableNormalPass>
            {/* Bloom for the glow */}
            <Bloom
                luminanceThreshold={1.0} // only very bright things glow
                mipmapBlur
                intensity={1.5}
                radius={0.6}
            />

            {/* Chromatic Aberration for that lens effect */}
            <ChromaticAberration
                offset={[0.002, 0.002]} // subtle offset
                radialModulation={false}
                modulationOffset={0}
            />

            {/* Noise for film grain texture */}
            <Noise opacity={0.05} />

            {/* Vignette to focus center */}
            <Vignette
                eskil={false}
                offset={0.1}
                darkness={1.1}
            />
        </EffectComposer>
    )
}
