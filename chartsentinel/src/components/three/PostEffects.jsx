import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

export default function PostEffects() {
    return (
        <EffectComposer disableNormalPass>
            {/* Bloom for the glow */}
            <Bloom
                luminanceThreshold={1.0}
                mipmapBlur
                intensity={1.0}
                radius={0.4}
                resolutionScale={0.5} // Lower resolution of the bloom pass
            />

            {/* Vignette to focus center */}
            <Vignette
                eskil={false}
                offset={0.1}
                darkness={1.1}
            />
        </EffectComposer>
    )
}
