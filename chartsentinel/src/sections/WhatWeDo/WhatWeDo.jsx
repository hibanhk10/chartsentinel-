// import { View } from '@react-three/drei' 
// Keeping imports clean
import { ForexWidget } from '../../components/widgets/ForexWidget'
import { HeatmapWidget } from '../../components/widgets/HeatmapWidget'
import { SentimentWidget } from '../../components/widgets/SentimentWidget'

export default function WhatWeDo() {
    return (
        <section className="py-24 bg-background-light dark:bg-background-dark relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <p className="text-secondary dark:text-secondary max-w-lg leading-relaxed">
                                I'm Meily, a passionate Brand Identity & Package Designer based in Tokyo. I specialize
                                in crafting bold visual identities and packaging that captivate and inspire, blending
                                creativity with strategy to elevate brands.
                            </p>
                            <h2 className="text-6xl md:text-8xl font-display font-bold leading-none tracking-tighter uppercase text-white">
                                What We<br />Do
                            </h2>
                        </div>
                        <div className="flex flex-wrap gap-3 py-6 border-y border-slate-200 dark:border-white/10">
                            {['Forex', 'Stock', 'Crypto', 'Gold'].map(tag => (
                                <span key={tag} className="px-6 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-300">{tag}</span>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-6">
                            {['Weekly report', 'Live Market breakdown', 'Q&As', 'Network building', 'Strategy sharing', 'Team building'].map(item => (
                                <div key={item} className="space-y-1">
                                    <h4 className="text-sm font-semibold text-secondary dark:text-secondary">{item}</h4>
                                </div>
                            ))}
                        </div>
                        <a className="inline-flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors group text-white" href="#reviews">
                            Reviews
                            <span className="material-icons group-hover:translate-y-1 transition-transform">arrow_downward</span>
                        </a>
                    </div>

                    {/* 3D Visual Replacement -> New Pro Dashboard Grid */}
                    <div className="relative group h-[500px] w-full">
                        <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                        <div className="relative w-full h-full grid grid-cols-2 grid-rows-2 gap-4">
                            <div className="col-span-2 row-span-1">
                                <ForexWidget />
                            </div>
                            <div className="col-span-1 row-span-1">
                                <HeatmapWidget />
                            </div>
                            <div className="col-span-1 row-span-1">
                                <SentimentWidget />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
