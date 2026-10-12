import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Crown, X, CheckCircle, AlertCircle, Gift, TrendingUp, Coins } from 'lucide-react';

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
  const [paymentCode, setPaymentCode] = useState<string>('');
  const [submittingCode, setSubmittingCode] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [nxPurchases, setNxPurchases] = useState<{ packageId: number; coins: number; date: string; amount: number }[]>([]);
  const [rewards, setRewards] = useState<{ packageId: number; coins: number; bonus: number }[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<number[]>([]);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [customNxAmount, setCustomNxAmount] = useState<string>('');
  const [customNxBonus, setCustomNxBonus] = useState<number>(0);

  const packages: GcoinPackage[] = [
    { id: 1, coins: 15000, price: 1.00 },
    { id: 2, coins: 35000, price: 2.00 },
    { id: 3, coins: 80000, price: 5.00 },
    { id: 4, coins: 160000, price: 10.00 },
    { id: 5, coins: 320000, price: 20.00 },
    { id: 6, coins: 480000, price: 30.00 },
    { id: 7, coins: 800000, price: 50.00 },
    { id: 8, coins: 1600000, price: 100.00 },
  ];

  useEffect(() => {
    if (!profile) return;

    setNxBalance(profile.gameCoins || 0);
    setGpBalance(profile.totalBalance || 0);

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
      { packageId: 8, coins: 1600000, bonus: 16000 },
      { packageId: 7, coins: 800000, bonus: 8000 },
      { packageId: 6, coins: 480000, bonus: 4800 },
    ];
    setRewards(topRewards);

    return () => clearInterval(interval);
  }, [profile?.gameCoins, profile?.totalBalance, profile?.username]);

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
        // Unused - keeping for backwards compatibility
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPaymentCode = async () => {
    if (!profile || !selectedProofPackage || !paymentCode.trim()) {
      setNotification({ type: 'error', message: 'Por favor ingresa un código' });
      return;
    }

    try {
      setSubmittingCode(true);
      await api.submitPaymentCode(
        parseInt(profile.id),
        profile.username,
        profile.NickName || profile.username,
        paymentCode,
        selectedProofPackage.coins,
        selectedProofPackage.price
      );

      setNotification({ 
        type: 'success', 
        message: 'Código recibido. El administrador lo revisará pronto.' 
      });
      
      setTimeout(() => {
        setShowProofModal(false);
        setPaymentCode('');
        setSelectedProofPackage(null);
        setNotification(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error:', error);
      setNotification({ 
        type: 'error', 
        message: error.message || 'Error al enviar código. Intenta de nuevo.' 
      });
    } finally {
      setSubmittingCode(false);
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

  const handleCustomNxChange = (value: string) => {
    // Permitir solo números
    const numValue = value.replace(/\D/g, '');
    setCustomNxAmount(numValue);
    
    // Calcular el bonus (10%)
    if (numValue) {
      const amount = parseInt(numValue);
      const bonus = Math.floor(amount * 0.1);
      setCustomNxBonus(bonus);
    } else {
      setCustomNxBonus(0);
    }
  };

  // Función para calcular el precio basado en la base de precios
  const calculateCustomPrice = (nxAmount: string): number => {
    if (!nxAmount) return 0;
    const amount = parseInt(nxAmount);
    
    // Encontrar el paquete más cercano o usar proporción
    // Basarse en el mejor precio: 1600000 NX por $100 = 16000 NX por $1
    // O usar la proporción más favorable
    
    // Mejor proporción: 1600000 NX = $100 (16000 NX por dólar)
    // Segunda mejor: 800000 NX = $50 (16000 NX por dólar)
    // Tercera mejor: 480000 NX = $30 (16000 NX por dólar)
    
    // Usar la proporción de 16000 NX por dólar (mejor precio)
    const price = amount / 16000;
    return Math.max(0.01, parseFloat(price.toFixed(2)));
  };

  if (!profile) {
    return null;
  }

  const checkoutNx = selectedPackage
    ? selectedPackage.coins
    : customNxAmount
      ? parseInt(customNxAmount)
      : 0;
  const checkoutPrice = selectedPackage
    ? selectedPackage.price
    : customNxAmount
      ? calculateCustomPrice(customNxAmount)
      : 0;
  const canCheckout = checkoutNx >= 1000;

  const startCheckout = () => {
    if (selectedPackage) {
      handlePurchaseClick(selectedPackage);
      return;
    }
    if (!customNxAmount) {
      setNotification({ type: 'error', message: 'Por favor ingresa una cantidad válida' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    sessionStorage.setItem('customNxAmount', customNxAmount);
    window.location.href = `https://paypal.me/LBetancourthQuenguan/${checkoutPrice.toFixed(2)}`;
  };

  const openPaidModal = () => {
    if (selectedPackage) {
      setSelectedProofPackage(selectedPackage);
      setShowProofModal(true);
      return;
    }
    if (customNxAmount) {
      setSelectedProofPackage({
        id: 0,
        coins: parseInt(customNxAmount),
        price: checkoutPrice,
      });
      setShowProofModal(true);
    }
  };

  return (
    <main className="inner-page page-width charge-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" />NX STORE</p>
          <h1>CHARGE COINS.</h1>
          <p className="page-heading-description">
            Top up your NX with a package or an amount of your own. An administrator confirms your payment,
            then the NX is added to your account.
          </p>
        </div>
        <div className="page-heading-aside">
          <span className="charge-badge">
            <Crown size={14} /> NX — {nxBalance.toLocaleString()} · GP {gpBalance.toLocaleString()}
          </span>
        </div>
      </header>

      <div className="charge-layout">
        <div>
          <p className="charge-choose"><Coins className="h-4 w-4" /> Choose an amount</p>
          <div className="charge-packages">
            {packages.map(pkg => (
              <button
                key={pkg.id}
                type="button"
                className={`charge-package${selectedPackage?.id === pkg.id ? ' charge-package-active' : ''}`}
                onClick={() => {
                  setSelectedPackage(pkg);
                  setCustomNxAmount('');
                  setCustomNxBonus(0);
                }}
              >
                <strong>{pkg.coins.toLocaleString()}<em>NX</em></strong>
                <span>{pkg.price.toFixed(2)} USD</span>
              </button>
            ))}
          </div>

          <div className={`charge-custom${selectedPackage ? '' : customNxAmount ? ' charge-package-active' : ''}`}>
            <h3>Custom <small>amount</small></h3>
            <div className="charge-custom-field">
              <div>
                <label>NX amount</label>
                <input
                  value={customNxAmount}
                  onChange={e => {
                    setSelectedPackage(null);
                    handleCustomNxChange(e.target.value);
                  }}
                  placeholder="105,000"
                />
              </div>
              <button
                type="button"
                className="charge-step"
                onClick={() => {
                  const next = String(Math.max(1000, parseInt(customNxAmount || '0') + 1000));
                  setSelectedPackage(null);
                  handleCustomNxChange(next);
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <aside className="charge-checkout">
          <p>CHECKOUT</p>
          <h2>Your order</h2>
          <div className="charge-checkout-row">
            <span>NX</span>
            <strong>{checkoutNx ? checkoutNx.toLocaleString() : '—'}</strong>
          </div>
          <div className="charge-checkout-row">
            <span>PRICE</span>
            <strong>{checkoutNx ? `${checkoutPrice.toFixed(2)} USD` : '—'}</strong>
          </div>
          {customNxAmount && !selectedPackage && (
            <div className="charge-checkout-row">
              <span>BONUS 10%</span>
              <strong>+{customNxBonus.toLocaleString()} NX</strong>
            </div>
          )}
          <p className="charge-checkout-note">
            After you pay, send us the transaction code with Ya pagué. An administrator confirms it, then NX is added to your account.
            You can have up to 3 orders waiting for approval at a time.
          </p>
          <div className="charge-actions">
            <button type="button" className="charge-review" disabled={!canCheckout || purchasing} onClick={startCheckout}>
              {purchasing ? 'Opening PayPal...' : 'Review order'}
            </button>
            <button type="button" className="charge-paid" disabled={!canCheckout} onClick={openPaidModal}>
              Ya pagué
            </button>
          </div>
        </aside>
      </div>

      <section className="charge-orders">
        <div className="charge-orders-head">
          <h2><TrendingUp size={18} /> My orders</h2>
          <span>Your last {Math.max(nxPurchases.length, 50)} orders</span>
        </div>
        {nxPurchases.length === 0 ? (
          <p className="charge-orders-empty">You have not placed any orders yet.</p>
        ) : (
          nxPurchases.map((purchase, idx) => (
            <div key={idx} className="charge-order">
              <strong>{purchase.coins.toLocaleString()} NX</strong>
              <span>${purchase.amount} · {purchase.date}</span>
            </div>
          ))
        )}
      </section>

      <section className="charge-rewards">
        <h2><Gift size={18} /> Recompensas por Recarga</h2>
        <p>Recarga una de las 3 recargas más caras y reclama tu bono</p>

        <div className="charge-summary">
          <p className="charge-kicker">RESUMEN DE COMPRAS ESTE MES</p>
          <div className="charge-summary-grid">
            <div>
              <p>Total recargado</p>
              <strong>{nxPurchases.reduce((sum, p) => sum + p.coins, 0).toLocaleString()}</strong>
              <small>NX</small>
            </div>
            <div>
              <p>Compras realizadas</p>
              <strong>{nxPurchases.length}</strong>
              <small>transacciones</small>
            </div>
            <div>
              <p>Recompensas disponibles</p>
              <strong>{rewards.filter(r => nxPurchases.some(p => p.packageId === r.packageId) && !claimedRewards.includes(r.packageId)).length}</strong>
              <small>por reclamar</small>
            </div>
          </div>
        </div>

        <div className="charge-progress">
          <p className="charge-kicker">PROGRESO HACIA RECOMPENSAS</p>
          {rewards.map(reward => {
            const hasPurchased = nxPurchases.some(p => p.packageId === reward.packageId);
            const totalSpentThisMonth = nxPurchases.reduce((sum, p) => sum + p.coins, 0);
            const percentToGoal = Math.min((totalSpentThisMonth / reward.coins) * 100, 100);
            return (
              <div key={reward.packageId} className="mb-3 last:mb-0">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>
                    {reward.coins.toLocaleString()} NX
                    {hasPurchased && <span className="ml-2 text-[#ed9622]">✓ Desbloqueado</span>}
                  </span>
                  <span className="text-[#888]">{totalSpentThisMonth.toLocaleString()} / {reward.coins.toLocaleString()}</span>
                </div>
                <div className={`charge-bar${hasPurchased ? ' charge-bar-done' : ''}`}>
                  <i style={{ width: `${percentToGoal}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="charge-reset">
          <div>
            <p className="charge-kicker">PRÓXIMO REINICIO EN</p>
            <strong>{timeUntilReset}</strong>
          </div>
          <div className="text-right text-sm text-[#888]">
            <p>Todas las recompensas se reinician</p>
            <p className="font-semibold text-[#e6aa55]">el 1º de cada mes</p>
          </div>
        </div>

        <div className="charge-reward-grid">
          {rewards.map(reward => {
            const isClaimed = claimedRewards.includes(reward.packageId);
            const hasPurchased = nxPurchases.some(p =>
              (p.packageId === reward.packageId && p.packageId > 0) ||
              (p.packageId === 0 && p.coins === reward.coins)
            );
            return (
              <article
                key={reward.packageId}
                className={`charge-reward${isClaimed ? ' charge-reward-off' : hasPurchased ? ' charge-reward-ready' : ' charge-reward-off'}`}
              >
                <em>Recarga</em>
                <strong>{reward.coins.toLocaleString()}</strong>
                <em>NX</em>
                <div className="charge-reward-bonus">
                  Bono: <b>+{reward.bonus.toLocaleString()}</b> NX
                </div>
                <button
                  type="button"
                  className="charge-claim"
                  onClick={() => handleClaimReward(reward.packageId, reward.bonus)}
                  disabled={isClaimed || !hasPurchased}
                  title={!hasPurchased ? 'Debes comprar esta cantidad primero' : ''}
                >
                  {isClaimed ? 'Reclamado' : !hasPurchased ? 'Compra primero' : 'Reclamar'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="charge-modal">
            <div className="mb-4 flex items-center justify-between">
              <h2>Confirmar Pago</h2>
              <button
                type="button"
                className="charge-paid"
                onClick={() => {
                  setShowProofModal(false);
                  setPaymentCode('');
                  setSelectedProofPackage(null);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedProofPackage && (
              <div className="charge-reward-bonus mb-4">
                <b>{selectedProofPackage.coins.toLocaleString()} NX</b> por ${selectedProofPackage.price.toFixed(2)}
              </div>
            )}
            <label>
              <span className="charge-kicker">CÓDIGO DE TRANSACCIÓN</span>
              <input
                type="text"
                placeholder="Ej: TXN-ABC123XYZ"
                value={paymentCode}
                onChange={e => setPaymentCode(e.target.value)}
                maxLength={100}
              />
            </label>
            <p className="mt-2 mb-4 text-xs text-[#888]">Ingresa el código que recibiste de PayPal</p>
            <div className="charge-actions">
              <button
                type="button"
                className="charge-paid"
                onClick={() => {
                  setShowProofModal(false);
                  setPaymentCode('');
                  setSelectedProofPackage(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="charge-review"
                onClick={handleSubmitPaymentCode}
                disabled={!paymentCode.trim() || submittingCode}
              >
                {submittingCode ? 'Enviando...' : 'Enviar Código'}
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
    </main>
  );
}
