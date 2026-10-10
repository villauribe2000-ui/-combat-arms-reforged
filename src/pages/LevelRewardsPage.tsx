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

  // Tabla de recompensas por nivel
  const LEVEL_REWARDS: Record<number, number> = {
    0: 16, 1: 32, 2: 49, 3: 65, 4: 81, 5: 97, 6: 113, 7: 129, 8: 146, 9: 162,
    10: 178, 11: 194, 12: 210, 13: 227, 14: 243, 15: 259, 16: 275, 17: 291, 18: 307, 19: 323,
    20: 356, 21: 388, 22: 420, 23: 453, 24: 485, 25: 517, 26: 550, 27: 582, 28: 614, 29: 647,
    30: 712, 31: 776, 32: 841, 33: 906, 34: 971, 35: 1067, 36: 1163, 37: 1259, 38: 1356, 39: 1453,
    40: 1615, 41: 1778, 42: 1941, 43: 2104, 44: 2266, 45: 2588, 46: 2910, 47: 3232, 48: 3554, 49: 3876,
    50: 4199, 51: 4521, 52: 4843, 53: 5165, 54: 5487, 55: 5809, 56: 6131, 57: 6453, 58: 6775, 59: 7098,
    60: 8084
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
          userLevel = 65;
        } else {
          for (let i = PATENTES.length - 1; i >= 0; i--) {
            if (userExp >= PATENTES[i].exp) {
              userLevel = PATENTES[i].nivel;
              break;
            }
          }
        }

        setCurrentLevel(userLevel);

        // Cargar recompensas reclamadas
        const claimedKey = `level_rewards_${profile.username}`;
        const claimedData = localStorage.getItem(claimedKey) || '[]';
        const claimed = JSON.parse(claimedData);
        setClaimedLevelRewards(claimed);

        // Crear lista de recompensas
        const rewardsList: LevelReward[] = [];
        let claimableTotal = 0;

        for (let level = 0; level <= 65; level++) {
          const isUnlocked = level <= userLevel;
          const isClaimed = claimed.includes(level);
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
      localStorage.setItem(`level_rewards_${profile?.username}`, JSON.stringify(newClaimed));

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
              <p className="text-xs text-slate-500 mt-2">de 65 niveles máximo</p>
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
