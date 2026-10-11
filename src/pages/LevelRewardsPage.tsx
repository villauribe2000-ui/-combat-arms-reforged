import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Gift, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface LevelReward {
  level: number;
  reward: number;
  unlocked: boolean;
  claimed: boolean;
}

export default function LevelRewardsPage() {
  const { profile } = useAuth();
  const [rewards, setRewards] = useState<LevelReward[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [claimedLevelRewards, setClaimedLevelRewards] = useState<number[]>([]);
  const [totalClaimable, setTotalClaimable] = useState(0);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tabla de patentes con XP requerido (SOLO hasta nivel 60)
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
    {"exp": 14000000, "nivel": 60}
  ];

  // Tabla de recompensas por nivel (SOLO hasta nivel 60 - TOTAL: 200,000 NX)
  const LEVEL_REWARDS: Record<number, number> = {
    0: 100, 1: 200, 2: 300, 3: 400, 4: 500, 5: 600, 6: 700, 7: 800, 8: 900, 9: 1000,
    10: 1100, 11: 1200, 12: 1300, 13: 1400, 14: 1500, 15: 1600, 16: 1700, 17: 1800, 18: 1900, 19: 2000,
    20: 2100, 21: 2200, 22: 2300, 23: 2400, 24: 2500, 25: 2600, 26: 2700, 27: 2800, 28: 2900, 29: 3000,
    30: 3100, 31: 3200, 32: 3300, 33: 3400, 34: 3500, 35: 3600, 36: 3700, 37: 3800, 38: 3900, 39: 4000,
    40: 4100, 41: 4200, 42: 4300, 43: 4400, 44: 4500, 45: 4600, 46: 4700, 47: 4800, 48: 4900, 49: 5000,
    50: 5100, 51: 5200, 52: 5300, 53: 5400, 54: 5500, 55: 5600, 56: 5700, 57: 5800, 58: 5900, 59: 6000,
    60: 16100
  };

  useEffect(() => {
    if (!profile?.username) return;

    const loadData = async () => {
      try {
        // Obtener perfil para XP
        const dbProfile = await api.getProfile(profile.username);
        const userExp = dbProfile.Exp || 0;

        // Calcular nivel actual
        let userLevel = 0;
        if (userExp < 0 || userExp >= 89000000) {
          userLevel = 60; // Máximo es 60 para recompensas
        } else {
          for (let i = PATENTES.length - 1; i >= 0; i--) {
            if (userExp >= PATENTES[i].exp) {
              userLevel = Math.min(PATENTES[i].nivel, 60); // Limitar a 60
              break;
            }
          }
        }

        setCurrentLevel(userLevel);

        // Cargar recompensas reclamadas desde BD
        let claimedLevels = [];
        try {
          const claimedFromBD = await api.getClaimedRewards(profile.username || '');
          claimedLevels = claimedFromBD.map((r: any) => r.level);
        } catch (err) {
          console.warn('[DEBUG] Error loading claimed rewards from BD:', err);
          claimedLevels = [];
        }
        setClaimedLevelRewards(claimedLevels);

        // Crear lista de recompensas (SOLO hasta nivel 60)
        const rewardsList: LevelReward[] = [];
        let claimableTotal = 0;

        for (let level = 0; level <= 60; level++) {
          const isUnlocked = level <= userLevel;
          const isClaimed = claimedLevels.includes(level);
          const reward = LEVEL_REWARDS[level] || 0;

          rewardsList.push({
            level,
            reward,
            unlocked: isUnlocked,
            claimed: isClaimed,
          });

          if (isUnlocked && !isClaimed) {
            claimableTotal += reward;
          }
        }

        setRewards(rewardsList);
        setTotalClaimable(claimableTotal);
        
        // DEBUG
        console.log('[DEBUG Rewards] userLevel:', userLevel, 'userExp:', userExp);
        console.log('[DEBUG Rewards] Total Claimable:', claimableTotal);
        console.log('[DEBUG Rewards] Claimed levels:', claimed);
        console.log('[DEBUG Rewards] Total rewards array length:', rewardsList.length);
      } catch (error) {
        console.error('Error loading rewards:', error);
      }
    };

    loadData();
  }, [profile?.username]);

  const handleClaimReward = async (level: number) => {
    if (!rewards.find(r => r.level === level)?.unlocked) return;
    if (claimedLevelRewards.includes(level)) return;

    try {
      const nxReward = LEVEL_REWARDS[level] || 0;
      
      // Llamar al backend para sumar NX
      await api.claimLevelReward(profile?.username || '', level, nxReward);

      // Marcar como reclamado
      const newClaimed = [...claimedLevelRewards, level];
      setClaimedLevelRewards(newClaimed);
      // Ya está guardado en BD, no necesitamos localStorage

      // Actualizar rewards
      setRewards(
        rewards.map(r =>
          r.level === level ? { ...r, claimed: true } : r
        )
      );

      // Recalcular total reclamable
      const newClaimable = rewards.reduce((sum, r) => {
        const isClaimed = newClaimed.includes(r.level);
        return sum + (r.unlocked && !isClaimed ? r.reward : 0);
      }, 0);
      setTotalClaimable(newClaimable);

      setNotification({
        type: 'success',
        message: `+${nxReward} NX reclamados del Nivel ${level}!`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error claiming reward:', error);
      setNotification({
        type: 'error',
        message: 'Error al reclamar recompensa. Intenta de nuevo.',
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const claimedCount = claimedLevelRewards.length;
  const totalRewarded = claimedLevelRewards.reduce((sum, level) => sum + (LEVEL_REWARDS[level] || 0), 0);

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black">Recompensas de Nivel</h1>
        <p className="mt-1 text-slate-400">Reclama NX por cada nivel que alcances. Niveles superiores tienen mayores recompensas.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-purple-900/30 via-[#0d1320] to-purple-900/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">NIVEL ACTUAL</p>
              <p className="text-4xl lg:text-5xl font-black text-purple-400">{currentLevel}</p>
              <p className="text-xs text-slate-500 mt-2">de 60 niveles máximo</p>
            </div>
            <TrendingUp className="h-16 w-16 text-purple-400 opacity-20" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-900/30 via-[#0d1320] to-emerald-900/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">RECOMPENSAS RECLAMADAS</p>
              <p className="text-4xl lg:text-5xl font-black text-emerald-400">{claimedCount}</p>
              <p className="text-xs text-slate-500 mt-2">{totalRewarded.toLocaleString()} NX totales</p>
            </div>
            <Gift className="h-16 w-16 text-emerald-400 opacity-20" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-900/30 via-[#0d1320] to-cyan-900/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">DISPONIBLES PARA RECLAMAR</p>
              <p className="text-4xl lg:text-5xl font-black text-cyan-400">{totalClaimable.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">NX en {rewards.filter(r => r.unlocked && !r.claimed).length} niveles</p>
            </div>
            <CheckCircle className="h-16 w-16 text-cyan-400 opacity-20" />
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
        <h2 className="mb-4 text-lg font-bold">Todos los Niveles</h2>
        
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {rewards.map((reward) => (
            <div
              key={reward.level}
              className={`rounded-xl border p-4 transition ${
                reward.claimed
                  ? 'border-slate-700 bg-slate-900/20 opacity-60'
                  : reward.unlocked
                  ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 hover:from-emerald-500/30 hover:to-emerald-600/20'
                  : 'border-slate-700/50 bg-slate-900/20 opacity-50'
              }`}
            >
              <div className="mb-3">
                <p className="text-sm text-slate-400">Nivel</p>
                <p className="text-3xl font-black text-cyan-400">{reward.level}</p>
              </div>
              <div className="mb-4 p-2 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-slate-300">
                  <span className="font-bold text-emerald-400">+{reward.reward}</span> NX
                </p>
              </div>
              <button
                onClick={() => handleClaimReward(reward.level)}
                disabled={reward.claimed || !reward.unlocked}
                title={!reward.unlocked ? 'Alcanza este nivel primero' : ''}
                className={`w-full py-2 rounded-lg font-semibold transition text-xs ${
                  reward.claimed
                    ? 'bg-slate-700/20 text-slate-400 cursor-default'
                    : !reward.unlocked
                    ? 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                }`}
              >
                {reward.claimed ? '✓ Reclamado' : !reward.unlocked ? 'Bloqueado' : 'Reclamar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`flex items-center gap-3 rounded-lg px-6 py-4 border ${
            notification.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/20 border-red-500/30 text-red-300'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
