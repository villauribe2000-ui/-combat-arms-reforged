import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Trophy, Target, TrendingUp, Wallet, Upload, Globe, ChevronDown } from 'lucide-react';

interface ProfileData {
  id: number;
  username: string;
  NickName: string;
  kills: number;
  deaths: number;
  wins: number;
  losses: number;
  Money: number;
  nx?: number;
  gp?: number;
  avatar_url?: string;
  bio?: string;
  country?: string;
  rank?: number;
  rankName?: string;
  isGM?: boolean;
  UserType?: number;
  progressPercent?: number;
  levelMessage?: string;
  level?: number;
  levelRewards?: Record<number, number>;
  maxLevel?: number;
  clan?: string;
  clanID?: number;
}

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

export default function ProfilePage() {
  const { profile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [claimedLevelRewards, setClaimedLevelRewards] = useState<number[]>([]);

  useEffect(() => {
    if (!profile?.username) return;
    
    (async () => {
      try {
        const dbProfile = await api.getProfile(profile.username);
        const stored = localStorage.getItem(`profile_${profile.username}`);
        const storedData = stored ? JSON.parse(stored) : {};
        
        // Asegurar que el countryFlag esté presente
        let countryFlag = storedData.countryFlag || '';
        if (!countryFlag && storedData.country) {
          const countryObj = COUNTRIES.find(c => c.code === storedData.country);
          countryFlag = countryObj ? countryObj.flag : '';
        }

        // Tabla de patentes con XP requerido
        const PATENTES = [
          {"exp": 0, "nivel": 0},
          {"exp": 550, "nivel": 1},
          {"exp": 1200, "nivel": 2},
          {"exp": 2500, "nivel": 3},
          {"exp": 5000, "nivel": 4},
          {"exp": 8700, "nivel": 5},
          {"exp": 15000, "nivel": 6},
          {"exp": 22000, "nivel": 7},
          {"exp": 30500, "nivel": 8},
          {"exp": 40500, "nivel": 9},
          {"exp": 52000, "nivel": 10},
          {"exp": 65000, "nivel": 11},
          {"exp": 81000, "nivel": 12},
          {"exp": 99000, "nivel": 13},
          {"exp": 119000, "nivel": 14},
          {"exp": 141000, "nivel": 15},
          {"exp": 166000, "nivel": 16},
          {"exp": 194000, "nivel": 17},
          {"exp": 225000, "nivel": 18},
          {"exp": 259000, "nivel": 19},
          {"exp": 296000, "nivel": 20},
          {"exp": 336000, "nivel": 21},
          {"exp": 379000, "nivel": 22},
          {"exp": 425000, "nivel": 23},
          {"exp": 474000, "nivel": 24},
          {"exp": 526000, "nivel": 25},
          {"exp": 580000, "nivel": 26},
          {"exp": 638000, "nivel": 27},
          {"exp": 699000, "nivel": 28},
          {"exp": 763000, "nivel": 29},
          {"exp": 830000, "nivel": 30},
          {"exp": 900000, "nivel": 31},
          {"exp": 983000, "nivel": 32},
          {"exp": 1074000, "nivel": 33},
          {"exp": 1173000, "nivel": 34},
          {"exp": 1280000, "nivel": 35},
          {"exp": 1400000, "nivel": 36},
          {"exp": 1533000, "nivel": 37},
          {"exp": 1679000, "nivel": 38},
          {"exp": 1838000, "nivel": 39},
          {"exp": 2010000, "nivel": 40},
          {"exp": 2200000, "nivel": 41},
          {"exp": 2408000, "nivel": 42},
          {"exp": 2634000, "nivel": 43},
          {"exp": 2878000, "nivel": 44},
          {"exp": 3140000, "nivel": 45},
          {"exp": 3420000, "nivel": 46},
          {"exp": 3718000, "nivel": 47},
          {"exp": 4034000, "nivel": 48},
          {"exp": 4368000, "nivel": 49},
          {"exp": 4720000, "nivel": 50},
          {"exp": 5100000, "nivel": 51},
          {"exp": 5500000, "nivel": 52},
          {"exp": 6000000, "nivel": 53},
          {"exp": 6800000, "nivel": 54},
          {"exp": 8000000, "nivel": 55},
          {"exp": 9200000, "nivel": 56},
          {"exp": 10400000, "nivel": 57},
          {"exp": 11600000, "nivel": 58},
          {"exp": 12800000, "nivel": 59},
          {"exp": 14000000, "nivel": 60},
          {"exp": 29000000, "nivel": 61},
          {"exp": 44000000, "nivel": 62},
          {"exp": 59000000, "nivel": 63},
          {"exp": 74000000, "nivel": 64},
          {"exp": 89000000, "nivel": 65}
        ];

        // Tabla de recompensas por nivel (NX por cada nivel)
        const LEVEL_REWARDS = {
          0: 5, 1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35, 7: 40, 8: 45, 9: 50,
          10: 55, 11: 60, 12: 65, 13: 70, 14: 75, 15: 80, 16: 85, 17: 90, 18: 95, 19: 100,
          20: 110, 21: 120, 22: 130, 23: 140, 24: 150, 25: 160, 26: 170, 27: 180, 28: 190, 29: 200,
          30: 220, 31: 240, 32: 260, 33: 280, 34: 300, 35: 330, 36: 360, 37: 390, 38: 420, 39: 450,
          40: 500, 41: 550, 42: 600, 43: 650, 44: 700, 45: 800, 46: 900, 47: 1000, 48: 1100, 49: 1200,
          50: 1300, 51: 1400, 52: 1500, 53: 1600, 54: 1700, 55: 1800, 56: 1900, 57: 2000, 58: 2100, 59: 2200,
          60: 2500, 61: 3000, 62: 3500, 63: 4000, 64: 4500, 65: 5000
        };

        // Calcular progreso de nivel basado en XP
        let progressPercent = 0;
        let levelMessage = '';
        let currentLevelNumber = 0;
        const userExp = dbProfile.Exp || 0;

        // Detectar máximo nivel (XP negativo o muy alto)
        if (userExp < 0 || userExp >= 89000000) {
          // Máximo nivel alcanzado
          currentLevelNumber = 65;
          progressPercent = 100;
          levelMessage = `Nivel Máximo (65)`;
        } else {
          // Encontrar nivel actual
          let currentLevelIndex = 0;
          for (let i = PATENTES.length - 1; i >= 0; i--) {
            if (userExp >= PATENTES[i].exp) {
              currentLevelIndex = i;
              break;
            }
          }

          const currentLevel = PATENTES[currentLevelIndex];
          const nextLevel = PATENTES[currentLevelIndex + 1];
          currentLevelNumber = currentLevel.nivel;

          if (!nextLevel) {
            // Máximo nivel alcanzado
            progressPercent = 100;
            levelMessage = `Nivel Máximo (${currentLevel.nivel})`;
          } else {
            // Calcular progreso hacia el siguiente nivel
            const expNeeded = nextLevel.exp - currentLevel.exp;
            const expGained = userExp - currentLevel.exp;
            progressPercent = Math.round((expGained / expNeeded) * 100);
            levelMessage = `Nivel ${currentLevel.nivel} → ${nextLevel.nivel}`;
          }
        }
        
        const combined = {
          ...dbProfile,
          avatar_url: storedData.avatar_url,
          bio: storedData.bio,
          country: storedData.country,
          countryFlag: countryFlag,
          nx: profile.nx,
          gp: dbProfile.Money,
          progressPercent,
          levelMessage,
          level: currentLevelNumber,
          levelRewards: LEVEL_REWARDS,
          maxLevel: currentLevelNumber,
        };
        
        setProfileData(combined);
        setAvatarUrl(storedData.avatar_url || '');
        setSelectedCountry(storedData.country || '');

        // Cargar recompensas de nivel reclamadas
        const claimedRewardsKey = `level_rewards_${profile?.username}`;
        const claimedRewardsData = localStorage.getItem(claimedRewardsKey) || '[]';
        setClaimedLevelRewards(JSON.parse(claimedRewardsData));
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    })();
  }, [profile]);

  if (!profileData) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAvatarUrl(base64);
        
        localStorage.setItem(`profile_${profile?.username}`, JSON.stringify({
          avatar_url: base64,
          bio: '',
          country: selectedCountry,
        }));
        
        setProfileData({
          ...profileData,
          avatar_url: base64,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    
    localStorage.setItem(`profile_${profile?.username}`, JSON.stringify({
      avatar_url: avatarUrl,
      bio: '',
      country: countryCode,
    }));
    
    setProfileData({
      ...profileData,
      country: countryCode,
    });
    
    setShowCountrySelector(false);
  };

  const handleClaimLevelReward = (level: number) => {
    if (!profileData?.levelRewards) return;

    const reward = profileData.levelRewards[level] || 0;
    if (reward === 0 || claimedLevelRewards.includes(level)) return;

    // Marcar como reclamado
    const newClaimed = [...claimedLevelRewards, level];
    setClaimedLevelRewards(newClaimed);
    
    // Guardar en localStorage
    localStorage.setItem(`level_rewards_${profile?.username}`, JSON.stringify(newClaimed));
  };

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);
  const kdRatio = profileData.deaths > 0 ? (profileData.kills / profileData.deaths).toFixed(2) : profileData.kills.toFixed(2);

  return (
    <div className="space-y-6 pb-12">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5">
        <div 
          className="h-[30rem] bg-cover bg-center lg:h-96"
          style={{ backgroundImage: "url('/src/assets/profile-banner.png')" }}
        >
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div className="relative -mt-32 px-6 pb-6 lg:-mt-40 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex items-center justify-center rounded-2xl shadow-2xl h-40 w-40 flex-shrink-0 overflow-hidden">
                <img 
                  src={profileData?.UserType === 1 ? '/src/assets/ranks/RANK_GM.png' : `/src/assets/ranks/RANK_${profileData?.level || 0}.png`}
                  alt={profileData?.UserType === 1 ? 'GM' : `Level ${profileData?.level}`}
                  className="h-48 w-48 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/src/assets/ranks/RANK_0.png';
                  }}
                />
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold">{profileData.NickName}</h1>
                  {selectedCountryData && (
                    <img src={selectedCountryData.flag} alt={selectedCountryData.name} className="h-10 w-14 rounded-md object-cover shadow-lg" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatBox icon={Trophy} label="Kills" value={profileData.kills.toLocaleString()} color="text-emerald-400" />
        <StatBox icon={Target} label="Muertes" value={profileData.deaths.toLocaleString()} color="text-rose-400" />
        <StatBox icon={TrendingUp} label="K/D Ratio" value={kdRatio} color="text-cyan-400" />
        <StatBox icon={Wallet} label="NX" value={(profile?.nx || 0).toLocaleString()} color="text-blue-400" />
      </div>

      {/* GP Balance Card */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-amber-900/30 via-[#0d1320] to-yellow-900/20 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">GP BALANCE</p>
            <p className="text-4xl lg:text-5xl font-black text-amber-400">{(profile?.gp || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-2">Moneda del juego</p>
          </div>
          <div className="text-right">
            <Wallet className="h-16 w-16 text-amber-400 opacity-20" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
            <h2 className="mb-4 text-lg font-bold">Información del Personaje</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 px-4 py-2">
                  <p className="text-xs text-slate-500">Kills</p>
                  <p className="font-bold text-emerald-400">{profileData.kills.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white/5 px-4 py-2">
                  <p className="text-xs text-slate-500">Muertes</p>
                  <p className="font-bold text-rose-400">{profileData.deaths.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white/5 px-4 py-2">
                  <p className="text-xs text-slate-500">K/D</p>
                  <p className="font-bold text-cyan-400">{kdRatio}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
            <h2 className="mb-4 text-lg font-bold">Progreso de Nivel</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 px-4 py-3">
                  <p className="text-xs text-slate-400">NIVEL ACTUAL</p>
                  <p className="text-3xl font-black text-purple-400 mt-1">{profileData.level}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 px-4 py-3">
                  <p className="text-xs text-slate-400">PROGRESO</p>
                  <p className="text-3xl font-black text-cyan-400 mt-1">{profileData.progressPercent || 0}%</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-cyan-400 mb-2">{profileData.levelMessage}</p>
                <div className="relative w-full h-6 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                    style={{ width: `${profileData.progressPercent || 0}%` }}
                  />
                  <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {profileData.progressPercent || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Clan Info */}
          {profileData.clan && (
            <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
              <h2 className="mb-4 text-lg font-bold">Clan</h2>
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Clan actual:</p>
                <p className="text-xl font-bold text-purple-400">{profileData.clan}</p>
              </div>
            </div>
          )}

          {/* Country Selector */}
          <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">País / Región</h2>
                <p className="text-sm text-slate-400 mt-1">Selecciona tu país una sola vez</p>
              </div>
              {selectedCountryData && (
                <img src={selectedCountryData.flag} alt={selectedCountryData.name} className="h-16 w-24 rounded-md object-cover" />
              )}
            </div>

            {selectedCountry ? (
              <div className="mt-4 rounded-xl bg-white/5 px-4 py-3">
                <p className="text-sm text-slate-400">País seleccionado:</p>
                <div className="flex items-center gap-3 mt-2">
                  {selectedCountryData && (
                    <img src={selectedCountryData.flag} alt={selectedCountryData.name} className="h-12 w-16 rounded-md object-cover" />
                  )}
                  <p className="text-lg font-semibold text-white">{selectedCountryData?.name}</p>
                </div>
                <p className="text-xs text-slate-500 mt-2">✓ No se puede cambiar después de seleccionar</p>
              </div>
            ) : (
              <div className="relative mt-4">
                <button
                  onClick={() => setShowCountrySelector(!showCountrySelector)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left font-semibold text-white hover:bg-white/10 transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Seleccionar país
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${showCountrySelector ? 'rotate-180' : ''}`} />
                </button>

                {showCountrySelector && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-10 rounded-xl border border-white/10 bg-[#0a0e17] shadow-xl max-h-64 overflow-y-auto">
                    {COUNTRIES.map(country => (
                      <button
                        key={country.code}
                        onClick={() => handleCountrySelect(country.code)}
                        className="w-full px-4 py-3 text-left hover:bg-white/10 transition flex items-center gap-3 border-b border-white/5"
                      >
                        <img src={country.flag} alt={country.name} className="h-6 w-8 rounded object-cover" />
                        <span className="text-sm font-semibold text-white">{country.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
            <h2 className="mb-4 text-sm font-bold">Estadísticas</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Victorias</span>
                <span className="font-bold text-white">{profileData.wins.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Derrotas</span>
                <span className="font-bold text-white">{profileData.losses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Racha K/D</span>
                <span className="font-bold text-cyan-400">{kdRatio}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: typeof Trophy; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-5">
      <Icon className={`h-5 w-5 ${color}`} />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
