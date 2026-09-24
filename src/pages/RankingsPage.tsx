import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Crown, Search, Trophy, X, TrendingUp, Target, Wallet } from 'lucide-react';
import rankGM from '@/assets/ranks/RANK_GM.png';
import rank0 from '@/assets/ranks/RANK_0.png';
import rank1 from '@/assets/ranks/RANK_1.png';
import rank2 from '@/assets/ranks/RANK_2.png';
import rank3 from '@/assets/ranks/RANK_3.png';
import rank4 from '@/assets/ranks/RANK_4.png';
import rank5 from '@/assets/ranks/RANK_5.png';
import rank6 from '@/assets/ranks/RANK_6.png';
import rank7 from '@/assets/ranks/RANK_7.png';
import rank8 from '@/assets/ranks/RANK_8.png';
import rank9 from '@/assets/ranks/RANK_9.png';
import rank10 from '@/assets/ranks/RANK_10.png';
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

const RANK_IMAGES: Record<number | string, string> = {
  'GM': rankGM,
  0: rank0,
  1: rank1,
  2: rank2,
  3: rank3,
  4: rank4,
  5: rank5,
  6: rank6,
  7: rank7,
  8: rank8,
  9: rank9,
  10: rank10,
};

const getRankImage = (rank: number | string | boolean | null | undefined) => {
  if (rank === 'GM' || rank === true) return rankGM;
  const rankNum = Number(rank) || 0;
  return RANK_IMAGES[rankNum] || rank0;
};
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

interface Player {
  id: number;
  username: string;
  NickName: string;
  kills: number;
  deaths: number;
  wins: number;
  losses: number;
  Money?: number;
  avatar_url?: string;
  country?: string;
  countryFlag?: string;
  rank?: number;
  rankName?: string;
  isGM?: boolean;
}

export default function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getTopPlayers(100);
        
        const playersWithAvatars = data.map((player: Player) => {
          const stored = localStorage.getItem(`profile_${player.username}`);
          const storedData = stored ? JSON.parse(stored) : {};
          return {
            ...player,
            avatar_url: storedData.avatar_url,
            country: storedData.country,
          };
        });
        
        setPlayers(playersWithAvatars);
      } catch (error) {
        console.error('Error fetching players:', error);
        setPlayers([]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = players.filter(p => {
    const matchSearch = (p.NickName || p.username).toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return '';
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country ? country.flag : '';
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black">Rankings</h1>
        <p className="mt-1 text-slate-400">Los mejores jugadores de la plataforma</p>
      </div>

      {/* Podium */}
      {filtered.length >= 3 && !search && (
        <div className="grid grid-cols-3 gap-4 lg:gap-6">
          <PodiumCard player={filtered[1]} place={2} className="mt-8" onClick={() => setSelectedPlayer(filtered[1])} countryFlag={getCountryFlag(filtered[1].country)} />
          <PodiumCard player={filtered[0]} place={1} onClick={() => setSelectedPlayer(filtered[0])} countryFlag={getCountryFlag(filtered[0].country)} />
          <PodiumCard player={filtered[2]} place={3} className="mt-12" onClick={() => setSelectedPlayer(filtered[2])} countryFlag={getCountryFlag(filtered[2].country)} />
        </div>
      )}

      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          className="w-full rounded-xl border border-white/10 bg-[#0d1320] py-2.5 pl-11 pr-4 text-sm text-white outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0d1320]">
        <div className="grid grid-cols-12 gap-2 border-b border-white/5 px-6 py-3 text-xs uppercase tracking-wider text-slate-500">
          <div className="col-span-1">#</div>
          <div className="col-span-5 sm:col-span-4">Personaje</div>
          <div className="col-span-2">Kills</div>
          <div className="col-span-2">Muertes</div>
          <div className="col-span-2 text-right">K/D Ratio</div>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
            <Trophy className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-3">No se encontraron jugadores</p>
          </div>
        ) : (
          filtered.map((player, i) => {
            const kdRatio = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2);
            const rankImage = '/ranks/RANK_0.png';
            return (
              <div 
                key={player.id} 
                className={`grid grid-cols-12 gap-2 px-6 py-3.5 items-center transition-colors hover:bg-white/5 cursor-pointer ${i !== filtered.length - 1 ? 'border-b border-white/5' : ''}`}
                onClick={() => setSelectedPlayer(player)}
              >
                <div className="col-span-1">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-white/5 text-slate-400'
                  }`}>
                    {i < 3 ? <Crown className="h-4 w-4" /> : i + 1}
                  </span>
                </div>
                <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                  <img 
                    src={'/ranks/RANK_0.png'}
                    alt="rank"
                    className="h-9 w-9 object-contain flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = '/assets/ranks/RANK_0.png';
                    }}
                  />
                  <div className="min-w-0 flex items-center gap-2 -mt-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {player.NickName || player.username}
                    </p>
                    {getCountryFlag(player.country) && (
                      <img src={getCountryFlag(player.country)} alt="country" className="h-5 w-7 rounded-sm flex-shrink-0 object-cover" />
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-emerald-400">{player.kills.toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-rose-400">{player.deaths.toLocaleString()}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="font-bold text-cyan-400">{kdRatio}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Perfil */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1320] to-[#0a0e17] p-8 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setSelectedPlayer(null)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {/* Avatar Grande */}
              <div className="flex flex-col items-center justify-center">
                <div className="mb-4 h-40 w-40 flex items-center justify-center">
                  <img 
                    src={'/ranks/RANK_0.png'} 
                    alt={selectedPlayer.isGM ? "GM" : "rank"} 
                    className="h-32 w-32 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = '/assets/ranks/RANK_0.png';
                    }}
                  />
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-4 mb-1">
                    <h2 className="text-3xl font-black text-white">{selectedPlayer.NickName}</h2>
                    {getCountryFlag(selectedPlayer.country) && (
                      <img src={getCountryFlag(selectedPlayer.country)} alt="country" className="h-10 w-14 rounded-lg object-cover" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <StatDetail icon={Target} label="Kills" value={selectedPlayer.kills.toLocaleString()} color="text-emerald-400" />
                  <StatDetail icon={Trophy} label="Muertes" value={selectedPlayer.deaths.toLocaleString()} color="text-rose-400" />
                  <StatDetail icon={TrendingUp} label="K/D Ratio" value={(selectedPlayer.deaths > 0 ? (selectedPlayer.kills / selectedPlayer.deaths).toFixed(2) : selectedPlayer.kills.toFixed(2))} color="text-cyan-400" />
                  <StatDetail icon={Wallet} label="Victorias" value={selectedPlayer.wins.toLocaleString()} color="text-blue-400" />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Derrotas</p>
                  <p className="mt-1 text-2xl font-bold text-rose-400">{selectedPlayer.losses.toLocaleString()}</p>
                </div>

                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold text-white transition-all hover:scale-105"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumCard({ player, place, className = '', onClick, countryFlag = '' }: { player: Player; place: number; className?: string; onClick: () => void; countryFlag?: string }) {
  const kdRatio = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2);
  const colors = {
    1: 'from-amber-500/20 to-amber-700/5 border-amber-500/30',
    2: 'from-slate-400/15 to-slate-600/5 border-slate-400/20',
    3: 'from-amber-700/15 to-orange-900/5 border-amber-700/20',
  };
  const iconColors = { 1: 'text-amber-400', 2: 'text-slate-300', 3: 'text-amber-600' };
  const heights = { 1: 'h-40', 2: 'h-32', 3: 'h-28' };

  const rankImage = player.isGM ? '/assets/ranks/RANK_GM.png' : `/assets/ranks/RANK_${player.rank || 0}.png`;

  return (
    <div className={`flex flex-col items-center cursor-pointer ${className}`} onClick={onClick}>
      <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colors[place as 1 | 2 | 3]} p-5 text-center transition-transform hover:scale-105`}>
        <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center">
          <img 
            src={rankImage} 
            alt="rank" 
            className="h-full w-full object-contain"
            onError={(e) => {
              e.currentTarget.src = '/assets/ranks/RANK_0.png';
            }}
          />
          {place === 1 && <Crown className={`absolute top-0 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-2 ${iconColors[1]}`} fill="currentColor" />}
          {place === 2 && <Crown className={`absolute top-0 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1 text-slate-300`} fill="currentColor" />}
          {place === 3 && <Crown className={`absolute top-0 left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1 text-amber-600`} fill="currentColor" />}
        </div>
        <p className="truncate text-sm font-bold text-white">{player.NickName || player.username}</p>
        <p className={`mt-2 text-2xl font-black ${iconColors[place as 1 | 2 | 3]}`}>{player.kills.toLocaleString()}</p>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">kills</p>
      </div>
      <div className={`mt-2 w-full rounded-b-xl bg-gradient-to-t ${colors[place as 1 | 2 | 3]} ${heights[place as 1 | 2 | 3]} flex items-start justify-center pt-2`}>
        <span className={`text-4xl font-black ${iconColors[place as 1 | 2 | 3]}`}>{place}</span>
      </div>
    </div>
  );
}

function StatDetail({ icon: Icon, label, value, color }: { icon: typeof Target; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
