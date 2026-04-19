import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Shared shell for Terms / Privacy / Risk Disclaimer so the three pages feel
// like parts of one document instead of three different one-offs.
export default function LegalLayout({ title, lastUpdated, children, siblings }) {
  return (
    <section className="relative z-10 min-h-screen pt-32 pb-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-3xl mx-auto"
      >
        <Link to="/" className="text-sm text-white/50 hover:text-white transition-colors">
          ← Back to ChartSentinel
        </Link>

        <header className="mt-8 mb-10 pb-8 border-b border-white/10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-white/50">Last updated: {lastUpdated}</p>
        </header>

        <article className="prose-invert legal-prose text-white/80 leading-relaxed space-y-6">
          {children}
        </article>

        <nav className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-4 text-sm">
          <span className="text-white/40">Related:</span>
          {siblings.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="text-white/70 hover:text-white underline decoration-white/20 underline-offset-4 transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </motion.div>
    </section>
  );
}
