import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_CONFIG } from '../../config/api';
import ThreatMatrix from '../ui/ThreatMatrix';

// Genesis chat — the dashboard's AI interrogation surface. The
// preregister site shipped this as a public marketing demo; here it
// gates behind dashboard auth and pairs with the threat-matrix panel
// so the chat has the geopolitical context the user can ask about
// directly visible.
//
// The /api/ai/interrogate endpoint always returns 200 with { text },
// even on Gemini failures or compliance blocks, so this component
// never has to special-case the error path.

function CpuIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="2" x2="9" y2="4" />
            <line x1="15" y1="2" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="22" />
            <line x1="15" y1="20" x2="15" y2="22" />
            <line x1="20" y1="9" x2="22" y2="9" />
            <line x1="20" y1="14" x2="22" y2="14" />
            <line x1="2" y1="9" x2="4" y2="9" />
            <line x1="2" y1="14" x2="4" y2="14" />
        </svg>
    );
}
function SendIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    );
}

function GenesisChat() {
    const [messages, setMessages] = useState([
        { id: 'init', type: 'system', text: 'Genesis AI Online. Query the intelligence matrix.' },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isTyping]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;

        const userMsg = { id: `${Date.now()}-u`, type: 'user', text: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch(`${API_CONFIG.baseURL}/ai/interrogate`, {
                method: 'POST',
                headers: API_CONFIG.headers,
                body: JSON.stringify({ message: trimmed }),
            });
            const data = await response.json().catch(() => ({}));
            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-s`,
                    type: 'system',
                    text: data.text || 'Genesis Core: connection lost.',
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-e`,
                    type: 'system',
                    text: 'Error: Genesis Core is currently unreachable.',
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-primary/10 animate-pulse rounded-full" />
                    <CpuIcon className="w-4 h-4 text-primary relative z-10" />
                </div>
                <div>
                    <p className="text-text-primary font-bold text-xs tracking-widest uppercase">Genesis Core</p>
                    <p className="text-primary text-[9px] tracking-widest uppercase">Neural Link Active</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-400 text-[9px] font-bold tracking-widest">LIVE</span>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-primary/5 border-b border-primary/10 py-1.5 px-4 text-center">
                <p className="text-[10px] text-text-muted uppercase tracking-wide">
                    <span className="text-primary font-semibold mr-1">Notice:</span>
                    Genesis AI provides analytical market insights, not investment advice.
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={
                                    msg.type === 'user'
                                        ? 'max-w-[85%] p-3 rounded-xl text-xs leading-relaxed bg-gradient-to-r from-primary to-primary-dark text-white rounded-tr-sm shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                                        : 'max-w-[85%] p-3 rounded-xl text-xs leading-relaxed bg-white/[0.04] text-primary rounded-tl-sm border border-primary/15'
                                }
                            >
                                {msg.text}
                            </div>
                        </motion.div>
                    ))}
                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="bg-white/[0.04] border border-primary/10 rounded-xl rounded-tl-sm p-3 flex gap-1.5 items-center">
                                {[0, 150, 300].map((delay, i) => (
                                    <div
                                        key={i}
                                        className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
                                        style={{ animationDelay: `${delay}ms` }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Query the intelligence..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-text-primary placeholder-text-muted focus:outline-none focus:border-primary/40 text-xs"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="px-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl hover:shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <SendIcon className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}

export default function Interrogation() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-semibold mb-2">
                    Interrogation Layer
                </p>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-text-primary tracking-tight">
                    Ask Genesis
                </h1>
                <p className="text-text-secondary mt-2 max-w-2xl">
                    Query the intelligence matrix in plain language. Ask about market
                    structure, regional risk, historical analogs, or specific tickers —
                    Genesis returns a contextual response. Threat matrix on the right shows
                    the live regional risk surface you can ask about directly.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3 h-[640px]">
                    <GenesisChat />
                </div>
                <div className="xl:col-span-2 h-[640px]">
                    <ThreatMatrix />
                </div>
            </div>
        </motion.div>
    );
}
