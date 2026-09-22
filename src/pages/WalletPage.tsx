import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Wallet, Crown, Upload, X, CheckCircle, AlertCircle, Gift, TrendingUp } from 'lucide-react';

interface GcoinPackage {
  id: number;
  coins: number;
  price: number;
}

export default function WalletPage() {
  const { profile } = useAuth();
  const [nxBalance, setNxBalance] = useState(0);
  const [gpBalance, setGpBalance] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<GcoinPackage | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProofPackage, setSelectedProofPackage] = useState<GcoinPackage | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [nxPurchases, setNxPurchases] = useState<{ packageId: number; coins: number; date: string; amount: number }[]>([]);
  const [rewards, setRewards] = useState<{ packageId: number; coins: number; bonus: number }[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<number[]>([]);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  const packages: GcoinPackage[] = [
    { id: 1, coins: 100, price: 0.13 },
    { id: 2, coins: 200, price: 0.27 },
    { id: 3, coins: 500, price: 0.67 },
    { id: 4, coins: 1000, price: 1.33 },
    { id: 5, coins: 1500, price: 2.00 },
    { id: 6, coins: 2000, price: 2.67 },
    { id: 7, coins: 3000, price: 4.00 },
    { id: 8, coins: 5000, price: 6.67 },
    { id: 9, coins: 10000, price: 13.33 },
    { id: 10, coins: 20000, price: 26.67 },
    { id: 11, coins: 30000, price: 40.00 },
  ];

  useEffect(() => {
    if (!profile) return;

    setNxBalance(profile.nx || 0);
    setGpBalance(profile.gp || 0);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const initializeData = async () => {
      try {
        // Obtener pagos aprobados del backend
        const approvedPayments = await api.getApprovedPaymentsNotRecorded(profile.username);
        
        console.log('Pagos aprobados recibidos del backend:', approvedPayments);
        
        if (approvedPayments && Array.isArray(approvedPayments) && approvedPayments.length > 0) {
          // Crear un nuevo array limpio solo con los pagos aprobados del mes actual
          const newPurchases = approvedPayments.map((payment: any) => {
            const paymentDate = new Date(payment.approvedAt);
            const dateStr = paymentDate.toLocaleDateString('es-CO');
            
            return {
              paymentId: payment.id,
              packageId: 0,
              coins: payment.nxAmount,
              date: dateStr,
              amount: payment.dollarAmount,
              timestamp: paymentDate.getTime(),
            };
          });

          console.log('✓ Sincronizando', newPurchases.length, 'pagos aprobados');
          
          // Guardar directamente, reemplazando lo anterior
          localStorage.setItem(`nx_purchases_${profile.username}`, JSON.stringify(newPurchases));
          console.log('✓ Datos sincronizados en localStorage');
          
          setNxPurchases(newPurchases);
          return;
        }
      } catch (error) {
        console.error('Error loading approved payments:', error);
      }

      // Si no hay pagos aprobados, cargar lo que esté en localStorage
      const allPurchases = localStorage.getItem(`nx_purchases_${profile.username}`) || '[]';
      let parsedPurchases = [];
      
      try {
        parsedPurchases = JSON.parse(allPurchases);
      } catch (e) {
        parsedPurchases = [];
      }
      
      console.log('Compras locales:', parsedPurchases);
      
      setNxPurchases(parsedPurchases);
    };

    initializeData();

    // Verificar si es un nuevo mes y reiniciar recompensas
    const lastRewardResetKey = `last_reward_reset_${profile.username}`;
    const lastReset = localStorage.getItem(lastRewardResetKey);
    
    let rewardsToUse: number[] = [];

    if (!lastReset) {
      rewardsToUse = [];
      localStorage.setItem(lastRewardResetKey, `${currentYear}-${currentMonth}`);
    } else {
      const [lastYear, lastMonth] = lastReset.split('-').map(Number);
      
      if (lastMonth !== currentMonth || lastYear !== currentYear) {
        rewardsToUse = [];
        localStorage.setItem(lastRewardResetKey, `${currentYear}-${currentMonth}`);
        localStorage.removeItem(`claimed_rewards_${profile.username}`);
      } else {
        const claimedRewardsData = localStorage.getItem(`claimed_rewards_${profile.username}`) || '[]';
        rewardsToUse = JSON.parse(claimedRewardsData);
      }
    }

    setClaimedRewards(rewardsToUse);

    // Calcular tiempo hasta el próximo mes
    const calculateTimeUntilReset = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const diff = nextMonth.getTime() - now.getTime();

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeUntilReset(calculateTimeUntilReset());

    // Actualizar cada segundo
    const interval = setInterval(() => {
      setTimeUntilReset(calculateTimeUntilReset());
    }, 1000);

    // Definir las 3 recompensas más caras
    const topRewards = [
      { packageId: 11, coins: 30000, bonus: 1500 },
      { packageId: 10, coins: 20000, bonus: 1000 },
      { packageId: 9, coins: 10000, bonus: 500 },
    ];
    setRewards(topRewards);

    return () => clearInterval(interval);
  }, [profile?.nx, profile?.gp, profile?.username]);

  const handlePurchaseClick = async (pkg: GcoinPackage) => {
    if (!profile) return;
    try {
      setPurchasing(true);
      setSelectedPackage(pkg);
      
      try {
        await api.createPaymentRequest(
          parseInt(profile.id),
          profile.username,
          profile.NickName || profile.username,
          pkg.coins,
          pkg.price
        );
      } catch (err) {
        console.log('Payment request creation skipped');
      }
      
      const paypalLink = `https://paypal.me/LBetancourthQuenguan/${pkg.price}`;
      window.location.href = paypalLink;
    } catch (error) {
      console.error('Error:', error);
      setNotification({ type: 'error', message: 'Error al procesar. Intenta de nuevo.' });
      setPurchasing(false);
    }
  };

  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setNotification({ type: 'error', message: 'La imagen es muy grande. Máximo 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setProofImage(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!profile || !selectedProofPackage || !proofImage) {
      setNotification({ type: 'error', message: 'Por favor carga una imagen' });
      return;
    }

    try {
      setUploading(true);
      await api.uploadPaymentProof(
        parseInt(profile.id),
        profile.username,
        profile.NickName || profile.username,
        selectedProofPackage.coins,
        selectedProofPackage.price,
        proofImage
      );

      setNotification({ 
        type: 'success', 
        message: 'Comprobante recibido. El administrador lo revisará pronto.' 
      });
      
      setTimeout(() => {
        setShowProofModal(false);
        setProofImage(null);
        setSelectedProofPackage(null);
        setNotification(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error:', error);
      setNotification({ 
        type: 'error', 
        message: 'Error al enviar comprobante. Intenta de nuevo.' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClaimReward = (packageId: number, bonus: number) => {
    if (!profile) return;

    // Buscar la recompensa para obtener el monto exacto
    const reward = rewards.find(r => r.packageId === packageId);
    if (!reward) return;

    // Verificar si el usuario ha comprado EXACTAMENTE esta cantidad
    const hasMadePurchaseThisMonth = nxPurchases.some(purchase => 
      (purchase.packageId === packageId && purchase.packageId > 0) ||
      (purchase.packageId === 0 && purchase.coins === reward.coins)
    );

    if (!hasMadePurchaseThisMonth) {
      setNotification({
        type: 'error',
        message: 'Debes comprar esta cantidad de NX primero para reclamar la recompensa'
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const newBalance = nxBalance + bonus;
    setNxBalance(newBalance);

    const updatedClaimed = [...claimedRewards, packageId];
    setClaimedRewards(updatedClaimed);
    localStorage.setItem(`claimed_rewards_${profile.username}`, JSON.stringify(updatedClaimed));

    setNotification({
      type: 'success',
      message: `¡Recompensa reclamada! +${bonus} NX`
    });

    setTimeout(() => setNotification(null), 3000);
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-black">Billetera</h1>
        <p className="mt-1 text-slate-400">Gestiona tus fondos y compra NX</p>
      </div>

      {/* Saldos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-blue-900/30 via-[#0d1320] to-cyan-900/20 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">NX BALANCE</p>
              <p className="text-4xl lg:text-5xl font-black text-blue-400">{nxBalance.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">Moneda Premium del juego</p>
            </div>
            <Wallet className="h-16 w-16 text-blue-400 opacity-20" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-amber-900/30 via-[#0d1320] to-yellow-900/20 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">GP BALANCE</p>
              <p className="text-4xl lg:text-5xl font-black text-amber-400">{gpBalance.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-2">Moneda del juego</p>
            </div>
            <Wallet className="h-16 w-16 text-amber-400 opacity-20" />
          </div>
        </div>
      </div>

      {/* Historial de Compras */}
      {nxPurchases.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <TrendingUp className="h-5 w-5 text-cyan-400" /> Historial de Compras de NX
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nxPurchases.map((purchase, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-white/5 p-3 border border-white/10">
                <div>
                  <p className="font-semibold text-white">{purchase.coins.toLocaleString()} NX</p>
                  <p className="text-xs text-slate-400">${purchase.amount}</p>
                </div>
                <p className="text-xs text-slate-500">{purchase.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recompensas por Recarga */}
      <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
          <Gift className="h-5 w-5 text-purple-400" /> Recompensas por Recarga
        </h2>
        <p className="text-sm text-slate-400 mb-4">Recarga una de las 3 recargas más caras y reclama tu bono</p>
        
        {/* Resumen de compras este mes */}
        <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <p className="text-xs text-slate-400 mb-3">RESUMEN DE COMPRAS ESTE MES</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-400">Total recargado</p>
              <p className="text-2xl font-bold text-cyan-400">{nxPurchases.reduce((sum, p) => sum + p.coins, 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500">NX</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Compras realizadas</p>
              <p className="text-2xl font-bold text-cyan-400">{nxPurchases.length}</p>
              <p className="text-xs text-slate-500">transacciones</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Recompensas disponibles</p>
              <p className="text-2xl font-bold text-emerald-400">{rewards.filter(r => nxPurchases.some(p => p.packageId === r.packageId) && !claimedRewards.includes(r.packageId)).length}</p>
              <p className="text-xs text-slate-500">por reclamar</p>
            </div>
          </div>
        </div>

        {/* Progreso hacia cada recompensa */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/30 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-3 font-semibold">PROGRESO HACIA RECOMPENSAS</p>
          <div className="space-y-3">
            {rewards.map((reward) => {
              const hasPurchased = nxPurchases.some(p => p.packageId === reward.packageId);
              const totalSpentThisMonth = nxPurchases.reduce((sum, p) => sum + p.coins, 0);
              const percentToGoal = Math.min((totalSpentThisMonth / reward.coins) * 100, 100);
              
              return (
                <div key={reward.packageId}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold">{reward.coins.toLocaleString()} NX</span>
                      {hasPurchased && <span className="text-emerald-400 ml-2">✓ Desbloqueado</span>}
                    </p>
                    <p className="text-xs text-slate-400">
                      {totalSpentThisMonth.toLocaleString()} / {reward.coins.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-700/50 overflow-hidden border border-slate-600/50">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        hasPurchased 
                          ? 'bg-emerald-500' 
                          : percentToGoal > 0 
                          ? 'bg-cyan-500' 
                          : 'bg-slate-700'
                      }`}
                      style={{ width: `${percentToGoal}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contador de reinicio */}
        <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Próximo reinicio en:</p>
              <p className="text-lg font-bold text-purple-400 font-mono">{timeUntilReset}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Todas las recompensas se reinician</p>
              <p className="text-sm font-semibold text-purple-300">el 1º de cada mes</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {rewards.map((reward) => {
            const isClaimed = claimedRewards.includes(reward.packageId);
            
            // Verificar si el usuario ha comprado EXACTAMENTE esta cantidad
            // Para pagos aprobados (packageId 0), buscar coins exactos
            const hasPurchased = nxPurchases.some(p => 
              (p.packageId === reward.packageId && p.packageId > 0) ||
              (p.packageId === 0 && p.coins === reward.coins)
            );
            
            return (
              <div key={reward.packageId} className={`rounded-xl border p-4 transition ${
                isClaimed 
                  ? 'border-slate-700 bg-slate-900/20' 
                  : hasPurchased
                  ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/20 to-purple-600/10'
                  : 'border-slate-700/50 bg-slate-900/20 opacity-60'
              }`}>
                <div className="mb-3">
                  <p className="text-sm text-slate-400">Recarga</p>
                  <p className="text-2xl font-bold text-purple-400">{reward.coins.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">NX</p>
                </div>
                <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm text-slate-300">
                    Bono: <span className="font-bold text-emerald-400">+{reward.bonus}</span> NX
                  </p>
                </div>
                <button
                  onClick={() => handleClaimReward(reward.packageId, reward.bonus)}
                  disabled={isClaimed || !hasPurchased}
                  title={!hasPurchased ? 'Debes comprar esta cantidad primero' : ''}
                  className={`w-full py-2 rounded-lg font-semibold transition ${
                    isClaimed
                      ? 'bg-slate-700/20 text-slate-400 cursor-default'
                      : !hasPurchased
                      ? 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
                      : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  }`}
                >
                  {isClaimed ? '✓ Reclamado' : !hasPurchased ? 'Compra primero' : 'Reclamar'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Método de Pago */}
      <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
        <h2 className="mb-4 text-lg font-bold">Método de Pago</h2>
        <div className="flex items-center justify-between rounded-xl bg-white/5 p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
              <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-white">PayPal</p>
              <p className="text-xs text-slate-400">Método de pago seguro</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">Disponible</span>
        </div>
      </div>

      {/* Comprar NX */}
      <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
          <Crown className="h-5 w-5 text-purple-400" /> Comprar NX
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-semibold text-slate-300">NX</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-300">Precio</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-300">Total NX</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-300">Acción</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="py-4 px-4 font-semibold text-purple-400">{pkg.coins.toLocaleString()}</td>
                  <td className="py-4 px-4 text-white">${pkg.price}</td>
                  <td className="py-4 px-4 text-slate-300">{pkg.coins.toLocaleString()} NX</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handlePurchaseClick(pkg)}
                        className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition font-semibold whitespace-nowrap"
                      >
                        Comprar
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProofPackage(pkg);
                          setShowProofModal(true);
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition font-semibold whitespace-nowrap"
                      >
                        Ya hice pago
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Comprobante */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1320] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Cargar Comprobante de Pago</h2>
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setProofImage(null);
                  setSelectedProofPackage(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedProofPackage && (
              <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold text-purple-400">{selectedProofPackage.coins.toLocaleString()} NX</span>
                  {' '}por{' '}
                  <span className="font-semibold text-emerald-400">${selectedProofPackage.price.toFixed(2)}</span>
                </p>
              </div>
            )}

            {proofImage ? (
              <div className="mb-4">
                <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black">
                  <img src={proofImage} alt="Comprobante" className="w-full h-64 object-contain" />
                  <button
                    onClick={() => setProofImage(null)}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="block mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProofImageChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-lg p-6 cursor-pointer hover:border-blue-400/50 transition">
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-400">Haz clic para cargar imagen</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG hasta 2MB</p>
                </div>
              </label>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setProofImage(null);
                  setSelectedProofPackage(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700/20 text-slate-300 hover:bg-slate-700/30 transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitProof}
                disabled={!proofImage || uploading}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition font-semibold disabled:opacity-50"
              >
                {uploading ? 'Enviando...' : 'Enviar Comprobante'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones */}
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
