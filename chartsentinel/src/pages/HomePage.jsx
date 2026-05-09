import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../sections/Hero/Hero'
import DataSources from '../sections/DataSources/DataSources'
import WhatWeDo from '../sections/WhatWeDo/WhatWeDo'
import Reports from '../sections/Reports/Reports'
import News from '../sections/News/News'
import Reviews from '../sections/Reviews/Reviews'
import Pricing from '../sections/Pricing/Pricing'
import PlanComparison from '../sections/PlanComparison/PlanComparison'
import FAQ from '../sections/FAQ/FAQ'
import Process from '../sections/Process/Process'
import WhyUs from '../sections/WhyUs/WhyUs'
import Intelligence from '../sections/Intelligence/Intelligence'
import Footer from '../sections/Footer/Footer'
import SEO from '../components/ui/SEO'
import BreakingNewsTicker from '../components/ui/BreakingNewsTicker'

// Scroll to a hash target after navigation. The Navbar's section links
// route off-homepage users back to `/` with a hash (e.g. `/#reviews`);
// without this effect react-router lands them at the top and the anchor
// is silently dropped.
function useHashScroll() {
    const { hash } = useLocation()
    useEffect(() => {
        if (!hash) return
        const target = document.getElementById(hash.replace('#', ''))
        if (!target) return
        // Defer one frame so post-mount layout has settled and the
        // smooth scroll lands at the right position.
        requestAnimationFrame(() => {
            const offset = 80
            const top = target.getBoundingClientRect().top + window.scrollY - offset
            window.scrollTo({ top, behavior: 'smooth' })
        })
    }, [hash])
}

export default function HomePage() {
    useHashScroll()
    return (
        <div className="relative z-10 w-full">
            <SEO
                path="/"
                description="Composite signals across FX, crypto, and equities. Commitment-of-traders positioning, seasonality, and chart-pattern matches — in one dashboard."
            />
            <Hero />
            {/* Breaking-news strip just below the Hero — picks up scroll
                readers immediately with live market-relevant headlines. */}
            <BreakingNewsTicker />
            <DataSources />
            <WhatWeDo />
            <Reports />
            <News />
            <Reviews />
            <Pricing />
            <PlanComparison />
            <FAQ />
            <Process />
            <WhyUs />
            {/* Marketing teaser of the threat-matrix intelligence layer.
                Sits after WhyUs so visitors see capability framing first,
                then a concrete artifact illustrating it. */}
            <Intelligence />
            <Footer />
        </div>
    )
}
