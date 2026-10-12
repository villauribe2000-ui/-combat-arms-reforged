import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ShoppingBag, Calendar, Coins, Loader, History } from 'lucide-react';

interface Purchase {
  id: number;
  productId: number;
  productName: string;
  nxSpent: number;
  purchaseDate: string;
  formattedDate: string;
}

export default function PurchaseHistoryPage() {
  const { profile } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalNx = purchases.reduce((sum, p) => sum + p.nxSpent, 0);

  if (!profile?.username) {
    return null;
  }

  return (
    <main className="inner-page page-width history-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> PLAYER LEDGER</p>
          <h1>PURCHASE HISTORY.</h1>
          <p className="page-heading-description">
            Todas tus compras de NX. El registro muestra producto, gasto y fecha.
          </p>
        </div>
        <div className="page-heading-aside">
          <span className="charge-badge">
            <History size={14} /> {purchases.length.toLocaleString()} ORDERS
          </span>
        </div>
      </header>

      <div className="history-metrics">
        <article>
          <div>
            <p>TOTAL COMPRAS</p>
            <strong>{purchases.length.toLocaleString()}</strong>
          </div>
          <ShoppingBag size={28} />
        </article>
        <article>
          <div>
            <p>NX TOTAL GASTADO</p>
            <strong>{totalNx.toLocaleString()}</strong>
          </div>
          <Coins size={28} />
        </article>
      </div>

      <section className="history-board">
        <div className="history-toolbar">
          <div className="history-board-title">
            <ShoppingBag size={20} />
            <h2>RECENT ORDERS</h2>
            <span>LIVE</span>
          </div>
        </div>

        {loading ? (
          <div className="history-empty">
            <Loader className="mx-auto h-8 w-8 animate-spin" />
            <h3>LOADING HISTORY</h3>
            <p>Cargando tus compras de NX.</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="history-empty">
            <ShoppingBag className="mx-auto h-8 w-8" />
            <h3>NO ORDERS YET</h3>
            <p>No hay compras en tu historial.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="history-table">
              <thead>
                <tr>
                  <th>PRODUCTO</th>
                  <th>NX GASTADO</th>
                  <th>FECHA</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(purchase => (
                  <tr key={purchase.id}>
                    <td>
                      <span className="history-name">{purchase.productName}</span>
                      <span className="history-id">ID {purchase.productId}</span>
                    </td>
                    <td className="history-nx">{purchase.nxSpent.toLocaleString()} NX</td>
                    <td>
                      <span className="history-date">
                        <Calendar size={14} />
                        {purchase.formattedDate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="history-notes">
        <p>{purchases.length > 0 ? 'Mostrando las últimas 50 compras registradas en tu cuenta.' : 'Las compras de NX aparecen aquí cuando se confirman.'}</p>
        <p>NX LEDGER / COMBAT ARMS EVOLUTION</p>
      </div>
    </main>
  );
}
