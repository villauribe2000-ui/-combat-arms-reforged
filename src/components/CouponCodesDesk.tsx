import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { KeyRound, Loader, Search, Trash2 } from 'lucide-react';

type Reward = { productId: number; name: string; message?: string };
type PromoCode = {
  code: string;
  displayCode: string;
  used: boolean;
  usedAt: string | null;
  usedBy: { oidUser: number; username: string; nick: string } | null;
  rewards: (Reward & { sortOrder?: number; fallback?: boolean })[];
};

function normalize(value: string) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 50);
}

function formatCode(value: string) {
  return normalize(value).replace(/(.{5})/g, '$1-').replace(/-$/, '');
}

function when(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('es-CO');
}

export default function CouponCodesDesk() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ id: number; name: string }[]>([]);

  const load = async () => {
    const data = await api.getPromoCodesAdmin();
    setCodes(data.codes || []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (error: any) {
        if (alive) setNotice({ type: 'error', text: error?.message || 'No se pudieron cargar los códigos' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      api.searchEventProducts(text).then((data) => setHits(data.products || [])).catch(() => setHits([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [q]);

  const startCreate = () => {
    setEditing('__new__');
    setCodeInput('');
    setRewards([]);
    setNotice(null);
  };

  const startEdit = (row: PromoCode) => {
    setEditing(row.code);
    setCodeInput(row.displayCode);
    setRewards(row.rewards.filter((r) => !r.fallback).map((r) => ({
      productId: r.productId,
      name: r.name,
      message: r.message || 'COUPON ITEM',
    })));
    setNotice(null);
  };

  const cancel = () => {
    setEditing(null);
    setCodeInput('');
    setRewards([]);
    setQ('');
    setHits([]);
  };

  const save = async () => {
    if (!rewards.length) {
      setNotice({ type: 'error', text: 'Agrega al menos un ítem de recompensa' });
      return;
    }
    try {
      setBusy(true);
      setNotice(null);
      const payload = {
        code: normalize(codeInput) || undefined,
        rewards: rewards.map((r) => ({ productId: r.productId, message: r.message || 'COUPON ITEM' })),
      };
      if (editing === '__new__') {
        await api.createPromoCode(payload as any);
        setNotice({ type: 'ok', text: 'Código creado' });
      } else if (editing) {
        await api.updatePromoCode(editing, {
          code: normalize(codeInput) || editing,
          rewards: payload.rewards,
        } as any);
        setNotice({ type: 'ok', text: 'Código actualizado' });
      }
      cancel();
      await load();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo guardar' });
    } finally {
      setBusy(false);
    }
  };

  const resetUse = async (code: string) => {
    if (!window.confirm('¿Liberar este código para que se pueda canjear otra vez?')) return;
    try {
      setBusy(true);
      await api.updatePromoCode(code, { code, reset: true } as any);
      setNotice({ type: 'ok', text: 'Código liberado' });
      await load();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo liberar' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (code: string) => {
    if (!window.confirm(`¿Eliminar ${formatCode(code)}?`)) return;
    try {
      setBusy(true);
      await api.deletePromoCode(code);
      setNotice({ type: 'ok', text: 'Código eliminado' });
      if (editing === code) cancel();
      await load();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo eliminar' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ev-desk coupon-desk">
      <div className="pl-hero">
        <div className="pl-hero-ico"><KeyRound /></div>
        <div>
          <p className="eyebrow">OPERATIONS / PROMO</p>
          <h1>CÓDIGOS PROMO</h1>
          <p>Códigos del juego (ENTER CODE / CBT_CouponRegister). Crea, edita recompensas o elimínalos. Solo el dueño.</p>
        </div>
      </div>

      <div className="staff-toolbar" style={{ marginBottom: 14 }}>
        <button type="button" className="staff-btn staff-btn-gold" onClick={startCreate} disabled={busy || editing === '__new__'}>
          Nuevo código
        </button>
      </div>

      {notice && <p className={`invite-notice invite-notice-${notice.type}`} style={{ marginBottom: 12 }}>{notice.text}</p>}

      {editing && (
        <section className="invite-card" style={{ marginBottom: 14 }}>
          <p className="invite-kicker">{editing === '__new__' ? 'Crear código' : 'Editar código'}</p>
          <label className="ev-field">
            <span>CÓDIGO (sin guiones o con guiones)</span>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="IZ8XU-CQU5P-SSR0Z-9VF4P-YB8VC-QI59N"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <p className="sub" style={{ marginTop: 0 }}>
            Se guarda sin guiones. Vacío al crear = se genera uno de 30 caracteres.
            Vista: <strong>{formatCode(codeInput) || '—'}</strong>
          </p>

          <h3>Recompensas (ítems a la bandeja)</h3>
          <div className="ev-items">
            <div className="ev-picks">
              {rewards.map((item) => (
                <button key={item.productId} type="button" onClick={() => setRewards(rewards.filter((r) => r.productId !== item.productId))}>
                  {item.name}
                  <small>{item.productId}</small>
                </button>
              ))}
              {!rewards.length && <span className="ev-empty">Sin ítems</span>}
            </div>
            <label className="ev-search">
              <Search />
              <input value={q} placeholder="Buscar ítem o ID" onChange={(e) => setQ(e.target.value)} />
            </label>
            {hits.length > 0 && (
              <div className="ev-hits">
                {hits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => {
                      if (!rewards.some((r) => r.productId === hit.id)) {
                        setRewards([...rewards, { productId: hit.id, name: hit.name, message: 'COUPON ITEM' }]);
                      }
                      setQ('');
                      setHits([]);
                    }}
                  >
                    {hit.name}
                    <small>{hit.id}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="admin-actions" style={{ marginTop: 14, gap: 8 }}>
            <button type="button" className="admin-ok" disabled={busy} onClick={save}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="admin-no" disabled={busy} onClick={cancel}>Cancelar</button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="pd-empty"><Loader className="animate-spin" /> Cargando…</div>
      ) : codes.length === 0 ? (
        <div className="pd-empty">No hay códigos promo todavía.</div>
      ) : (
        <div className="coupon-list">
          {codes.map((row) => (
            <article className="admin-row" key={row.code}>
              <div>
                <b>{row.displayCode}</b>
                <span>
                  {row.used
                    ? `Usado · ${row.usedBy?.username || row.usedBy?.oidUser || '?'} · ${when(row.usedAt)}`
                    : 'Disponible'}
                  {' · '}
                  {row.rewards.filter((r) => !r.fallback).length
                    ? row.rewards.filter((r) => !r.fallback).map((r) => r.name).join(', ')
                    : `Fallback ${row.rewards.map((r) => r.productId).join(', ')}`}
                </span>
              </div>
              <div className="admin-actions">
                <button type="button" className="admin-ok" disabled={busy} onClick={() => startEdit(row)}>Editar</button>
                {row.used && (
                  <button type="button" className="staff-btn" disabled={busy} onClick={() => resetUse(row.code)}>Liberar</button>
                )}
                <button type="button" className="admin-no" disabled={busy} onClick={() => remove(row.code)}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
