import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ShoppingBag, Calendar, Coins, Loader, RotateCcw, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface Purchase {
  id: number;
  productId: number;
  productName: string;
  nxSpent: number;
  purchaseDate: string;
  formattedDate: string;
  marketplaceStatus?: {
    isForSale: boolean;
    listing?: {
      id: number;
      status: string;
      createdAt: string;
      soldAt?: string;
      soldTo?: string;
    };
  };
}

interface RefundRequest {
  id: number;
  productId: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface WeeklyRefundCount {
  used: number;
  remaining: number;
  limit: number;
  mondayOfWeek: string;
}

interface RefundStats {
  totalRefunds: number;
  totalNXRefunded: number;
  totalCommission: number;
  totalNXPaid: number;
}

interface RefundDetail {
  id: number;
  productName: string;
  nxPaid: number;
  nxCommission: number;
  nxToRefund: number;
  status: string;
  approvedAt: string;
}

interface RefundDetailFull extends RefundDetail {
  purchaseId?: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export default function PurchaseHistoryPage() {
  const { profile } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<RefundRequest[]>([]);
  const [weeklyCount, setWeeklyCount] = useState<WeeklyRefundCount | null>(null);
  const [refundStats, setRefundStats] = useState<RefundStats | null>(null);
  const [refundDetails, setRefundDetails] = useState<RefundDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<number | null>(null);
  const [showRefundDetails, setShowRefundDetails] = useState(false);
  const [selectedRefundDetail, setSelectedRefundDetail] = useState<RefundDetail | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!profile?.username) return;
    loadData();
    
    // Recargar cada 10 segundos para ver si hay cambios en los reembolsos
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [profile?.username]);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string, duration = 6000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, title, message, duration };
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyData, refundsData, weeklyData, statsData, detailsData] = await Promise.all([
        api.request<Purchase[]>('GET', `/purchase-history/${profile?.username}`),
        api.getAllRefunds(),
        api.getWeeklyRefundCount(profile?.username || ''),
        api.getTotalRefunded(profile?.username || ''),
        api.getRefundDetails(profile?.username || ''),
      ]);
      
      // Agregar estado de marketplace para cada compra
      const purchasesWithMarketplaceStatus = await Promise.all(
        (historyData || []).map(async (purchase) => {
          try {
            const marketplaceStatus = await api.getPurchaseMarketplaceStatus(purchase.id);
            return {
              ...purchase,
              marketplaceStatus,
            };
          } catch (error) {
            console.error(`Error getting marketplace status for purchase ${purchase.id}:`, error);
            return {
              ...purchase,
              marketplaceStatus: { isForSale: false },
            };
          }
        })
      );
      
      setPurchases(purchasesWithMarketplaceStatus);
      setPendingRefunds(refundsData || []);
      setWeeklyCount(weeklyData || null);
      setRefundStats(statsData || null);
      setRefundDetails(detailsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setPurchases([]);
      setPendingRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRefund = async (purchase: Purchase) => {
    if (!profile?.username || !profile?.id) return;

    // Verificar si alcanzó el límite
    if (weeklyCount && weeklyCount.remaining <= 0) {
      showToast('error', 'Límite alcanzado', 'Solo puedes reembolsar 5 compras por semana. El contador se reinicia cada lunes.');
      return;
    }

    try {
      setRefunding(purchase.id);

      // Calcular comisión del 10%
      const commission = Math.round(purchase.nxSpent * 0.1);
      const toRefund = purchase.nxSpent - commission;

      const result = await api.requestRefund(
        profile.id,
        profile.username,
        profile.NickName || profile.username,
        purchase.productId,
        purchase.productName,
        purchase.id,
        purchase.nxSpent
      );

      if (result.success) {
        showToast('success', 'Solicitud enviada', 
          `Reembolso de ${purchase.productName}. Comisión: ${commission} NX | A devolver: ${toRefund} NX`);
        await loadData();
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Error desconocido';
      showToast('error', 'Error en reembolso', errorMessage);
    } finally {
      setRefunding(null);
    }
  };

  // Verificar si hay un reembolso pendiente para un producto
  const hasPendingRefund = (productId: number) => {
    return pendingRefunds.some(r => r.productId === productId && r.status === 'pending');
  };

  // Verificar si un reembolso fue aprobado
  const isRefundApproved = (productId: number) => {
    return pendingRefunds.some(r => r.productId === productId && r.status === 'approved');
  };

  // Verificar si un reembolso fue rechazado
  const isRefundRejected = (productId: number) => {
    return pendingRefunds.some(r => r.productId === productId && r.status === 'rejected');
  };

  if (!profile?.username) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-bold text-slate-400">Inicia sesión</h2>
          <p className="mt-2 text-slate-500">Necesitas iniciar sesión para ver tu historial de compras</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`rounded-2xl border backdrop-blur-sm p-4 shadow-lg animate-in fade-in slide-in-from-right-4 duration-300 ${
              toast.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : toast.type === 'error'
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-cyan-500/30 bg-cyan-500/10'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
              {toast.type === 'error' && <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />}
              {toast.type === 'info' && <AlertCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />}
              
              <div className="flex-1">
                <h3 className={`font-semibold ${
                  toast.type === 'success' ? 'text-emerald-300' :
                  toast.type === 'error' ? 'text-red-300' :
                  'text-cyan-300'
                }`}>
                  {toast.title}
                </h3>
                <p className="text-sm text-slate-300 mt-1">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-300 transition"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">Historial de Compras</h1>
        <p className="mt-1 text-slate-400">Todas tus compras de NX</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-purple-900/30 via-[#0d1320] to-pink-900/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">TOTAL COMPRAS</p>
              <p className="text-4xl font-black text-purple-400">{purchases.length}</p>
            </div>
            <ShoppingBag className="h-12 w-12 text-purple-400 opacity-20" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-cyan-900/30 via-[#0d1320] to-blue-900/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">NX TOTAL GASTADO</p>
              <p className="text-4xl font-black text-cyan-400">{purchases.reduce((sum, p) => sum + p.nxSpent, 0).toLocaleString()}</p>
            </div>
            <Coins className="h-12 w-12 text-cyan-400 opacity-20" />
          </div>
        </div>

        <div className={`rounded-2xl border ${weeklyCount && weeklyCount.remaining === 0 ? 'border-red-500/30' : 'border-white/5'} bg-gradient-to-br from-orange-900/30 via-[#0d1320] to-amber-900/20 p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">REEMBOLSOS ESTA SEMANA</p>
              <p className={`text-4xl font-black ${weeklyCount && weeklyCount.remaining === 0 ? 'text-red-400' : 'text-orange-400'}`}>
                {weeklyCount ? `${weeklyCount.used}/${weeklyCount.limit}` : '-'}
              </p>
            </div>
            {weeklyCount && weeklyCount.remaining === 0 && (
              <AlertCircle className="h-12 w-12 text-red-400 opacity-20" />
            )}
            {weeklyCount && weeklyCount.remaining > 0 && (
              <Clock className="h-12 w-12 text-orange-400 opacity-20" />
            )}
          </div>
          {weeklyCount && (
            <p className="mt-2 text-xs text-slate-500">
              {weeklyCount.remaining > 0 ? `${weeklyCount.remaining} disponibles` : 'Límite alcanzado'}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-emerald-900/30 via-[#0d1320] to-green-900/20 p-6 cursor-pointer hover:border-emerald-500/30 transition"
          onClick={() => setShowRefundDetails(true)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">DINERO REEMBOLSADO</p>
              <p className="text-4xl font-black text-emerald-400">{(refundStats?.totalNXRefunded || 0).toLocaleString()}</p>
            </div>
            <RotateCcw className="h-12 w-12 text-emerald-400 opacity-20" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {refundStats?.totalRefunds || 0} reembolso(s)
          </p>
        </div>
      </div>

      {/* Warning si alcanzó límite */}
      {weeklyCount && weeklyCount.remaining === 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">Límite de reembolsos alcanzado</p>
              <p className="text-xs text-red-400 mt-1">Solo puedes reembolsar 5 compras por semana. El contador se reinicia cada lunes.</p>
            </div>
          </div>
        </div>
      )}

      {/* Purchase List */}
      <div className="rounded-2xl border border-white/5 bg-[#0d1320] p-6">
        <h2 className="mb-6 text-lg font-bold">Compras Recientes</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-slate-500">
            <ShoppingBag className="h-12 w-12 opacity-50 mb-2" />
            <p>No hay compras en tu historial</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header del tabla en mobile y desktop */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold text-slate-400 bg-white/5 rounded-lg mb-2">
              <div className="col-span-6">PRODUCTO</div>
              <div className="col-span-3 text-right">NX GASTADO</div>
              <div className="col-span-3 text-right">FECHA</div>
            </div>

            {/* Items */}
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="grid lg:grid-cols-12 gap-4 items-center rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
              >
                {/* Mobile layout */}
                <div className="lg:hidden space-y-2 col-span-12">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{purchase.productName}</p>
                        {purchase.marketplaceStatus?.isForSale && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            En venta
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{purchase.formattedDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-purple-400">{purchase.nxSpent.toLocaleString()} NX</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (isRefundApproved(purchase.productId)) {
                        const refund = refundDetails.find(r => r.nxToRefund && r.productName === purchase.productName);
                        if (refund) setSelectedRefundDetail(refund);
                      } else {
                        handleRequestRefund(purchase);
                      }
                    }}
                    disabled={refunding === purchase.id || hasPendingRefund(purchase.productId) || isRefundRejected(purchase.productId) || purchase.marketplaceStatus?.isForSale}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      purchase.marketplaceStatus?.isForSale
                        ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
                        : isRefundApproved(purchase.productId)
                        ? 'bg-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/30'
                        : isRefundRejected(purchase.productId)
                        ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
                        : hasPendingRefund(purchase.productId)
                        ? 'bg-slate-500/20 text-slate-400 cursor-not-allowed'
                        : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    }`}
                  >
                    {refunding === purchase.id ? (
                      <>
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                        Enviando...
                      </>
                    ) : purchase.marketplaceStatus?.isForSale ? (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" />
                        En venta
                      </>
                    ) : isRefundApproved(purchase.productId) ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Reembolsado
                      </>
                    ) : isRefundRejected(purchase.productId) ? (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        Rechazado
                      </>
                    ) : hasPendingRefund(purchase.productId) ? (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        Pendiente
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reembolso
                      </>
                    )}
                  </button>
                </div>

                {/* Desktop layout */}
                <div className="hidden lg:col-span-5 lg:block">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{purchase.productName}</p>
                    {purchase.marketplaceStatus?.isForSale && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        En venta
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">ID: {purchase.productId}</p>
                </div>

                <div className="hidden lg:col-span-2 lg:block text-right">
                  <p className="font-semibold text-purple-400">{purchase.nxSpent.toLocaleString()} NX</p>
                </div>

                <div className="hidden lg:col-span-2 lg:block text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <p className="text-sm text-slate-400">{purchase.formattedDate}</p>
                  </div>
                </div>

                <div className="hidden lg:col-span-3 lg:flex lg:justify-end">
                  <button
                    onClick={() => {
                      if (isRefundApproved(purchase.productId)) {
                        const refund = refundDetails.find(r => r.nxToRefund && r.productName === purchase.productName);
                        if (refund) setSelectedRefundDetail(refund);
                      } else {
                        handleRequestRefund(purchase);
                      }
                    }}
                    disabled={refunding === purchase.id || hasPendingRefund(purchase.productId) || isRefundRejected(purchase.productId) || purchase.marketplaceStatus?.isForSale}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      purchase.marketplaceStatus?.isForSale
                        ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
                        : isRefundApproved(purchase.productId)
                        ? 'bg-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/30'
                        : isRefundRejected(purchase.productId)
                        ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
                        : hasPendingRefund(purchase.productId)
                        ? 'bg-slate-500/20 text-slate-400 cursor-not-allowed'
                        : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    }`}
                  >
                    {refunding === purchase.id ? (
                      <>
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                        Enviando...
                      </>
                    ) : purchase.marketplaceStatus?.isForSale ? (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" />
                        En venta
                      </>
                    ) : isRefundApproved(purchase.productId) ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Reembolsado
                      </>
                    ) : isRefundRejected(purchase.productId) ? (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        Rechazado
                      </>
                    ) : hasPendingRefund(purchase.productId) ? (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        Pendiente
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reembolso
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      {purchases.length > 0 && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
          <p className="text-sm text-cyan-300">
            💡 Mostrando las últimas 50 compras. Para más información o si necesitas una devolución, contacta con soporte.
          </p>
        </div>
      )}

      {/* Modal Individual de Detalles de Reembolso */}
      {selectedRefundDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1320] max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-emerald-400">Detalles del Reembolso</h2>
              <button
                onClick={() => setSelectedRefundDetail(null)}
                className="text-slate-400 hover:text-slate-300 transition"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Producto */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400 mb-1">Producto</p>
                <p className="text-lg font-semibold text-white">{selectedRefundDetail.productName}</p>
              </div>

              {/* Detalles del cálculo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                  <p className="text-xs text-slate-400 mb-1">Pagaste</p>
                  <p className="text-2xl font-black text-orange-400">{selectedRefundDetail.nxPaid}</p>
                  <p className="text-xs text-slate-500 mt-1">NX</p>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                  <p className="text-xs text-slate-400 mb-1">Comisión</p>
                  <p className="text-2xl font-black text-red-400">-{selectedRefundDetail.nxCommission}</p>
                  <p className="text-xs text-slate-500 mt-1">(10%)</p>
                </div>
              </div>

              {/* Total */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 p-4">
                <p className="text-sm text-slate-400 mb-2">Total Devuelto</p>
                <p className="text-4xl font-black text-emerald-400">{selectedRefundDetail.nxToRefund}</p>
                <p className="text-xs text-slate-400 mt-2">NX reembolsado a tu cuenta</p>
              </div>

              {/* Fecha */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400 mb-1">Fecha de Aprobación</p>
                <p className="text-sm font-semibold text-slate-300">
                  {new Date(selectedRefundDetail.approvedAt).toLocaleDateString('es', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Botón cerrar */}
              <button
                onClick={() => setSelectedRefundDetail(null)}
                className="w-full rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition font-semibold py-3 mt-4"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Reembolsos (General) */}
      {showRefundDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1320] max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-emerald-400">Detalles de Reembolsos</h2>
              <button
                onClick={() => setShowRefundDetails(false)}
                className="text-slate-400 hover:text-slate-300 transition"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {refundDetails.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <p>No hay reembolsos aprobados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Resumen */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <p className="text-sm text-slate-400">Total Reembolsado</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{refundStats?.totalNXRefunded?.toLocaleString() || '0'} NX</p>
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm text-slate-400">Comisión Cobrada</p>
                    <p className="text-2xl font-black text-red-400 mt-1">{refundStats?.totalCommission?.toLocaleString() || '0'} NX</p>
                  </div>
                </div>

                {/* Lista de reembolsos */}
                {refundDetails.map((refund) => (
                  <div
                    key={refund.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{refund.productName}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(refund.approvedAt).toLocaleDateString('es', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400">Pagaste</p>
                        <p className="font-semibold text-orange-400 mt-1">{refund.nxPaid} NX</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Comisión (10%)</p>
                        <p className="font-semibold text-red-400 mt-1">-{refund.nxCommission} NX</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Recibiste</p>
                        <p className="font-semibold text-emerald-400 mt-1">{refund.nxToRefund} NX</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
