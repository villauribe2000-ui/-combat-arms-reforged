import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/LoginModal';
import {
  Trophy, Store, Users, LifeBuoy, Shield, Wallet, History,
  Menu, LogOut, Crown, LogIn, Gift, Home, Download, BookOpen,
} from 'lucide-react';

export type PageId = 'home' | 'profile' | 'rankings' | 'store' | 'clans' | 'support' | 'admin' | 'wallet' | 'purchase-history' | 'level-rewards' | 'birthday' | 'guide' | 'download';

type NavItem = {
  id: PageId;
  label: string;
  icon: typeof Home;
  adminOnly?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'rankings', label: 'Rankings', icon: Trophy },
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'clans', label: 'Clanes', icon: Users },
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
  const [loginModalOpen, setLoginModalOpen] = useState(!profile && !loading);

  useEffect(() => {
    if (profile && loginModalOpen) {
      setLoginModalOpen(false);
    }
  }, [profile, loginModalOpen]);

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
            className={`${mobile ? 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left' : 'relative flex items-center gap-1.5 px-2.5 py-2'} text-[13px] font-medium tracking-wide transition-colors ${
              active ? 'text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
            {!mobile && active && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#f5a000]" />
            )}
          </button>
        );
      })}
      <button
        onClick={() => go('download')}
        className={`${mobile ? 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left' : 'relative flex items-center gap-1.5 px-2.5 py-2'} text-[13px] font-medium tracking-wide transition-colors ${
          currentPage === 'download' ? 'text-white' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        Download
        {!mobile && currentPage === 'download' && (
          <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#f5a000]" />
        )}
      </button>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${mobile ? 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5' : 'flex items-center gap-1.5 px-2.5 py-2'} text-[13px] font-medium text-[#5865F2] transition-colors hover:text-[#7983f5]`}
      >
        <img src="/caevo/discord-mark-white.svg" alt="" className="h-3.5 w-3.5" />
        Discord
      </a>
    </>
  );

  return (
    <div className="min-h-screen bg-[#101010] text-[#f2f2f2]">
      <header className="sticky top-0 z-40 h-[88px] border-b border-[#333] bg-[#141414]">
        <div className="mx-auto flex h-full max-w-[1568px] items-center gap-8 px-4 lg:px-16">
          <button onClick={() => go('home')} className="brand-evo shrink-0">
            <img src="/caevo/ca.ico" alt="" className="h-10 w-10 object-contain" />
            <span>
              COMBAT<span className="brand-arms">ARMS</span>
              <small>EVOLUTION</small>
            </span>
          </button>

          <nav className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto lg:flex">
            <NavButtons />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {profile ? (
              <>
                <button
                  onClick={() => go('profile')}
                  className="hidden items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm sm:flex"
                >
                  <span className="font-semibold">{profile.NickName || profile.username}</span>
                  {profile.is_admin && <Crown className="h-3.5 w-3.5 text-[#f5a000]" />}
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm text-neutral-300 hover:border-white/30 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setLoginModalOpen(true)} className="header-pill">
                  <LogIn className="h-3.5 w-3.5" /> Sign in
                </button>
                <button onClick={() => setLoginModalOpen(true)} className="header-pill">
                  Sign up
                </button>
              </>
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

      <main className={currentPage === 'home' || currentPage === 'guide' || currentPage === 'download' ? 'relative' : 'relative mx-auto max-w-[1400px] px-4 py-8 lg:px-8'}>
        {loading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5a000]/30 border-t-[#f5a000]" />
          </div>
        ) : !profile && currentPage !== 'home' && currentPage !== 'guide' && currentPage !== 'download' ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
            <h2 className="mt-4 text-2xl font-bold">Inicia sesión para continuar</h2>
            <p className="mt-2 text-neutral-400">Crea tu cuenta o inicia sesión para acceder a esta sección</p>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="mt-6 rounded-md bg-[#f5a000] px-8 py-3 font-semibold text-black hover:bg-[#ffb21a]"
            >
              Iniciar Sesión
            </button>
          </div>
        ) : (
          children
        )}
      </main>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onSuccess={() => setLoginModalOpen(false)} />
    </div>
  );
}
