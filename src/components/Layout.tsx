import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Trophy, Store, LifeBuoy, Shield, Wallet, History,
  Menu, LogOut, Crown, Gift, Home, Download, BookOpen, UserRound, UserRoundPlus, ChevronDown, Coins, LayoutGrid, Ticket,
} from 'lucide-react';

export type PageId = 'home' | 'profile' | 'account' | 'rankings' | 'store' | 'support' | 'admin' | 'wallet' | 'purchase-history' | 'level-rewards' | 'birthday' | 'invite' | 'guide' | 'download' | 'signin' | 'signup';

type NavItem = {
  id: PageId;
  label: string;
  icon: typeof Home;
  adminOnly?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'invite', label: 'Invitar', icon: Ticket },
  { id: 'rankings', label: 'Rankings', icon: Trophy },
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'wallet', label: 'Billetera', icon: Wallet },
  { id: 'purchase-history', label: 'Historial', icon: History },
  { id: 'level-rewards', label: 'Recompensas', icon: Crown },
  { id: 'birthday', label: 'Cumpleaños', icon: Gift },
  { id: 'guide', label: 'Guide', icon: BookOpen },
  { id: 'support', label: 'Soporte', icon: LifeBuoy },
  { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
];

const DISCORD_URL = 'https://discord.gg/5EpJwAh2r6';

type Props = {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
};

export default function Layout({ currentPage, onNavigate, children }: Props) {
  const { profile, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const publicPages: PageId[] = ['home', 'guide', 'download', 'signin', 'signup', 'rankings'];
  const isPublic = publicPages.includes(currentPage);
  const isFullBleed = isPublic || currentPage === 'profile' || currentPage === 'account' || currentPage === 'wallet' || currentPage === 'store' || currentPage === 'purchase-history' || currentPage === 'level-rewards' || currentPage === 'support' || currentPage === 'birthday' || currentPage === 'invite' || currentPage === 'admin';

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const navItems = PRIMARY_NAV.filter(item => !item.adminOnly || profile?.is_admin);

  const go = (id: PageId) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const NavButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map(item => {
        const Icon = item.icon;
        const active = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => go(item.id)}
            className={`${mobile ? 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left' : 'relative flex shrink-0 items-center gap-1 px-1.5 py-2'} text-[12px] font-medium tracking-wide transition-colors ${
              active ? 'text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Icon className={mobile ? 'h-3.5 w-3.5' : 'hidden'} />
            {item.label}
            {!mobile && active && (
              <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-[#f5a000]" />
            )}
          </button>
        );
      })}
      <button
        onClick={() => go('download')}
        className={`${mobile ? 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left' : 'relative flex shrink-0 items-center gap-1 px-1.5 py-2'} text-[12px] font-medium tracking-wide transition-colors ${
          currentPage === 'download' ? 'text-white' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Download className={mobile ? 'h-3.5 w-3.5' : 'hidden'} />
        Download
        {!mobile && currentPage === 'download' && (
          <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-[#f5a000]" />
        )}
      </button>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${mobile ? 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5' : 'flex shrink-0 items-center gap-1 px-1.5 py-2'} text-[12px] font-medium text-[#5865F2] transition-colors hover:text-[#7983f5]`}
      >
        <img src="/caevo/discord-mark-white.svg" alt="" className="h-3.5 w-3.5" />
        Discord
      </a>
    </>
  );

  if (currentPage === 'admin') {
    return (
      <div className="min-h-screen bg-[#101010] text-[#f2f2f2]">
        {loading ? (
          <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5a000]/30 border-t-[#f5a000]" />
          </div>
        ) : !profile ? (
          <div className="flex min-h-screen flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold">Inicia sesión para continuar</h2>
            <button onClick={() => go('signin')} className="mt-6 rounded-md bg-[#f5a000] px-8 py-3 font-semibold text-black">Iniciar Sesión</button>
          </div>
        ) : (
          children
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] text-[#f2f2f2]">
      <header className="sticky top-0 z-40 h-[88px] border-b border-[#333] bg-[#141414]">
        <div className="flex h-full w-full items-center gap-3 pl-2 pr-3 lg:gap-4 lg:pl-3 lg:pr-4">
          <button onClick={() => go('home')} className="brand-evo shrink-0">
            <img src="/caevo/ca.ico" alt="" className="h-8 w-8 object-contain" />
            <span>
              COMBAT<span className="brand-arms">ARMS</span>
              <small>EVOLUTION</small>
            </span>
          </button>

          <nav className="hidden min-w-0 flex-1 items-center justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex">
            <NavButtons />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => go('invite')}
              className="inline-flex items-center gap-1 rounded-md bg-[#df8104] px-3 py-2 text-[12px] font-bold text-black hover:bg-[#f5a000]"
            >
              <Ticket className="h-3.5 w-3.5" />
              Invitar
            </button>
            {profile ? (
              <div className="user-menu-wrap" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(open => !open)}
                  className="account-button"
                  aria-expanded={menuOpen}
                >
                  <UserRound className="h-3.5 w-3.5" />
                  {profile.nickname || profile.username}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {menuOpen && (
                  <div className="user-menu">
                    {profile.is_admin && (
                      <button type="button" onClick={() => { setMenuOpen(false); go('admin'); }}>
                        <Shield size={16} />
                        <span>
                          <strong>Admin Dashboard</strong>
                          <small>Manage the community</small>
                        </span>
                      </button>
                    )}
                    <button type="button" onClick={() => { setMenuOpen(false); go('profile'); }}>
                      <UserRound size={16} />
                      <span>
                        <strong>Profile</strong>
                        <small>Your public player profile</small>
                      </span>
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); go('wallet'); }}>
                      <Coins size={16} />
                      <span>
                        <strong>Charge Coins</strong>
                        <small>Buy NX</small>
                      </span>
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); go('invite'); }}>
                      <Ticket size={16} />
                      <span>
                        <strong>Invitar</strong>
                        <small>Comparte tu código y gana NX</small>
                      </span>
                    </button>
                    <button type="button" onClick={() => { setMenuOpen(false); go('account'); }}>
                      <LayoutGrid size={16} />
                      <span>
                        <strong>Account</strong>
                        <small>Account settings & security</small>
                      </span>
                    </button>
                    <div className="user-menu-sep" />
                    <button
                      type="button"
                      className="user-menu-signout"
                      onClick={async () => { setMenuOpen(false); await signOut(); go('home'); }}
                    >
                      <LogOut size={16} />
                      <span><strong>Sign out</strong></span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="header-auth-actions">
                <button onClick={() => go('signin')} className="account-button">
                  <UserRound className="h-3.5 w-3.5" /> Sign in
                </button>
                <button onClick={() => go('signup')} className="account-button">
                  <UserRoundPlus className="h-3.5 w-3.5" /> Sign up
                </button>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-neutral-300 hover:bg-white/5 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed right-0 top-0 z-50 h-screen w-72 overflow-y-auto border-l border-white/10 bg-[#0f0f0f] p-4 lg:hidden">
            <NavButtons mobile />
          </aside>
        </>
      )}

      <main className={isFullBleed ? 'relative' : 'relative mx-auto max-w-[1400px] px-4 py-8 lg:px-8'}>
        {loading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5a000]/30 border-t-[#f5a000]" />
          </div>
        ) : !profile && !isPublic ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <h2 className="mt-4 text-2xl font-bold">Inicia sesión para continuar</h2>
            <p className="mt-2 text-neutral-400">Crea tu cuenta o inicia sesión para acceder a esta sección</p>
            <button
              onClick={() => go('signin')}
              className="mt-6 rounded-md bg-[#f5a000] px-8 py-3 font-semibold text-black hover:bg-[#ffb21a]"
            >
              Iniciar Sesión
            </button>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
