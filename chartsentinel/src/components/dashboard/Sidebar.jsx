import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Responsive sidebar:
//   lg (≥1024px): fixed 16rem column on the left.
//   <lg:         drawer that slides in from the left behind a scrim; a
//                hamburger in the top bar toggles it, Esc closes it, and
//                tab selection closes it too so the user can actually see
//                the content they just asked for.
//
// Items are grouped into collapsible dropdown sections so the nav stays
// scannable as the dashboard surface grows. The group containing the
// active tab auto-opens; users can collapse or expand others freely.

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navGroups = useMemo(
    () => [
      {
        id: 'overview',
        label: 'Overview',
        icon: 'space_dashboard',
        items: [{ id: 'home', label: 'Home', icon: 'home' }],
      },
      {
        id: 'markets',
        label: 'Markets',
        icon: 'show_chart',
        items: [
          { id: 'signals', label: 'Signals', icon: 'insights' },
          { id: 'terminal', label: 'Terminal', icon: 'monitor_heart' },
          { id: 'mood', label: 'Mood', icon: 'mood' },
          { id: 'watchlist', label: 'Watchlist', icon: 'notifications_active' },
        ],
      },
      {
        id: 'intelligence',
        label: 'Intelligence',
        icon: 'radar',
        items: [
          { id: 'intel', label: 'Threat Matrix', icon: 'public' },
          { id: 'interrogation', label: 'Interrogation', icon: 'psychology' },
          { id: 'reports', label: 'Reports', icon: 'description' },
          { id: 'news', label: 'Daily News', icon: 'newspaper' },
        ],
      },
      {
        id: 'community',
        label: 'Community',
        icon: 'group',
        items: [
          { id: 'networking', label: 'Networking', icon: 'group' },
          { id: 'coaching', label: 'Coaching', icon: 'school' },
          { id: 'referrals', label: 'Invite friends', icon: 'card_giftcard' },
        ],
      },
      {
        id: 'support',
        label: 'Support',
        icon: 'help_outline',
        items: [
          { id: 'about', label: 'About', icon: 'info' },
          { id: 'contact', label: 'Contact', icon: 'mail' },
          ...(user?.role === 'admin'
            ? [{ id: 'admin', label: 'Admin', icon: 'admin_panel_settings' }]
            : []),
        ],
      },
    ],
    [user?.role]
  );

  const flatItems = useMemo(
    () => navGroups.flatMap((g) => g.items),
    [navGroups]
  );

  // Auto-open whichever group owns the active tab so navigation keeps
  // context. Users can still expand other groups manually.
  const groupOfActive = useMemo(
    () => navGroups.find((g) => g.items.some((i) => i.id === activeTab))?.id,
    [navGroups, activeTab]
  );

  // Tracks groups the user has explicitly toggled. Anything not in this
  // map defaults to "open iff it contains the active tab". This shape
  // lets us derive open-state purely at render time, so navigating to a
  // new tab auto-opens its group without a setState-in-effect cycle.
  const [overrides, setOverrides] = useState({});

  const isGroupOpen = (groupId) =>
    groupId in overrides ? overrides[groupId] : groupId === groupOfActive;

  const toggleGroup = (groupId) => {
    setOverrides((prev) => ({ ...prev, [groupId]: !isGroupOpen(groupId) }));
  };

  // Esc closes the drawer on mobile.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setIsOpen(false); // always close drawer after picking a tab on mobile
  };

  return (
    <>
      {/* Mobile top bar — only visible under lg so desktop stays identical. */}
      <div className="lg:hidden fixed top-20 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-background-dark/80 backdrop-blur-lg border-b border-white/5">
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open navigation"
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-white"
        >
          <span className="material-icons text-base">menu</span>
          <span className="text-sm font-medium">Menu</span>
        </button>
        <span className="text-xs uppercase tracking-wider text-text-muted">
          {flatItems.find((i) => i.id === activeTab)?.label || 'Dashboard'}
        </span>
      </div>

      {/* Backdrop — only rendered while drawer is open, click to close. */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      <aside
        className={`
          border-r border-white/5 bg-surface-dark flex flex-col
          fixed top-0 h-full overflow-y-auto
          w-72 lg:w-64
          z-50 lg:z-10
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          pt-20 lg:pt-20
        `}
      >
        {/* Close button only visible in drawer mode. */}
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close navigation"
          className="lg:hidden absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:bg-white/5 hover:text-white transition-colors"
        >
          <span className="material-icons text-lg">close</span>
        </button>

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
            {navGroups.map((group) => {
              const isExpanded = isGroupOpen(group.id);
              const containsActive = group.items.some((i) => i.id === activeTab);
              return (
                <div key={group.id}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isExpanded}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-[11px] uppercase tracking-widest font-bold rounded-md transition-colors ${
                      containsActive
                        ? 'text-white'
                        : 'text-text-muted hover:bg-white/5 hover:text-text-secondary'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="material-icons text-base">{group.icon}</span>
                      {group.label}
                    </span>
                    <span
                      className={`material-icons text-base transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      isExpanded
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pl-3 pt-1 pb-2 space-y-1 border-l border-white/5 ml-4">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                              activeTab === item.id
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'text-text-secondary hover:bg-white/5'
                            }`}
                          >
                            <span className="material-icons text-lg">{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
    </>
  );
};

export default Sidebar;
