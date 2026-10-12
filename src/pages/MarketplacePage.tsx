import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Search, Plus, Trash2, Image as ImageIcon, AlertCircle, CheckCircle, XCircle, Loader, Store, Coins, ChevronLeft, ChevronRight } from 'lucide-react';

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
  { id: 'all', label: 'Todas las rarezas' },
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
        setRefreshUserListings(prev => prev + 1);
      }
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Error al crear publicación');
    } finally {
      setCreatingListing(false);
    }
  };

  const handlePurchase = async (listing: Listing) => {
    if (!profile?.id) return;

    if (profile.gameCoins === undefined || profile.gameCoins < listing.sellingPrice) {
      const needed = listing.sellingPrice - (profile.gameCoins || 0);
      showToast(
        'error',
        'NX Insuficiente',
        `Necesitas ${listing.sellingPrice} NX pero solo tienes ${profile.gameCoins || 0} NX. Te faltan ${needed} NX.`
      );
      return;
    }

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
      setRefreshUserListings(prev => prev + 1);
    } catch (error: any) {
      showToast('error', 'Error', error.message || 'Error al eliminar publicación');
    } finally {
      setDeleting(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      'común': 'shop-rarity shop-rarity-comun',
      'raro': 'shop-rarity shop-rarity-raro',
      'épico': 'shop-rarity shop-rarity-epico',
      'legendario': 'shop-rarity shop-rarity-legendario',
    };
    return colors[rarity] || colors['común'];
  };

  const nxBalance = Number(profile?.gameCoins ?? 0);

  return (
    <main className="inner-page page-width shop-page">
      <div className="shop-toasts">
        {toasts.map(toast => (
          <div key={toast.id} className={`shop-toast shop-toast-${toast.type}`}>
            <div className="flex items-start gap-3">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-[#8fd4a4] flex-shrink-0 mt-0.5" />}
              {toast.type === 'error' && <XCircle className="h-5 w-5 text-[#e8a0a0] flex-shrink-0 mt-0.5" />}
              {toast.type === 'info' && <AlertCircle className="h-5 w-5 text-[#e6aa55] flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <h3>{toast.title}</h3>
                <p>{toast.message}</p>
              </div>
              <button type="button" onClick={() => removeToast(toast.id)} className="text-[#888]">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> PLAYER EMPORIUM</p>
          <h1>MARKETPLACE.</h1>
          <p className="page-heading-description">
            Compra y vende items entre soldados. Las publicaciones activas se pagan con NX y el item llega al inbox.
          </p>
        </div>
        <div className="page-heading-aside">
          <span className="charge-badge">
            <Coins size={14} /> NX — {nxBalance.toLocaleString()}
          </span>
        </div>
      </header>

      <div className="shop-tabs" role="tablist">
        <button
          type="button"
          className={`shop-tab${activeTab === 'marketplace' ? ' shop-tab-active' : ''}`}
          onClick={() => { setActiveTab('marketplace'); setPage(1); }}
        >
          <Store size={16} /> Marketplace <small>{listings.length}</small>
        </button>
        {profile && (
          <button
            type="button"
            className={`shop-tab${activeTab === 'myListings' ? ' shop-tab-active' : ''}`}
            onClick={() => setActiveTab('myListings')}
          >
            Mis publicaciones <small>{userListings.length}</small>
          </button>
        )}
      </div>

      {activeTab === 'marketplace' && (
        <section className="shop-board">
          <div className="shop-toolbar">
            <div className="shop-board-title">
              <Store size={20} />
              <h2>LIVE LISTINGS</h2>
            </div>
            <div className="shop-controls">
              <label className="shop-search">
                <Search size={14} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Buscar items..."
                />
              </label>
              <select
                className="shop-select"
                value={rarity}
                onChange={(e) => { setRarity(e.target.value); setPage(1); }}
              >
                {RARITIES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="shop-empty">
              <Loader className="mx-auto h-8 w-8 animate-spin" />
              <h3>LOADING MARKET</h3>
              <p>Cargando publicaciones activas.</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="shop-empty">
              <Search className="mx-auto h-8 w-8" />
              <h3>NO LISTINGS YET</h3>
              <p>No se encontraron publicaciones con esos filtros.</p>
            </div>
          ) : (
            <div className="shop-grid">
              {listings.map(listing => (
                <button
                  key={listing.id}
                  type="button"
                  className="shop-card"
                  onClick={() => { setSelectedListing(listing); setShowDetailModal(true); }}
                >
                  <div className="shop-card-media">
                    {listing.imageBase64 ? (
                      <img src={listing.imageBase64} alt="" />
                    ) : (
                      <ImageIcon className="h-8 w-8" />
                    )}
                  </div>
                  <div className="shop-card-body">
                    <span className={getRarityColor(listing.itemRarity)}>{listing.itemRarity}</span>
                    <h3>{listing.itemName}</h3>
                    <p>Vendedor: {listing.NickName}</p>
                    <div className="shop-card-foot">
                      <span>NX</span>
                      <strong>{listing.sellingPrice.toLocaleString()}</strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="shop-pager">
              <p>Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'myListings' && (
        <section className="shop-board">
          <div className="shop-toolbar">
            <div className="shop-board-title">
              <Store size={20} />
              <h2>YOUR LISTINGS</h2>
            </div>
          </div>
          {userListings.length === 0 ? (
            <div className="shop-empty">
              <AlertCircle className="mx-auto h-8 w-8" />
              <h3>NO PUBLICATIONS</h3>
              <p>Todavía no tienes publicaciones en el marketplace.</p>
            </div>
          ) : (
            <div className="shop-rows">
              {userListings.map(listing => (
                <article key={listing.id} className="shop-row">
                  <div>
                    <h3>{listing.itemName}</h3>
                    <p>Precio {listing.sellingPrice.toLocaleString()} NX · Publicado {new Date(listing.createdAt).toLocaleDateString('es')}</p>
                    <div className="shop-row-meta">
                      <span className={getRarityColor(listing.itemRarity)}>{listing.itemRarity}</span>
                      <span className={`shop-status shop-status-${listing.status}`}>
                        {listing.status === 'active' ? 'Activa' : listing.status === 'sold' ? 'Vendida' : 'Removida'}
                      </span>
                    </div>
                    {listing.status === 'sold' && listing.soldTo && (
                      <p>Vendido a: {listing.soldTo}</p>
                    )}
                  </div>
                  {listing.status === 'active' && (
                    <button
                      type="button"
                      className="shop-delete"
                      onClick={() => handleDeleteListing(listing.id)}
                      disabled={deleting === listing.id}
                    >
                      {deleting === listing.id ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="shop-notes">
        <p>Los items comprados se envían al inbox del juego. El NX se descuenta al confirmar.</p>
        <p>PLAYER MARKETPLACE / NX TRADING</p>
      </div>

      {showNewListingModal && (
        <div className="shop-modal-back">
          <div className="shop-modal">
            <h2>VENDER ITEM.</h2>
            {availableItems.length === 0 ? (
              <div className="shop-empty" style={{ padding: '32px 0' }}>
                <AlertCircle className="mx-auto h-8 w-8" />
                <h3>SIN ITEMS</h3>
                <p>Solo puedes vender items que has comprado y no han sido reembolsados.</p>
              </div>
            ) : (
              <div>
                <div className="shop-field">
                  <label>Selecciona un item</label>
                  <select
                    value={newListing.selectedItem ? newListing.selectedItem.purchaseLogId : ''}
                    onChange={(e) => {
                      const item = availableItems.find(i => i.purchaseLogId === parseInt(e.target.value));
                      setNewListing(prev => ({ ...prev, selectedItem: item || null }));
                    }}
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
                    <div className="shop-kv">
                      <span>Item seleccionado</span>
                      <strong>{newListing.selectedItem.productName}</strong>
                    </div>
                    <div className="shop-field">
                      <label>Precio de venta (NX)</label>
                      <input
                        type="number"
                        value={newListing.sellingPrice}
                        onChange={(e) => setNewListing({ ...newListing, sellingPrice: e.target.value })}
                        placeholder="0"
                        min="1"
                      />
                    </div>
                    <div className="shop-field">
                      <label>Imagen del item</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} />
                      {imagePreview && <img src={imagePreview} alt="" className="mt-3 h-24 w-24 object-cover border border-[#303030]" />}
                    </div>
                    <div className="shop-modal-actions">
                      <button
                        type="button"
                        className="shop-btn"
                        onClick={() => {
                          setShowNewListingModal(false);
                          setNewListing({ selectedItem: null, sellingPrice: '', imageBase64: '' });
                          setImagePreview('');
                        }}
                      >
                        Cancelar
                      </button>
                      <button type="button" className="shop-btn shop-btn-primary" onClick={handleCreateListing} disabled={creatingListing}>
                        {creatingListing ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {creatingListing ? 'Publicando...' : 'Publicar'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showDetailModal && selectedListing && (
        <div className="shop-modal-back">
          <div className="shop-modal">
            <h2>{selectedListing.itemName}</h2>
            <div className="shop-modal-media">
              {selectedListing.imageBase64 ? (
                <img src={selectedListing.imageBase64} alt="" />
              ) : (
                <ImageIcon className="h-12 w-12 text-[#666]" />
              )}
            </div>
            <div className="shop-kv">
              <span>Rareza</span>
              <span className={getRarityColor(selectedListing.itemRarity)}>{selectedListing.itemRarity}</span>
            </div>
            <div className="shop-kv">
              <span>Vendedor</span>
              <strong>{selectedListing.NickName}</strong>
            </div>
            <div className="shop-kv">
              <span>Cantidad</span>
              <strong>{selectedListing.quantity}</strong>
            </div>
            <div className="shop-kv">
              <span>Precio</span>
              <strong className="shop-price">{selectedListing.sellingPrice.toLocaleString()} NX</strong>
            </div>
            {profile && (
              <>
                <div className="shop-kv">
                  <span>Tu balance</span>
                  <strong>{nxBalance.toLocaleString()} NX</strong>
                </div>
                {nxBalance < selectedListing.sellingPrice ? (
                  <div className="shop-warn">
                    NX insuficiente. Necesitas {selectedListing.sellingPrice.toLocaleString()} NX y tienes {nxBalance.toLocaleString()} NX.
                  </div>
                ) : (
                  <div className="shop-kv">
                    <span>Te quedará</span>
                    <strong>{(nxBalance - selectedListing.sellingPrice).toLocaleString()} NX</strong>
                  </div>
                )}
              </>
            )}
            <div className="shop-modal-actions">
              <button type="button" className="shop-btn" onClick={() => setShowDetailModal(false)}>Cerrar</button>
              {profile && selectedListing.status === 'active' && (
                <button
                  type="button"
                  className="shop-btn shop-btn-primary"
                  onClick={() => handlePurchase(selectedListing)}
                  disabled={
                    purchasing === selectedListing.id ||
                    selectedListing.username === profile.username ||
                    nxBalance < selectedListing.sellingPrice
                  }
                >
                  {purchasing === selectedListing.id
                    ? 'Comprando...'
                    : selectedListing.username === profile.username
                      ? 'Tu item'
                      : nxBalance < selectedListing.sellingPrice
                        ? 'NX insuficiente'
                        : 'Comprar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPurchaseConfirmModal && purchaseConfirmData && (
        <div className="shop-modal-back">
          <div className="shop-modal">
            <h2>CONFIRMAR COMPRA.</h2>
            <p className="page-heading-description" style={{ marginTop: 0 }}>Revisa el detalle antes de confirmar.</p>
            <div className="shop-kv">
              <span>Artículo</span>
              <strong>{purchaseConfirmData.itemName}</strong>
            </div>
            <div className="shop-kv">
              <span>Vendedor</span>
              <strong>{purchaseConfirmData.NickName}</strong>
            </div>
            <div className="shop-kv">
              <span>Rareza</span>
              <span className={getRarityColor(purchaseConfirmData.itemRarity)}>{purchaseConfirmData.itemRarity}</span>
            </div>
            <div className="shop-kv">
              <span>Precio total</span>
              <strong className="shop-price">{purchaseConfirmData.sellingPrice.toLocaleString()} NX</strong>
            </div>
            <div className="shop-kv">
              <span>Saldo actual</span>
              <strong>{nxBalance.toLocaleString()} NX</strong>
            </div>
            <div className="shop-kv">
              <span>Saldo después</span>
              <strong>{(nxBalance - purchaseConfirmData.sellingPrice).toLocaleString()} NX</strong>
            </div>
            <div className="shop-modal-actions">
              <button
                type="button"
                className="shop-btn"
                onClick={() => { setShowPurchaseConfirmModal(false); setPurchaseConfirmData(null); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="shop-btn shop-btn-primary"
                onClick={confirmPurchase}
                disabled={purchasing === purchaseConfirmData.id}
              >
                {purchasing === purchaseConfirmData.id ? 'Procesando...' : 'Confirmar compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
