import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ShoppingBag, Calendar, Coins, Loader } from 'lucide-react';

interface Purchase {
  id: number;
  productId: number;
  productName: string;
  nxSpent: number;
  purchaseDate: string;
  formattedDate: string;
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
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!profile?.username) return;
    loadData();
  }, [profile?.username]);

  const loadData = async () => {
    try {
      setLoading(true);
      const historyData = await api.request<Purchase[]>('GET', `/purchase-history/${profile?.username}`).catch(err => {
        console.error('Error loading purchase history:', err);
        return [];
      });
      
      setPurchases(historyData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-300 transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black">Historial de Compras</h1>
        <p className="mt-1 text-slate-400">Todas tus compras de NX</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 lg:grid-cols-2">
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
      </div>

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
            {/* Header del tabla en desktop */}
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
                      <p className="font-semibold text-white">{purchase.productName}</p>
                      <p className="text-xs text-slate-400 mt-1">{purchase.formattedDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-purple-400">{purchase.nxSpent.toLocaleString()} NX</p>
                    </div>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden lg:col-span-6 lg:block">
                  <p className="font-semibold text-white">{purchase.productName}</p>
                  <p className="text-xs text-slate-400 mt-1">ID: {purchase.productId}</p>
                </div>

                <div className="hidden lg:col-span-3 lg:block text-right">
                  <p className="font-semibold text-purple-400">{purchase.nxSpent.toLocaleString()} NX</p>
                </div>

                <div className="hidden lg:col-span-3 lg:block text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <p className="text-sm text-slate-400">{purchase.formattedDate}</p>
                  </div>
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
            💡 Mostrando las últimas 50 compras.
          </p>
        </div>
      )}
    </div>
  );
}
