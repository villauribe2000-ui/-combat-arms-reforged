import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { RANK_INFO } from '@/lib/supabase';
import LoginModal from '@/components/LoginModal';
import COFlag from '@/assets/flags/CO.png';
import MXFlag from '@/assets/flags/MX.png';
import ARFlag from '@/assets/flags/AR.png';
import BRFlag from '@/assets/flags/BR.png';
import CLFlag from '@/assets/flags/CL.png';
import PEFlag from '@/assets/flags/PE.png';
import VEFlag from '@/assets/flags/VE.png';
import BOFlag from '@/assets/flags/BO.png';
import DOFlag from '@/assets/flags/DO.png';
import ECFlag from '@/assets/flags/EC.png';
import SVFlag from '@/assets/flags/SV.png';
import GTFlag from '@/assets/flags/GT.png';
import HNFlag from '@/assets/flags/HN.png';
import NIFlag from '@/assets/flags/NI.png';
import PAFlag from '@/assets/flags/PA.png';
import PYFlag from '@/assets/flags/PY.png';
import UYFlag from '@/assets/flags/UY.png';
import CUFlag from '@/assets/flags/CU.png';
import HTFlag from '@/assets/flags/HT.png';
import {
  Gamepad2, Trophy, Store, Users, LifeBuoy, Shield, Wallet, History,
  Menu, LogOut, User as UserIcon, Crown, LogIn,
} from 'lucide-react';

const COUNTRIES = [
  { code: 'CO', name: 'Colombia', flag: COFlag },
  { code: 'MX', name: 'México', flag: MXFlag },
  { code: 'AR', name: 'Argentina', flag: ARFlag },
  { code: 'BR', name: 'Brasil', flag: BRFlag },
  { code: 'CL', name: 'Chile', flag: CLFlag },
  { code: 'PE', name: 'Perú', flag: PEFlag },
  { code: 'VE', name: 'Venezuela', flag: VEFlag },
  { code: 'BO', name: 'Bolivia', flag: BOFlag },
  { code: 'DO', name: 'República Dominicana', flag: DOFlag },
  { code: 'EC', name: 'Ecuador', flag: ECFlag },
  { code: 'SV', name: 'El Salvador', flag: SVFlag },
  { code: 'GT', name: 'Guatemala', flag: GTFlag },
  { code: 'HN', name: 'Honduras', flag: HNFlag },
  { code: 'NI', name: 'Nicaragua', flag: NIFlag },
  { code: 'PA', name: 'Panamá', flag: PAFlag },
  { code: 'PY', name: 'Paraguay', flag: PYFlag },
  { code: 'UY', name: 'Uruguay', flag: UYFlag },
  { code: 'CU', name: 'Cuba', flag: CUFlag },
  { code: 'HT', name: 'Haití', flag: HTFlag },
];

export type PageId = 'home' | 'profile' | 'rankings' | 'store' | 'clans' | 'support' | 'admin' | 'wallet' | 'purchase-history' | 'level-rewards';

type NavItem = {
  id: PageId;
  label: string;
  icon: typeof Gamepad2;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Inicio', icon: Gamepad2 },
  { id: 'rankings', label: 'Rankings', icon: Trophy },
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'clans', label: 'Clanes', icon: Users },
  { id: 'wallet', label: 'Billetera', icon: Wallet },
  { id: 'purchase-history', label: 'Historial', icon: History },
  { id: 'level-rewards', label: 'Recompensas', icon: Crown },
  { id: 'support', label: 'Soporte', icon: LifeBuoy },
  { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
];

type Props = {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
};

export default function Layout({ currentPage, onNavigate, children }: Props) {
  const { profile, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || profile?.is_admin);

  const rankInfo = profile ? RANK_INFO[profile.rank] : null;

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return '';
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country ? country.flag : '';
  };

  const getProfileData = () => {
    if (!profile?.username) return { avatar_url: '', country: '' };
    const stored = localStorage.getItem(`profile_${profile.username}`);
    return stored ? JSON.parse(stored) : { avatar_url: '', country: '' };
  };

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center px-6 py-6 border-b border-white/5">
        <img src="/src/assets/logo-sidebar.png" alt="Combat Arms" className="h-32 w-auto object-contain" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 shadow-inner'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />}
            </button>
          );
        })}
      </nav>

      {profile && profile.username && (
        <div className="border-t border-white/5 p-3">
          <button
            onClick={() => { onNavigate('profile'); setMobileOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{profile.NickName || profile.username}</p>
            </div>
            {profile.is_admin && <Crown className="h-4 w-4 text-amber-400" />}
          </button>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:text-rose-400"
          >
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesion
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-fuchsia-500/5 blur-3xl" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r border-white/5 bg-[#0d1320]/80 backdrop-blur-xl lg:block">
        {Sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/5 bg-[#0d1320] lg:hidden">
            {Sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Desktop header */}
        <header className="sticky top-0 z-20 hidden border-b border-white/5 bg-[#0a0e17]/80 px-8 py-4 backdrop-blur-xl lg:flex lg:items-center lg:justify-between">
          <div></div>
          {profile ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-3 justify-end">
                    <p className="text-sm font-semibold text-white">{profile.NickName || profile.username}</p>
                  </div>
                  <p className="text-xs text-slate-400">En línea</p>
                </div>
              </div>
              <div className="h-10 w-px bg-white/10"></div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 transition-all hover:bg-red-500/30"
              >
                <LogOut className="h-4 w-4" /> Salir
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-2 font-semibold text-cyan-300 transition-all hover:from-cyan-500/30 hover:to-blue-500/30"
            >
              <LogIn className="h-4 w-4" /> Iniciar Sesión
            </button>
          )}
        </header>

        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#0a0e17]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-cyan-400" />
            <span className="font-bold">Combat Arms</span>
          </div>
          {profile ? (
            <div className="flex items-center gap-2">
              <button
                onClick={signOut}
                className="rounded-lg p-2 text-red-400 hover:bg-red-500/20"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-500/30"
            >
              <LogIn className="h-4 w-4" /> Login
            </button>
          )}
        </header>

        <main className="relative z-10 px-4 py-6 lg:px-8 lg:py-8">
          {loading ? (
            <div className="flex h-[70vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
            </div>
          ) : !profile && currentPage !== 'home' ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
              <Gamepad2 className="h-16 w-16 text-cyan-400/50" />
              <h2 className="mt-4 text-2xl font-bold">Inicia sesión para continuar</h2>
              <p className="mt-2 text-slate-400">Crea tu cuenta o inicia sesión para acceder a esta sección</p>
              <button
                onClick={() => setLoginModalOpen(true)}
                className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105"
              >
                <LogIn className="h-5 w-5" /> Iniciar Sesión
              </button>
            </div>
          ) : (
            children
          )}
        </main>
        
        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onSuccess={() => window.location.reload()} />
      </div>
    </div>
  );
}
