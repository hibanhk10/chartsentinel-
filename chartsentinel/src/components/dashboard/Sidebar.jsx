import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { id: 'home', label: 'Home', icon: 'home' },
        { id: 'signals', label: 'Signals', icon: 'insights' },
        { id: 'reports', label: 'Reports', icon: 'description' },
        { id: 'networking', label: 'Networking', icon: 'group' },
        { id: 'news', label: 'Daily News', icon: 'newspaper' },
        { id: 'coaching', label: 'Coaching', icon: 'school' },
        { id: 'about', label: 'About', icon: 'info' },
        { id: 'contact', label: 'Contact', icon: 'mail' },
        ...(user?.role === 'admin'
            ? [{ id: 'admin', label: 'Admin', icon: 'admin_panel_settings' }]
            : []),
    ];

    return (
        <aside className="w-64 border-r border-white/5 bg-surface-dark flex flex-col fixed h-full overflow-y-auto">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <span className="material-icons text-primary uppercase">{user?.email?.[0] || 'U'}</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-tight uppercase text-white">
                            {user?.name || user?.email?.split('@')[0] || 'User'}
                        </h2>
                        <p className="text-xs text-text-muted">{user?.isPaid ? 'Paid Member' : 'Free Member'}</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === item.id
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-text-secondary hover:bg-white/5'
                                }`}
                        >
                            <span className="material-icons text-lg">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-8">
                    <h3 className="px-3 text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Follow</h3>
                    <div className="space-y-1">
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 rounded-md transition-colors">
                            <span className="material-icons text-lg">public</span>
                            Twitter
                        </a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 rounded-md transition-colors">
                            <span className="material-icons text-lg">camera_alt</span>
                            Instagram
                        </a>
                        <a href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-secondary hover:bg-white/5 rounded-md transition-colors">
                            <span className="material-icons text-lg">smart_display</span>
                            YouTube
                        </a>
                    </div>
                </div>
            </div>

            <div className="mt-auto p-6 border-t border-white/5">
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                >
                    <span className="material-icons text-lg">logout</span>
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
