import { GridPattern } from '../../components/ui/Patterns'

export default function Footer() {
    return (
        <footer id="contact" className="py-12 bg-background-dark border-t border-white/5 relative overflow-hidden">
            {/* Background Pattern */}
            <GridPattern className="absolute inset-0 text-slate-800 opacity-10" />
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                        <span className="material-icons text-white text-[10px]">query_stats</span>
                    </div>
                    <span className="text-lg font-bold font-display tracking-tight text-white">Chartsentinel</span>
                </div>
                <p className="text-secondary text-sm">© 2024 Chartsentinel. All rights reserved.</p>
                <div className="flex gap-6">
                    <a className="text-secondary hover:text-primary transition-colors text-sm" href="#">Twitter</a>
                    <a className="text-secondary hover:text-primary transition-colors text-sm" href="#">Discord</a>
                    <a className="text-secondary hover:text-primary transition-colors text-sm" href="#">Privacy</a>
                </div>
            </div>
        </footer>
    )
}
