import { useAuth } from '@/context/AuthContext';
import { Gamepad2 } from 'lucide-react';
import type { PageId } from '@/components/Layout';

export default function HomePage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-12 text-center">
        <Gamepad2 className="mx-auto h-16 w-16 text-cyan-400 mb-4" />
        <h1 className="text-4xl font-bold mb-2">Bienvenido a Combat Arms Reforged</h1>
        <p className="text-gray-400 mb-6">
          La plataforma competitiva definitiva. Compite, sube en el ranking, forma clanes, gana premios y demuestra que eres el mejor.
        </p>
        
        {profile && (
          <div className="inline-block bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-sm text-gray-400">Jugador: <span className="text-cyan-400 font-bold">{profile.username}</span></p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="text-3xl font-bold text-cyan-400 mb-2">15.2K</div>
          <div className="text-sm text-gray-400">Jugadores Activos</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="text-3xl font-bold text-purple-400 mb-2">847</div>
          <div className="text-sm text-gray-400">Partidas Diarias</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="text-3xl font-bold text-pink-400 mb-2">124</div>
          <div className="text-sm text-gray-400">Clanes Activos</div>
        </div>
      </div>

      {/* Navigation Suggestions */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h2 className="text-xl font-bold mb-6">Explora la plataforma:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('rankings')}
            className="text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/10"
          >
            <div className="font-semibold text-cyan-400">Rankings</div>
            <div className="text-sm text-gray-400">Consulta los mejores jugadores</div>
          </button>
          <button
            onClick={() => onNavigate('store')}
            className="text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/10"
          >
            <div className="font-semibold text-cyan-400">Tienda</div>
            <div className="text-sm text-gray-400">Compra items y skins</div>
          </button>
          <button
            onClick={() => onNavigate('clans')}
            className="text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/10"
          >
            <div className="font-semibold text-cyan-400">Clanes</div>
            <div className="text-sm text-gray-400">Únete o crea un clan</div>
          </button>
          <button
            onClick={() => onNavigate('wallet')}
            className="text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 transition border border-white/10"
          >
            <div className="font-semibold text-cyan-400">Billetera</div>
            <div className="text-sm text-gray-400">Gestiona tu dinero</div>
          </button>
        </div>
      </div>
    </div>
  );
}
