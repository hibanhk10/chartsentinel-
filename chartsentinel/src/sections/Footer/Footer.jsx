import { Link } from 'react-router-dom'
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
                <p className="text-secondary text-sm">© {new Date().getFullYear()} Chartsentinel. All rights reserved.</p>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                    <Link className="text-secondary hover:text-primary transition-colors text-sm" to="/terms">Terms</Link>
                    <Link className="text-secondary hover:text-primary transition-colors text-sm" to="/privacy">Privacy</Link>
                    <Link className="text-secondary hover:text-primary transition-colors text-sm" to="/risk">Risk</Link>
                    <Link className="text-secondary hover:text-primary transition-colors text-sm" to="/trust">Trust</Link>
                    <Link className="text-secondary hover:text-primary transition-colors text-sm" to="/waitlist">Waitlist</Link>
                    <Link className="text-secondary hover:text-primary transition-colors text-sm" to="/contact">Contact</Link>
                </div>
            </div>
        </footer>
    )
}
