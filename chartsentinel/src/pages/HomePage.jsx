import Hero from '../sections/Hero/Hero'
import WhatWeDo from '../sections/WhatWeDo/WhatWeDo'
import Reports from '../sections/Reports/Reports'
import News from '../sections/News/News'
import Pricing from '../sections/Pricing/Pricing'
import Process from '../sections/Process/Process'
import WhyUs from '../sections/WhyUs/WhyUs'
import Footer from '../sections/Footer/Footer'
import SEO from '../components/ui/SEO'
import BreakingNewsTicker from '../components/ui/BreakingNewsTicker'

export default function HomePage() {
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
            <WhatWeDo />
            <Reports />
            <News />
            <Pricing />
            <Process />
            <WhyUs />
            <Footer />
        </div>
    )
}
