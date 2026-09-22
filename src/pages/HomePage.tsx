import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Gamepad2, Trophy, Users, Store, Wallet, TrendingUp, Zap, ChevronRight, Crown, Activity, ChevronLeft } from 'lucide-react';
import type { PageId } from '@/components/Layout';

const RANK_INFO: Record<string, { label: string; color: string }> = {
  unranked: { label: 'Unranked', color: 'text-slate-400' },
  bronze: { label: 'Bronze', color: 'text-amber-700' },
  silver: { label: 'Silver', color: 'text-slate-300' },
  gold: { label: 'Gold', color: 'text-yellow-400' },
  platinum: { label: 'Platinum', color: 'text-cyan-300' },
  diamond: { label: 'Diamond', color: 'text-sky-400' },
  master: { label: 'Master', color: 'text-fuchsia-400' },
  grandmaster: { label: 'Grandmaster', color: 'text-rose-400' },
};

export default function HomePage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [showRequirements, setShowRequirements] = useState(false);
  const [currentSystemImage, setCurrentSystemImage] = useState(0);
  const [currentCarousel2Image, setCurrentCarousel2Image] = useState(0);
  const [currentCarousel3Image, setCurrentCarousel3Image] = useState(0);

  const systemImages = [
    '/src/assets/system-1.png',
    '/src/assets/system-2.png',
    '/src/assets/system-3.png',
  ];

  const carousel2Images = [
    '/src/assets/carousel2-1.png',
    '/src/assets/carousel2-2.png',
  ];

  const carousel3Images = [
    '/src/assets/carousel3-1.png',
    '/src/assets/carousel3-2.png',
    '/src/assets/carousel3-3.png',
    '/src/assets/carousel3-4.png',
    '/src/assets/carousel3-5.png',
    '/src/assets/carousel3-6.png',
  ];

  useEffect(() => {
    // Solo ejecutar si estamos en el navegador
    if (typeof window === 'undefined') return;

    (async () => {
      try {
        const [t, top, count] = await Promise.all([
          api.getTournaments(),
          api.getTopPlayers(5),
          api.getPlayersCount(),
        ]);
        setTournaments(t);
        setTopPlayers(top);
        setTotalPlayers(count.total);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    })();
  }, []);

  return (
    <div className="space-y-12 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#0d1525] via-[#0a0e17] to-[#120d1a] px-6 py-48 lg:px-16 lg:py-64">
        {/* Video background */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/src/assets/combat-arms-trailer.mp4" type="video/mp4" />
          </video>
          {/* Overlay oscuro sobre el video */}
          <div className="absolute inset-0 bg-black/55" />
        </div>
        
        {/* Gradientes decorativos (opcional, encima del video) */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/4 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-5xl">
          <h1 className="text-6xl font-black leading-tight tracking-tight lg:text-8xl">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent">Combat Arms Reforged</span>
          </h1>
          <p className="mt-10 max-w-3xl text-2xl text-slate-200">
            La plataforma competitiva definitiva. Compite, sube en el ranking, forma clanes,
            gana premios y demuestra que eres el mejor.
          </p>
        </div>
      </section>

      {/* Download Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-amber-900/30 via-[#0d1320] to-orange-900/20 px-6 py-16 lg:px-16 lg:py-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        </div>
        
        <div className="relative z-10 text-center">
          <h2 className="text-4xl font-black lg:text-5xl mb-12">
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">¡Descarga Ahora!</span>
          </h2>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-slate-300">
            Únete a miles de jugadores en la plataforma competitiva definitiva. 
            Descarga Combat Arms Reforged y comienza tu aventura hoy.
          </p>
          
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a 
              href="https://www.mediafire.com/file/70z692y8n25zi8r/CombatArmsReforged.rar/file"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-12 py-6 text-xl font-bold text-white shadow-xl shadow-amber-500/30 transition-all hover:scale-105"
            >
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              DESCARGAR
            </a>
            
            <button 
              onClick={() => setShowRequirements(true)}
              className="flex items-center gap-3 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 px-12 py-6 text-xl font-bold text-amber-300 transition-all hover:bg-amber-500/20 backdrop-blur">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              REQUISITOS
            </button>
          </div>
        </div>
      </section>

      {/* Featured Items Carousel Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-amber-900/30 via-[#0d1320] to-orange-900/20 px-6 py-12 lg:px-16 lg:py-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 right-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        </div>
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Carousel 1 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between gap-2 w-full mb-4">
              <button 
                onClick={() => setCurrentSystemImage((prev) => (prev - 1 + systemImages.length) % systemImages.length)}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 transition-all hover:bg-amber-500/20 backdrop-blur"
              >
                <ChevronLeft className="h-4 w-4 text-amber-400" />
              </button>
              
              <div className="relative w-40 h-48 rounded-lg border border-amber-500/30 overflow-hidden bg-[#0a0e17]">
                <img 
                  src={systemImages[currentSystemImage]} 
                  alt={`Item ${currentSystemImage + 1}`} 
                  className="h-full w-full object-cover"
                />
              </div>
              
              <button 
                onClick={() => setCurrentSystemImage((prev) => (prev + 1) % systemImages.length)}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 transition-all hover:bg-amber-500/20 backdrop-blur"
              >
                <ChevronRight className="h-4 w-4 text-amber-400" />
              </button>
            </div>
            
            <div className="flex justify-center gap-2">
              {systemImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSystemImage(i)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === currentSystemImage ? 'bg-amber-500' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Carousel 2 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between gap-2 w-full mb-4">
              <button 
                onClick={() => setCurrentCarousel2Image((prev) => (prev - 1 + carousel2Images.length) % carousel2Images.length)}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 transition-all hover:bg-amber-500/20 backdrop-blur"
              >
                <ChevronLeft className="h-4 w-4 text-amber-400" />
              </button>
              
              <div className="relative w-40 h-48 rounded-lg border border-amber-500/30 overflow-hidden bg-[#0a0e17]">
                <img 
                  src={carousel2Images[currentCarousel2Image]} 
                  alt={`Item ${currentCarousel2Image + 1}`} 
                  className="h-full w-full object-cover"
                />
              </div>
              
              <button 
                onClick={() => setCurrentCarousel2Image((prev) => (prev + 1) % carousel2Images.length)}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 transition-all hover:bg-amber-500/20 backdrop-blur"
              >
                <ChevronRight className="h-4 w-4 text-amber-400" />
              </button>
            </div>
            
            <div className="flex justify-center gap-2">
              {carousel2Images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentCarousel2Image(i)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === currentCarousel2Image ? 'bg-amber-500' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Carousel 3 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between gap-2 w-full mb-4">
              <button 
                onClick={() => setCurrentCarousel3Image((prev) => (prev - 1 + carousel3Images.length) % carousel3Images.length)}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 transition-all hover:bg-amber-500/20 backdrop-blur"
              >
                <ChevronLeft className="h-4 w-4 text-amber-400" />
              </button>
              
              <div className="relative w-40 h-48 rounded-lg border border-amber-500/30 overflow-hidden bg-[#0a0e17]">
                <img 
                  src={carousel3Images[currentCarousel3Image]} 
                  alt={`Item ${currentCarousel3Image + 1}`} 
                  className="h-full w-full object-cover"
                />
              </div>
              
              <button 
                onClick={() => setCurrentCarousel3Image((prev) => (prev + 1) % carousel3Images.length)}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 p-2 transition-all hover:bg-amber-500/20 backdrop-blur"
              >
                <ChevronRight className="h-4 w-4 text-amber-400" />
              </button>
            </div>
            
            <div className="flex justify-center gap-2">
              {carousel3Images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentCarousel3Image(i)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i === currentCarousel3Image ? 'bg-amber-500' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tournaments */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Torneos Destacados</h2>
          <button onClick={() => onNavigate('rankings')} className="text-sm text-cyan-400 hover:text-cyan-300">Ver todos</button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(tournaments || []).map(t => (
            <div key={t.id} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f1623] to-[#0a0e17] p-6 transition-all hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  t.status === 'registration' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'
                }`}>
                  {t.status === 'registration' ? 'Inscripciones Abiertas' : 'Proximamente'}
                </span>
                <TrendingUp className="h-4 w-4 text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-white">{t.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{t.game}</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                <div>
                  <p className="text-xs text-slate-500">Premio</p>
                  <p className="text-lg font-bold text-amber-400">${(t.prize_pool || 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Cupos</p>
                  <p className="text-lg font-bold text-cyan-400">{t.max_participants || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Requirements Modal */}
      {showRequirements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0d1320] p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-amber-400">Requisitos del Sistema</h2>
              <button
                onClick={() => setShowRequirements(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-slate-300 mb-8">
              Combat Arms actualmente solo es compatible con Windows. Actualmente no hay soporte para Mac o Linux.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-3 text-left text-amber-400 font-semibold">Requisitos</th>
                    <th className="px-6 py-3 text-left text-amber-400 font-semibold">Mínimo</th>
                    <th className="px-6 py-3 text-left text-amber-400 font-semibold">Recomendado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-400">S.O</td>
                    <td className="px-6 py-4 text-white font-medium">WINDOWS 2000</td>
                    <td className="px-6 py-4 text-white font-medium">WINDOWS XP o superior</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-400">PROCESADOR</td>
                    <td className="px-6 py-4 text-white font-medium">Pentium 3-1GHz+</td>
                    <td className="px-6 py-4 text-white font-medium">Pentium 4-2.4GHz+</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-400">MEMORIA</td>
                    <td className="px-6 py-4 text-white font-medium">256MB RAM</td>
                    <td className="px-6 py-4 text-white font-medium">512MB RAM</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-400">TARJETA GRÁFICA</td>
                    <td className="px-6 py-4 text-white font-medium">GeForce 2MX</td>
                    <td className="px-6 py-4 text-white font-medium">GeForce FX 5600 o superior</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-400">DIRECT X</td>
                    <td className="px-6 py-4 text-white font-medium">Versión 9.0C o posterior</td>
                    <td className="px-6 py-4 text-white font-medium">Versión 9.0C o posterior</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-400">ESPACIO EN DISCO</td>
                    <td className="px-6 py-4 text-white font-medium">2.0GB</td>
                    <td className="px-6 py-4 text-white font-medium">2.0GB</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="px-6 py-4 text-slate-400">CONEXIÓN A INTERNET</td>
                    <td className="px-6 py-4 text-white font-medium">Cable/DSL</td>
                    <td className="px-6 py-4 text-white font-medium">Cable/DSL o superior</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowRequirements(false)}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 font-semibold text-white shadow-lg shadow-amber-500/30 transition-all hover:scale-105"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0d1320]/50 px-6 py-8">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="flex gap-6">
            <a
              href="https://discord.gg/5EpJwAh2r6"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:shadow-indigo-500/50"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.3671a19.8062 19.8062 0 00-4.885-1.515a.074.074 0 00-.079.0366c-.211.3671-.444.8426-.607 1.2182a18.27 18.27 0 00-5.487 0c-.163-.3756-.399-.8511-.61-1.2182a.077.077 0 00-.079-.0355c-1.675.289-3.29.89-4.885 1.515a.07.07 0 00-.032.0277C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.0605c2.0946 1.5348 4.1353 2.466 6.1545 3.0823a.078.078 0 00.085-.0276c.462-.6171.873-1.266 1.226-1.9466a.076.076 0 00-.041-.1061a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2457 10.2457 0 00.372-.294.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.294a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.076.076 0 00-.041.107c.36.699.77 1.349 1.225 1.947a.077.077 0 00.084.028c2.04-.617 4.081-1.548 6.165-3.083a.077.077 0 00.032-.0605c.504-4.944-.838-9.233-3.549-13.002a.061.061 0 00-.031-.0277zM8.02 15.3312c-1.1825 0-2.1569-.9718-2.1569-2.1771 0-1.2054.9555-2.1772 2.1569-2.1772 1.2108 0 2.1757.9718 2.1568 2.1772 0 1.2053-.9555 2.1771-2.1568 2.1771zm7.9748 0c-1.1825 0-2.1569-.9718-2.1569-2.1771 0-1.2054.9554-2.1772 2.1569-2.1772 1.2108 0 2.1757.9718 2.1568 2.1772 0 1.2053-.946 2.1771-2.1568 2.1771Z"/>
              </svg>
              Únete a Discord
            </a>
          </div>
          <p className="text-sm text-slate-400">
            © 2026 @Reforged. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-5 transition-all hover:border-white/10">
      <Icon className={`h-6 w-6 ${color}`} />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, iconColor }: { icon: typeof Users; title: string; desc: string; color: string; iconColor: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${color} p-6 transition-all hover:border-white/10`}>
      <Icon className={`h-8 w-8 ${iconColor}`} />
      <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{desc}</p>
    </div>
  );
}


