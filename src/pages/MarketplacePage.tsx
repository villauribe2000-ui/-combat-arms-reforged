import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Search, Plus, Trash2, Image, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';

interface Listing {
  id: number;
  oidUser: number;
  username: string;
  NickName: string;
  itemName: string;
  itemDescription: string;
  itemRarity: string;
  sellingPrice: number;
  quantity: number;
  condition: string;
  imageBase64?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  soldAt?: string;
  soldTo?: string;
}

interface PurchaseItem {
  purchaseLogId: number;
  productId: number;
  productName: string;
  nxPaid: number;
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

const RARITIES = [
  { id: 'all', label: 'Todas las Rarezas' },
  { id: 'común', label: 'Común' },
  { id: 'raro', label: 'Raro' },
  { id: 'épico', label: 'Épico' },
  { id: 'legendario', label: 'Legendario' },
];

export default function MarketplacePage() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [availableItems, setAvailableItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showNewListingModal, setShowNewListingModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<'marketplace' | 'myListings'>('marketplace');
  const [creatingListing, setCreatingListing] = useState(false);
  const [refreshUserListings, setRefreshUserListings] = useState(0);
  const [showPurchaseConfirmModal, setShowPurchaseConfirmModal] = useState(false);
  const [purchaseConfirmData, setPurchaseConfirmData] = useState<Listing | null>(null);

  const [newListing, setNewListing] = useState({
    selectedItem: null as PurchaseItem | null,
    sellingPrice: '',
    imageBase64: '',
  });
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (profile?.username) {
      loadListings();
    }
  }, [profile?.username, search, rarity, page]);

  // Cargar mis publicaciones cuando cambia el tab o cuando se crea/elimina una publicación
  useEffect(() => {
    if (profile?.username && activeTab === 'myListings') {
      loadUserListings();
    }
  }, [profile?.username, activeTab, refreshUserListings]);

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

  const loadListings = async () => {
    try {
      setLoading(true);
      const result = await api.getMarketplaceListings(page, 20, search, rarity);
      setListings(result.listings || []);
      setTotalPages(result.pagination?.pages || 1);
    } catch (error) {
      console.error('Error loading listings:', error);
      showToast('error', 'Error', 'No se pudieron cargar las publicaciones');
    } finally {
      setLoading(false);
    }
  };

  const loadUserListings = async () => {
    if (!profile?.username) return;
    try {
      const data = await api.getUserMarketplaceListings(profile.username);
      setUserListings(data || []);
    } catch (error) {
      console.error('Error loading user listings:', error);
    }
  };

  const loadAvailableItems = async () => {
    if (!profile?.username) return;
    try {
      const data = await api.getAvailableItemsForSelling(profile.username);
      setAvailableItems(data || []);
    } catch (error) {
      console.error('Error loading available items:', error);
      showToast('error', 'Error', 'No se pudieron cargar los items');
    }
  };

  const handleOpenNewListingModal = async () => {
    await loadAvailableItems();
    setShowNewListingModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      setNewListing(prev => ({ ...prev, imageBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreateListing = async () => {
    if (!newListing.selectedItem) {
      showToast('error', 'Error', 'Debes seleccionar un item');
      return;
    }

    if (!newListing.sellingPrice || parseInt(newListing.sellingPrice) < 1) {
      showToast('error', 'Error', 'El precio debe ser mayor a 0');
      return;
    }

    try {
      setCreatingListing(true);
      const result = await api.createMarketplaceListing(
        profile?.id as unknown as number || 0,
        profile?.username || '',
        profile?.NickName || profile?.username || '',
        newListing.selectedItem.productName,
        '',
        'común',
        parseInt(newListing.sellingPrice),
        1,
        'N/A',
        newListing.imageBase64,
        newListing.selectedItem?.purchaseLogId
      );

      if (result.success) {
        showToast('success', 'Éxito', 'Publicación creada exitosamente');
        setNewListing({
          selectedItem: null,
          sellingPrice: '',
          imageBase64: '',
        });
        setImagePreview('');
        setShowNewListingModal(false);
        setRefreshUserListings(prev => prev + 1); // Trigger refresh
      }
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Error al crear publicación');
    } finally {
      setCreatingListing(false);
    }
  };

  const handlePurchase = async (listing: Listing) => {
    if (!profile?.id) return;

    // Verificar NX disponible
    if (profile.nx === undefined || profile.nx < listing.sellingPrice) {
      const needed = listing.sellingPrice - (profile.nx || 0);
      showToast(
        'error',
        'NX Insuficiente',
        `Necesitas ${listing.sellingPrice} NX pero solo tienes ${profile.nx || 0} NX. Te faltan ${needed} NX.`
      );
      return;
    }

    // Mostrar modal de confirmación
    setPurchaseConfirmData(listing);
    setShowPurchaseConfirmModal(true);
  };

  const confirmPurchase = async () => {
    if (!purchaseConfirmData || !profile?.id) return;

    try {
      setPurchasing(purchaseConfirmData.id);
      const result = await api.purchaseMarketplaceItem(
        purchaseConfirmData.id,
        profile.id as unknown as number,
        profile.username,
        profile.NickName || profile.username || ''
      );

      if (result.success) {
        showToast(
          'success',
          'Compra exitosa',
          `Has comprado ${purchaseConfirmData.itemName}. El item ha sido enviado a tu inbox. Tu nuevo balance es: ${result.details.buyerNewBalance} NX`
        );
        await loadListings();
        setShowDetailModal(false);
        setShowPurchaseConfirmModal(false);
      }
    } catch (error: any) {
      showToast('error', 'Error en la compra', error.message || 'No se pudo completar la compra');
    } finally {
      setPurchasing(null);
    }
  };

  const handleDeleteListing = async (listingId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return;

    try {
      setDeleting(listingId);
      await api.deleteMarketplaceListing(listingId, profile?.username || '');
      showToast('success', 'Eliminada', 'Publicación eliminada correctamente');
      setRefreshUserListings(prev => prev + 1); // Trigger refresh
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Error al eliminar publicación');
    } finally {
      setDeleting(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      'común': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      'raro': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'épico': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'legendario': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };
    return colors[rarity] || colors['común'];
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toasts */}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Marketplace</h1>
          <p className="mt-1 text-slate-400">Compra y vende items que has comprado</p>
        </div>
        {profile && (
          <button
            onClick={handleOpenNewListingModal}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition font-semibold"
          >
            <Plus className="h-5 w-5" />
            Vender Item
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => {
            setActiveTab('marketplace');
            setPage(1);
          }}
          className={`px-4 py-3 font-semibold border-b-2 transition ${
            activeTab === 'marketplace'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          🛒 Marketplace ({listings.length})
        </button>
        {profile && (
          <button
            onClick={() => {
              setActiveTab('myListings');
            }}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              activeTab === 'myListings'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            📋 Mis Publicaciones ({userListings.length})
          </button>
        )}
      </div>

      {/* Marketplace Tab */}
      {activeTab === 'marketplace' && (
        <>
          {/* Filtros */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar items..."
                className="w-full rounded-lg bg-white/10 border border-white/20 pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={rarity}
              onChange={(e) => {
                setRarity(e.target.value);
                setPage(1);
              }}
              className="rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              {RARITIES.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Grid de publicaciones */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Search className="h-12 w-12 opacity-50 mb-2" />
              <p>No se encontraron publicaciones</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {listings.map(listing => (
                  <button
                    key={listing.id}
                    onClick={() => {
                      setSelectedListing(listing);
                      setShowDetailModal(true);
                    }}
                    className="text-left rounded-2xl border border-white/10 bg-[#0d1320] p-4 hover:border-cyan-500/50 hover:bg-white/5 transition group"
                  >
                    {/* Imagen */}
                    {listing.imageBase64 ? (
                      <img
                        src={listing.imageBase64}
                        alt={listing.itemName}
                        className="w-full h-32 object-cover rounded-lg mb-3 group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg mb-3 flex items-center justify-center">
                        <Image className="h-8 w-8 text-slate-600" />
                      </div>
                    )}

                    {/* Rareza */}
                    <div className="mb-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getRarityColor(listing.itemRarity)}`}>
                        {listing.itemRarity}
                      </span>
                    </div>

                    {/* Nombre */}
                    <h3 className="font-bold text-white truncate">{listing.itemName}</h3>
                    <p className="text-xs text-slate-400 mt-1">Vendedor: {listing.NickName}</p>

                    {/* Precio */}
                    <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-400">NX</span>
                      </div>
                      <div>
                        <span className="text-lg font-black text-blue-400">{listing.sellingPrice}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <span className="text-slate-400">Página {page} de {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* My Listings Tab */}
      {activeTab === 'myListings' && (
        <>
          {userListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <AlertCircle className="h-12 w-12 opacity-50 mb-2" />
              <p>No tienes publicaciones aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userListings.map(listing => (
                <div
                  key={listing.id}
                  className={`rounded-xl border p-4 transition ${
                    listing.status === 'active'
                      ? 'border-white/10 bg-white/5'
                      : listing.status === 'sold'
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-slate-600/30 bg-slate-600/10 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-white text-lg">{listing.itemName}</h3>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getRarityColor(listing.itemRarity)}`}>
                          {listing.itemRarity}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                          listing.status === 'active'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : listing.status === 'sold'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                        }`}>
                          {listing.status === 'active' ? 'Activa' : listing.status === 'sold' ? 'Vendida' : 'Removida'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-slate-400 mt-2">
                        <div>
                          <p>Precio: <span className="text-blue-400 font-semibold">{listing.sellingPrice} NX</span></p>
                        </div>
                        <div>
                          <p>Publicado: <span className="text-white font-semibold">{new Date(listing.createdAt).toLocaleDateString('es')}</span></p>
                        </div>
                      </div>

                      {listing.status === 'sold' && listing.soldTo && (
                        <p className="text-sm text-emerald-400 mt-2">Vendido a: {listing.soldTo}</p>
                      )}
                    </div>

                    {listing.status === 'active' && (
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        disabled={deleting === listing.id}
                        className="ml-4 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {deleting === listing.id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal: Crear publicación */}
      {showNewListingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1320] max-w-2xl w-full max-h-96 overflow-y-auto p-6">
            <h2 className="text-2xl font-black text-cyan-400 mb-6">Vender Item</h2>

            {availableItems.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">No tienes items disponibles para vender</p>
                <p className="text-sm text-slate-500 mt-2">Solo puedes vender items que has comprado y no han sido reembolsados</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Seleccionar Item */}
                <div>
                  <label className="block text-sm font-semibold text-slate-400 mb-2">Selecciona un Item *</label>
                  <select
                    value={newListing.selectedItem ? newListing.selectedItem.purchaseLogId : ''}
                    onChange={(e) => {
                      const item = availableItems.find(i => i.purchaseLogId === parseInt(e.target.value));
                      setNewListing(prev => ({ ...prev, selectedItem: item || null }));
                    }}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Selecciona un item --</option>
                    {availableItems.map(item => (
                      <option key={item.purchaseLogId} value={item.purchaseLogId}>
                        {item.productName} (Compraste por {item.nxPaid} NX)
                      </option>
                    ))}
                  </select>
                </div>

                {newListing.selectedItem && (
                  <>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-sm text-slate-400">Item seleccionado:</p>
                      <p className="text-white font-bold mt-1">{newListing.selectedItem.productName}</p>
                      <p className="text-xs text-slate-500 mt-1">Pagaste: {newListing.selectedItem.nxPaid} NX</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-400 mb-2">Precio de Venta (NX) *</label>
                      <input
                        type="number"
                        value={newListing.sellingPrice}
                        onChange={(e) => setNewListing({ ...newListing, sellingPrice: e.target.value })}
                        placeholder="0"
                        min="1"
                        className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-400 mb-2">Imagen del Item *</label>
                      <div className="flex flex-col gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          required
                        />
                        {imagePreview && (
                          <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-lg object-cover border border-cyan-500/30" />
                        )}
                        {!imagePreview && (
                          <p className="text-xs text-slate-400">Sin imagen (opcional)</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => {
                          setShowNewListingModal(false);
                          setNewListing({ selectedItem: null, sellingPrice: '', imageBase64: '' });
                          setImagePreview('');
                        }}
                        className="flex-1 rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition py-2 font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreateListing}
                        disabled={creatingListing}
                        className="flex-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition py-2 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {creatingListing ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Publicando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Publicar
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Detalle de publicación */}
      {showDetailModal && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1320] max-w-lg w-full p-6">
            <h2 className="text-2xl font-black text-cyan-400 mb-4">{selectedListing.itemName}</h2>

            {/* Imagen */}
            {selectedListing.imageBase64 ? (
              <img
                src={selectedListing.imageBase64}
                alt={selectedListing.itemName}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg mb-4 flex items-center justify-center">
                <Image className="h-12 w-12 text-slate-600" />
              </div>
            )}

            {/* Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rareza:</span>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${getRarityColor(selectedListing.itemRarity)}`}>
                  {selectedListing.itemRarity}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Vendedor:</span>
                <span className="text-white font-semibold">{selectedListing.NickName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cantidad:</span>
                <span className="text-white font-semibold">{selectedListing.quantity}</span>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-slate-400">Precio:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-blue-400">{selectedListing.sellingPrice}</span>
                  <span className="text-sm font-semibold text-blue-400">NX</span>
                </div>
              </div>

              {/* Balance info */}
              {profile && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Tu Balance:</span>
                    <span className={`text-lg font-black ${
                      profile.nx !== undefined && profile.nx < selectedListing.sellingPrice
                        ? 'text-red-400'
                        : 'text-blue-400'
                    }`}>
                      {profile.nx || 0} NX
                    </span>
                  </div>

                  {profile.nx !== undefined && profile.nx < selectedListing.sellingPrice ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Te Falta:</span>
                        <span className="text-lg font-black text-red-400">
                          {selectedListing.sellingPrice - profile.nx} NX
                        </span>
                      </div>
                      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                        <p className="text-sm text-red-400 font-semibold">ADVERTENCIA: NX Insuficiente</p>
                        <p className="text-xs text-red-300 mt-1">
                          Necesitas {selectedListing.sellingPrice} NX pero tienes {profile.nx} NX
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Te Quedara:</span>
                      <span className="text-lg font-black text-emerald-400">
                        {(profile.nx || 0) - selectedListing.sellingPrice} NX
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition py-2 font-semibold"
              >
                Cerrar
              </button>
              {profile && selectedListing.status === 'active' && (
                <button
                  onClick={() => {
                    console.log(`[DEBUG] Comprando listing ${selectedListing.id} con profile:`, profile);
                    handlePurchase(selectedListing);
                  }}
                  disabled={
                    purchasing === selectedListing.id || 
                    selectedListing.username === profile.username ||
                    (profile.nx !== undefined && profile.nx < selectedListing.sellingPrice)
                  }
                  title={
                    profile.nx !== undefined && profile.nx < selectedListing.sellingPrice
                      ? `NX insuficiente: tienes ${profile.nx} NX, necesitas ${selectedListing.sellingPrice} NX`
                      : ''
                  }
                  className="flex-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition py-2 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {purchasing === selectedListing.id ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Comprando...
                    </>
                  ) : selectedListing.username === profile.username ? (
                    <>
                      Tu Item
                    </>
                  ) : profile.nx !== undefined && profile.nx < selectedListing.sellingPrice ? (
                    <>
                      [ADVERTENCIA] NX Insuficiente
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-semibold">NX</span>
                      Comprar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de compra */}
      {showPurchaseConfirmModal && purchaseConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1320] max-w-lg w-full p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-cyan-400 mb-2">Confirmar Compra</h2>
              <p className="text-slate-400">Por favor revisa los detalles de tu compra</p>
            </div>

            {/* Detalles del item */}
            <div className="space-y-4 mb-8 bg-white/5 rounded-xl p-6 border border-white/10">
              {/* Item */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="text-slate-400">Artículo:</span>
                <span className="text-white font-semibold">{purchaseConfirmData.itemName}</span>
              </div>

              {/* Vendedor */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="text-slate-400">Vendedor:</span>
                <span className="text-white font-semibold">{purchaseConfirmData.NickName}</span>
              </div>

              {/* Rareza */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="text-slate-400">Rareza:</span>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${getRarityColor(purchaseConfirmData.itemRarity)}`}>
                  {purchaseConfirmData.itemRarity}
                </span>
              </div>

              {/* Precio */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">Precio Total:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-blue-400">{purchaseConfirmData.sellingPrice}</span>
                  <span className="text-sm font-semibold text-blue-400">NX</span>
                </div>
              </div>
            </div>

            {/* Resumen de saldo */}
            <div className="space-y-3 mb-8 bg-slate-500/10 rounded-xl p-6 border border-slate-500/20">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Saldo Actual:</span>
                <span className="text-white font-semibold">{profile?.nx || 0} NX</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Costo de Transacción:</span>
                <span className="text-red-400 font-semibold">-{purchaseConfirmData.sellingPrice} NX</span>
              </div>
              <div className="pt-3 border-t border-slate-500/30 flex items-center justify-between">
                <span className="text-white font-semibold">Saldo Después:</span>
                <span className="text-emerald-400 font-black text-lg">
                  {(profile?.nx || 0) - purchaseConfirmData.sellingPrice} NX
                </span>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPurchaseConfirmModal(false);
                  setPurchaseConfirmData(null);
                }}
                className="flex-1 rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition py-3 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPurchase}
                disabled={purchasing === purchaseConfirmData.id}
                className="flex-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {purchasing === purchaseConfirmData.id ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Confirmar Compra
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
