import GlobeMap from '../components/ui/GlobeMap'

// /embed/globe — bare-frame globe for third-party iframes. ChromeGate
// in App.jsx already hides Navbar + StickyCtaBar on /embed/* paths,
// so the iframe lands on a clean dark canvas with just the globe + a
// small attribution chip linking back to chartsentinel.

export default function EmbedGlobePage() {
    return (
        <div className="min-h-screen w-full bg-background-dark text-white p-2">
            <div className="relative w-full h-[calc(100vh-1rem)]">
                <GlobeMap height="100%" />
                <a
                    href="https://www.chartsentinel.com"
                    target="_top"
                    rel="noopener"
                    className="absolute bottom-2 left-2 text-[10px] uppercase tracking-widest text-white/60 hover:text-white bg-black/40 px-2 py-1 rounded backdrop-blur"
                >
                    chartsentinel.com →
                </a>
            </div>
        </div>
    )
}
