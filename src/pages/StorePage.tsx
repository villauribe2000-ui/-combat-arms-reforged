import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, type Product, RARITY_INFO } from '@/lib/supabase';
import { Store, ShoppingCart, Check, X, Sparkles, Filter } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'skin', label: 'Skins' },
  { id: 'booster', label: 'Boosters' },
  { id: 'cosmetic', label: 'Cosmeticos' },
  { id: 'pass', label: 'Pases' },
  { id: 'bundle', label: 'Bundles' },
];

export default function StorePage() {
  const { profile, refreshProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [modal, setModal] = useState<{ product: Product; success: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
      setProducts(data as Product[] || []);
      setLoading(false);
    })();
  }, []);

  const filtered = category === 'all' ? products : products.filter(p => p.category === category);

  const handlePurchase = async (product: Product) => {
    if (!profile) return;
    if (profile.cash_balance < product.price) {
      setModal({ product, success: false });
      return;
    }
    setPurchasing(product.id);
    try {
      const newBalance = profile.cash_balance - product.price;
      await supabase.from('purchases').insert({
        user_id: profile.id,
        product_id: product.id,
        amount: product.price,
        status: 'completed',
      });
      await supabase.from('transactions').insert({
        user_id: profile.id,
        type: 'purchase',
        amount: -product.price,
        description: `Compra: ${product.name}`,
        balance_after: newBalance,
      });
      await supabase.from('profiles').update({ cash_balance: newBalance }).eq('id', profile.id);
      await refreshProfile();
      setModal({ product, success: true });
    } catch {
      setModal({ product, success: false });
    }
    setPurchasing(null);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">Tienda</h1>
          <p className="mt-1 text-slate-400">Items exclusivos para mejorar tu experiencia</p>
        </div>
        {profile && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1320] px-5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/20">
              <span className="text-sm font-bold text-fuchsia-400">$</span>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tu Balance</p>
              <p className="font-bold text-fuchsia-400">${profile.cash_balance.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 shrink-0 text-slate-500" />
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              category === c.id ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-slate-500">
          <Store className="h-12 w-12 text-slate-600" />
          <p className="mt-3">No hay productos en esta categoria</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(product => {
            const rarity = RARITY_INFO[product.rarity] || RARITY_INFO.common;
            const canAfford = profile ? profile.cash_balance >= product.price : false;
            const inStock = product.stock === -1 || product.stock > 0;
            return (
              <div key={product.id} className={`group relative overflow-hidden rounded-2xl border ${rarity.border} bg-gradient-to-br from-[#0d1320] to-[#0a0e17] p-5 transition-all hover:shadow-xl hover:shadow-cyan-500/5`}>
                <div className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${rarity.bg} ${rarity.text} border ${rarity.border}`}>
                  {rarity.label}
                </div>
                {/* Product visual */}
                <div className={`relative mb-4 flex h-32 items-center justify-center rounded-xl bg-gradient-to-br ${rarity.bg} ${rarity.border} border`}>
                  <Sparkles className={`h-12 w-12 ${rarity.text} opacity-60 transition-transform group-hover:scale-110`} />
                  <div className="absolute bottom-2 right-2 rounded-lg bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                    {product.category}
                  </div>
                </div>
                <h3 className="font-bold text-white">{product.name}</h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{product.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black text-amber-400">${product.price.toFixed(2)}</p>
                    {product.stock > 0 && (
                      <p className="text-[10px] text-slate-500">{product.stock} en stock</p>
                    )}
                  </div>
                  <button
                    onClick={() => handlePurchase(product)}
                    disabled={!profile || purchasing === product.id || !inStock}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      !profile
                        ? 'cursor-not-allowed bg-white/5 text-slate-600'
                        : !inStock
                        ? 'cursor-not-allowed bg-white/5 text-slate-600'
                        : canAfford
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:scale-105'
                        : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                    }`}
                  >
                    {purchasing === product.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    {profile ? (canAfford ? 'Comprar' : 'Sin fondos') : 'Login'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Purchase modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1320] p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${modal.success ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              {modal.success ? <Check className="h-8 w-8 text-emerald-400" /> : <X className="h-8 w-8 text-rose-400" />}
            </div>
            <h3 className="text-lg font-bold">{modal.success ? 'Compra Exitosa!' : 'Fondos Insuficientes'}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {modal.success
                ? `Has comprado ${modal.product.name} por $${modal.product.price.toFixed(2)}`
                : `Necesitas $${(modal.product.price - (profile?.cash_balance || 0)).toFixed(2)} mas para comprar ${modal.product.name}`}
            </p>
            <button onClick={() => setModal(null)} className="mt-6 w-full rounded-xl bg-white/10 py-2.5 font-semibold text-white transition-colors hover:bg-white/20">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
