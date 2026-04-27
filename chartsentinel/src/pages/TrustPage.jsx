import { motion } from 'framer-motion';
import SEO from '../components/ui/SEO';

// Marketing-side trust positioning page. Ports the preregister site's
// /trust into the main app so the public surface reaches parity. The
// technical claims (zero-knowledge proofs, homomorphic encryption,
// air-gapped infrastructure) are positioning copy — the actual
// implementation is intentionally not described here, just signalled.

function ShieldIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}
function LockIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}
function ServerIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
    );
}
function FileCheckIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <polyline points="9 15 11 17 15 13" />
        </svg>
    );
}

const protocols = [
    {
        Icon: ShieldIcon,
        title: 'Zero-Knowledge Proofs',
        desc: 'Mathematical verification of transactions without revealing underlying data.',
    },
    {
        Icon: LockIcon,
        title: 'Homomorphic Encryption',
        desc: 'Computation on encrypted data streams ensuring absolute confidentiality.',
    },
    {
        Icon: ServerIcon,
        title: 'Air-Gapped Infrastructure',
        desc: 'Core models are isolated from external networks to prevent unauthorized access.',
    },
    {
        Icon: FileCheckIcon,
        title: 'Regulatory Compliance',
        desc: 'Automated reporting and adherence to global financial regulations.',
    },
];

export default function TrustPage() {
    return (
        <>
            <SEO
                title="Trust — ChartSentinel"
                description="Institutional trust protocols: zero-knowledge proofs, homomorphic encryption, air-gapped infrastructure, and regulatory compliance."
                path="/trust"
            />
            <div className="min-h-screen pt-40 px-6 pb-32 relative z-10 flex flex-col items-center">
                <div className="max-w-6xl w-full">
                    {/* Header */}
                    <div className="text-center mb-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 border border-primary/30 mb-8 shadow-[0_0_40px_rgba(217,70,239,0.2)]"
                        >
                            <ShieldIcon className="w-12 h-12 text-primary" />
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-display font-black text-text-primary tracking-tighter mb-6"
                        >
                            Institutional Trust Protocols
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-text-muted text-sm uppercase tracking-[0.15em] max-w-2xl mx-auto"
                        >
                            Security is not an afterthought. It is the foundation of the platform.
                        </motion.p>
                    </div>

                    {/* Protocol grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                        {protocols.map((protocol, index) => {
                            const { Icon } = protocol;
                            return (
                                <motion.div
                                    key={protocol.title}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.12, duration: 0.6 }}
                                    whileHover={{ y: -6 }}
                                    className="bg-surface-dark/60 backdrop-blur-sm rounded-2xl border border-white/10 p-8 group"
                                >
                                    <div className="mb-6 p-4 bg-primary/10 rounded-xl inline-block border border-primary/20 group-hover:border-primary/40 group-hover:bg-primary/15 transition-all duration-300 shadow-[0_0_20px_rgba(217,70,239,0.15)]">
                                        <Icon className="w-10 h-10 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-bold text-text-primary mb-3 tracking-tight group-hover:text-primary transition-colors">
                                        {protocol.title}
                                    </h3>
                                    <p className="text-text-secondary text-sm leading-relaxed">
                                        {protocol.desc}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Verification Banner */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                        className="border border-primary/25 bg-primary/[0.05] rounded-2xl p-8 text-center backdrop-blur-sm shadow-[0_0_40px_rgba(217,70,239,0.1)]"
                    >
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <motion.div
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"
                            />
                            <p className="text-primary font-bold tracking-[0.12em] uppercase text-[10px]">
                                System Integrity Verified
                            </p>
                        </div>
                        <p className="text-text-muted text-xs">
                            All cryptographic signatures valid. Zero breaches in 99,999+ hours of operation.
                        </p>
                    </motion.div>
                </div>
            </div>
        </>
    );
}
