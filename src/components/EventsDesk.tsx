import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { CalendarDays, Check, Loader, Search } from 'lucide-react';

type Product = { id: number; name: string };
type Card = { key: string; name: string; blurb: string; active: boolean; from: string | null; to: string | null };

function day(value?: string | null) {
  return String(value || '').slice(0, 10);
}

function clock(value?: string | null) {
  const text = String(value || '').replace(' ', 'T').slice(0, 16);
  return text;
}

function addDays(iso: string, count: number) {
  const [year, month, date] = iso.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + count));
  return next.toISOString().slice(0, 10);
}

function when(value?: string | null) {
  const text = String(value || '');
  if (text.length < 10) return 'sin fecha';
  return text.slice(0, 16).replace('T', ' ');
}

function Items({
  items,
  onChange,
  single = false,
}: {
  items: Product[];
  onChange: (items: Product[]) => void;
  single?: boolean;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Product[]>([]);

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

  return (
    <div className="ev-items">
      <div className="ev-picks">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => onChange(items.filter((row) => row.id !== item.id))}>
            {item.name}
            <small>{item.id}</small>
          </button>
        ))}
        {!items.length && <span className="ev-empty">Sin ítem</span>}
      </div>
      <label className="ev-search">
        <Search />
        <input value={q} placeholder="Buscar ítem o ID" onChange={(event) => setQ(event.target.value)} />
      </label>
      {hits.length > 0 && (
        <div className="ev-hits">
          {hits.map((hit) => (
            <button
              key={hit.id}
              type="button"
              onClick={() => {
                if (single) onChange([hit]);
                else if (!items.some((item) => item.id === hit.id)) onChange([...items, hit]);
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
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ev-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function EventsDesk() {
  const [cards, setCards] = useState<Card[]>([]);
  const [key, setKey] = useState('attendance');
  const [data, setData] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadCards = () => api.getEvents().then((payload) => setCards(payload.events || [])).catch(() => setCards([]));

  const load = (next = key) => {
    setLoading(true);
    setError('');
    api.getEvent(next)
      .then((payload) => {
        setData(payload);
        setDraft(buildDraft(next, payload));
      })
      .catch((err) => setError(err.message || 'No se pudo leer'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCards();
    load('attendance');
  }, []);

  const choose = (next: string) => {
    setKey(next);
    setNotice('');
    load(next);
  };

  const save = async (body: any) => {
    if (!window.confirm('Esto cambia el evento en el servidor. ¿Guardar?')) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.saveEvent(key, body);
      setNotice(result.message || 'Guardado');
      setData(result.data);
      setDraft(buildDraft(key, result.data));
      await loadCards();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ev-desk">
      <div className="pl-hero">
        <div className="pl-hero-ico"><CalendarDays /></div>
        <div>
          <p className="eyebrow">EVENTS / COMBAT ARMS</p>
          <h1>EVENTOS</h1>
          <p>Elige el evento, pon la fecha en que empieza y guarda. Los días siguientes se acomodan solos. Después reinicia el lobby.</p>
        </div>
      </div>

      <div className="ev-cards">
        {cards.map((card) => (
          <button key={card.key} type="button" className={card.key === key ? 'on' : ''} onClick={() => choose(card.key)}>
            <strong>{card.name}</strong>
            <em className={card.active ? 'live' : ''}>{card.active ? 'Activo' : 'Apagado'}</em>
            <small>{when(card.from)} → {when(card.to)}</small>
          </button>
        ))}
      </div>

      {notice && <p className="ev-ok"><Check /> {notice}</p>}
      {error && <p className="ev-err">{error}</p>}
      {loading || !draft ? <div className="admin-empty">{loading ? 'Leyendo eventos...' : 'Sin datos'}</div> : (
        <section className="ol-panel ev-editor">
          {key === 'attendance' && <Attendance draft={draft} setDraft={setDraft} saving={saving} onSave={save} />}
          {key === 'playtime' && <Playtime draft={draft} setDraft={setDraft} saving={saving} onSave={save} />}
          {key === 'bingo' && <Bingo draft={draft} setDraft={setDraft} saving={saving} onSave={save} />}
          {key === 'marble' && <Marble draft={draft} setDraft={setDraft} saving={saving} onSave={save} />}
          {key === 'hottime' && <Hottime draft={draft} setDraft={setDraft} saving={saving} onSave={save} />}
          {key === 'recommend' && <Recommend draft={draft} setDraft={setDraft} saving={saving} onSave={save} />}
          {key === 'expgp' && <Expgp draft={draft} setDraft={setDraft} saving={saving} onSave={save} data={data} />}
        </section>
      )}
    </div>
  );
}

function buildDraft(key: string, data: any) {
  if (key === 'attendance') {
    const start = day(data.campaign?.startAt || data.slots?.[0]?.startAt);
    const slots = (data.slots || []).map((slot: any) => ({ products: slot.products || [] }));
    return {
      start,
      span: Math.max(slots.length, 1),
      optionDays: data.campaign?.optionDays || 1,
      rewardDuration: data.campaign?.rewardDuration || 7,
      infoMsg: data.infoMsg || '',
      longProducts: data.campaign?.products || [],
      slots,
    };
  }
  if (key === 'playtime') {
    return {
      start: day(data.from),
      span: Math.max(data.days?.length || 1, 1),
      ladder: data.ladder || [],
    };
  }
  if (key === 'bingo' || key === 'hottime' || key === 'recommend') return { ...(data.event || {}) };
  if (key === 'marble') return { ...(data.event || {}) };
  if (key === 'expgp') {
    const row = (data.rows || []).find((item: any) => item.running) || data.rows?.[0] || {};
    return { ...row, eventId: row.eventId || 0 };
  }
  return {};
}

function SaveBar({ saving, onClick, label }: { saving: boolean; onClick: () => void; label: string }) {
  return (
    <div className="ev-save">
      <button type="button" className="primary" disabled={saving} onClick={onClick}>
        {saving ? <Loader className="spin" /> : null}
        {label}
      </button>
      <small>El lobby tiene que reiniciarse para leer el cambio.</small>
    </div>
  );
}

function Attendance({ draft, setDraft, saving, onSave }: any) {
  const retune = (start: string, span: number) => {
    const count = Math.max(1, Math.min(28, span || 1));
    const slots = Array.from({ length: count }, (_, index) => draft.slots[index] || { products: [] });
    setDraft({ ...draft, start, span: count, slots });
  };
  const dates = Array.from({ length: draft.span }, (_, index) => addDays(draft.start, index));
  return (
    <>
      <h2>Inicio diario</h2>
      <p className="sub">Pones el día en que empieza y cuántos días dura. El día 1 conserva su premio, el día 2 el suyo, y así.</p>
      <div className="ev-grid">
        <Field label="Empieza">
          <input type="date" value={draft.start} onChange={(event) => retune(event.target.value, draft.span)} />
        </Field>
        <Field label="Días">
          <input type="number" min={1} max={28} value={draft.span} onChange={(event) => retune(draft.start, Number(event.target.value))} />
        </Field>
        <Field label="Días para el premio largo">
          <input type="number" min={1} max={60} value={draft.optionDays} onChange={(event) => setDraft({ ...draft, optionDays: Number(event.target.value) })} />
        </Field>
        <Field label="Duración del ítem (días)">
          <input type="number" min={1} max={3650} value={draft.rewardDuration} onChange={(event) => setDraft({ ...draft, rewardDuration: Number(event.target.value) })} />
        </Field>
      </div>
      <Field label="Mensaje">
        <input value={draft.infoMsg} maxLength={100} onChange={(event) => setDraft({ ...draft, infoMsg: event.target.value })} />
      </Field>
      <h3>Premio largo</h3>
      <Items items={draft.longProducts} onChange={(longProducts) => setDraft({ ...draft, longProducts })} />
      <h3>Premio de cada día</h3>
      <div className="ev-days">
        {dates.map((date, index) => (
          <article key={date}>
            <header>Día {index + 1}<b>{date}</b></header>
            <Items
              items={draft.slots[index]?.products || []}
              onChange={(products) => {
                const slots = draft.slots.slice();
                slots[index] = { products };
                setDraft({ ...draft, slots });
              }}
            />
          </article>
        ))}
      </div>
      <SaveBar
        saving={saving}
        label="Guardar inicio diario"
        onClick={() => onSave({
          start: draft.start,
          span: draft.span,
          optionDays: draft.optionDays,
          rewardDuration: draft.rewardDuration,
          infoMsg: draft.infoMsg,
          longProducts: draft.longProducts.map((item: Product) => item.id),
          slots: draft.slots.slice(0, draft.span).map((slot: any) => ({ products: (slot.products || []).map((item: Product) => item.id) })),
        })}
      />
    </>
  );
}

function Playtime({ draft, setDraft, saving, onSave }: any) {
  const dates = Array.from({ length: Number(draft.span) || 1 }, (_, index) => addDays(draft.start, index));
  const setStep = (index: number, patch: any) => {
    const ladder = draft.ladder.slice();
    ladder[index] = { ...ladder[index], ...patch };
    setDraft({ ...draft, ladder });
  };
  return (
    <>
      <h2>Tiempo jugado</h2>
      <p className="sub">Esta escala se corre completa al cambiar la fecha de inicio. Si bajas los días, solo se apagan los que sobran de esta escala. Las otras escalas quedan igual.</p>
      <div className="ev-grid">
        <Field label="Empieza">
          <input type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} />
        </Field>
        <Field label="Días de esta escala">
          <input type="number" min={1} max={400} value={draft.span} onChange={(event) => setDraft({ ...draft, span: Number(event.target.value) })} />
        </Field>
      </div>
      <p className="ev-range">{dates[0]} → {dates[dates.length - 1]}</p>
      <div className="ev-ladder">
        {draft.ladder.map((step: any, index: number) => (
          <div key={index} className="ev-step">
            <Field label="Nivel"><input type="number" value={step.level} onChange={(event) => setStep(index, { level: Number(event.target.value) })} /></Field>
            <Field label="Minutos"><input type="number" value={step.minute} onChange={(event) => setStep(index, { minute: Number(event.target.value) })} /></Field>
            <Field label="Ítem">
              <Items
                single
                items={step.productId ? [{ id: step.productId, name: step.productName || `Producto ${step.productId}` }] : []}
                onChange={(items) => setStep(index, { productId: items[0]?.id || 0, productName: items[0]?.name || '' })}
              />
            </Field>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="ev-add"
        onClick={() => setDraft({
          ...draft,
          ladder: [...draft.ladder, { level: draft.ladder.length + 1, minute: 60, productId: 0, productName: '', duration: 1 }],
        })}
      >
        Agregar escalón
      </button>
      <SaveBar
        saving={saving}
        label="Guardar tiempo jugado"
        onClick={() => onSave({
          start: draft.start,
          span: Number(draft.span),
          ladder: draft.ladder.map((step: any) => ({
            level: Number(step.level),
            minute: Number(step.minute),
            productId: Number(step.productId),
            duration: Number(step.duration || 1),
          })),
        })}
      />
    </>
  );
}

function Bingo({ draft, setDraft, saving, onSave }: any) {
  const setReward = (index: number, patch: any) => {
    const rewards = draft.rewards.slice();
    rewards[index] = { ...rewards[index], ...patch };
    setDraft({ ...draft, rewards });
  };
  return (
    <>
      <h2>Bingo</h2>
      <p className="sub">Si lo enciendes, los otros bingos que choquen con estas fechas se apagan. Solo puede correr uno.</p>
      <div className="ev-grid">
        <Field label="Empieza"><input type="datetime-local" value={clock(draft.startAt)} onChange={(event) => setDraft({ ...draft, startAt: event.target.value })} /></Field>
        <Field label="Termina"><input type="datetime-local" value={clock(draft.endAt)} onChange={(event) => setDraft({ ...draft, endAt: event.target.value })} /></Field>
      </div>
      <label className="ev-check"><input type="checkbox" checked={!!draft.enable} onChange={(event) => setDraft({ ...draft, enable: event.target.checked })} /> Encendido</label>
      <label className="ev-check"><input type="checkbox" checked={!!draft.uiEnable} onChange={(event) => setDraft({ ...draft, uiEnable: event.target.checked })} /> Mostrar en el juego</label>
      <div className="ev-ladder">
        {(draft.rewards || []).map((reward: any, index: number) => (
          <div key={index} className="ev-step">
            <Field label="Tipo"><input type="number" value={reward.completionType} onChange={(event) => setReward(index, { completionType: Number(event.target.value) })} /></Field>
            <Field label="Orden"><input type="number" value={reward.completionOrderId} onChange={(event) => setReward(index, { completionOrderId: Number(event.target.value) })} /></Field>
            <Field label="Cantidad"><input type="number" value={reward.needed} onChange={(event) => setReward(index, { needed: Number(event.target.value) })} /></Field>
            <Field label="Ítem">
              <Items
                single
                items={reward.productId ? [{ id: reward.productId, name: reward.productName }] : []}
                onChange={(items) => setReward(index, { productId: items[0]?.id || 0, productName: items[0]?.name || '' })}
              />
            </Field>
          </div>
        ))}
      </div>
      <SaveBar
        saving={saving}
        label="Guardar bingo"
        onClick={() => onSave({
          eventId: draft.eventId,
          start: draft.startAt,
          end: draft.endAt,
          enable: draft.enable,
          uiEnable: draft.uiEnable,
          rewards: draft.rewards,
        })}
      />
    </>
  );
}

function Marble({ draft, setDraft, saving, onSave }: any) {
  const setTile = (index: number, patch: any) => {
    const tiles = draft.tiles.slice();
    tiles[index] = { ...tiles[index], ...patch };
    setDraft({ ...draft, tiles });
  };
  const setMile = (index: number, patch: any) => {
    const mileage = draft.mileage.slice();
    mileage[index] = { ...mileage[index], ...patch };
    setDraft({ ...draft, mileage });
  };
  return (
    <>
      <h2>Combat Marble</h2>
      <p className="sub">El tablero de dados. Si estas fechas chocan con otro tablero, el otro se cierra.</p>
      <div className="ev-grid">
        <Field label="Empieza"><input type="date" value={day(draft.startAt)} onChange={(event) => setDraft({ ...draft, startAt: event.target.value })} /></Field>
        <Field label="Termina"><input type="date" value={day(draft.endAt)} onChange={(event) => setDraft({ ...draft, endAt: event.target.value })} /></Field>
      </div>
      <h3>Casillas</h3>
      <div className="ev-days">
        {(draft.tiles || []).map((tile: any, index: number) => (
          <article key={tile.tileId}>
            <header>Casilla {index + 1}<b>{tile.tileType === 0 ? 'Especial' : 'Ítem'}</b></header>
            <Items
              single
              items={tile.productId > 0 ? [{ id: tile.productId, name: tile.productName }] : []}
              onChange={(items) => setTile(index, { productId: items[0]?.id || -1, productName: items[0]?.name || 'Vacío' })}
            />
            <div className="ev-grid">
              <Field label="Cantidad"><input type="number" value={tile.productCnt} onChange={(event) => setTile(index, { productCnt: Number(event.target.value) })} /></Field>
              <Field label="Periodo"><input type="number" value={tile.productPeriod} onChange={(event) => setTile(index, { productPeriod: Number(event.target.value) })} /></Field>
            </div>
          </article>
        ))}
      </div>
      <h3>Premios por millaje</h3>
      {(draft.mileage || []).map((row: any, index: number) => (
        <div key={index} className="ev-step">
          <Field label="Millaje"><input type="number" value={row.needMileage} onChange={(event) => setMile(index, { needMileage: Number(event.target.value) })} /></Field>
          <Field label="Periodo"><input type="number" value={row.productPeriod} onChange={(event) => setMile(index, { productPeriod: Number(event.target.value) })} /></Field>
          <Field label="Ítem">
            <Items
              single
              items={row.productId ? [{ id: row.productId, name: row.productName }] : []}
              onChange={(items) => setMile(index, { productId: items[0]?.id || 0, productName: items[0]?.name || '' })}
            />
          </Field>
        </div>
      ))}
      <SaveBar
        saving={saving}
        label="Guardar Combat Marble"
        onClick={() => onSave({
          eventId: draft.eventId,
          start: day(draft.startAt),
          end: day(draft.endAt),
          tiles: draft.tiles,
          mileage: draft.mileage,
        })}
      />
    </>
  );
}

function Hottime({ draft, setDraft, saving, onSave }: any) {
  return (
    <>
      <h2>Hot Time</h2>
      <div className="ev-grid">
        <Field label="Empieza"><input type="datetime-local" value={clock(draft.startAt)} onChange={(event) => setDraft({ ...draft, startAt: event.target.value })} /></Field>
        <Field label="Termina"><input type="datetime-local" value={clock(draft.endAt)} onChange={(event) => setDraft({ ...draft, endAt: event.target.value })} /></Field>
        <Field label="Horas"><input type="number" min={1} value={draft.durationHour} onChange={(event) => setDraft({ ...draft, durationHour: Number(event.target.value) })} /></Field>
      </div>
      <label className="ev-check"><input type="checkbox" checked={!!draft.enable} onChange={(event) => setDraft({ ...draft, enable: event.target.checked })} /> Encendido</label>
      <Items items={draft.products || []} onChange={(products) => setDraft({ ...draft, products })} />
      <SaveBar
        saving={saving}
        label="Guardar Hot Time"
        onClick={() => onSave({
          seqNo: draft.seqNo,
          start: draft.startAt,
          end: draft.endAt,
          enable: draft.enable,
          durationHour: Number(draft.durationHour),
          pcCafeOnly: draft.pcCafeOnly,
          description: draft.description || '',
          products: (draft.products || []).map((item: Product) => item.id),
        })}
      />
    </>
  );
}

function Recommend({ draft, setDraft, saving, onSave }: any) {
  const setReward = (index: number, patch: any) => {
    const rewards = draft.rewards.slice();
    rewards[index] = { ...rewards[index], ...patch };
    setDraft({ ...draft, rewards });
  };
  return (
    <>
      <h2>Recomendar</h2>
      <div className="ev-grid">
        <Field label="Empieza"><input type="date" value={day(draft.startAt)} onChange={(event) => setDraft({ ...draft, startAt: event.target.value })} /></Field>
        <Field label="Termina"><input type="date" value={day(draft.endAt)} onChange={(event) => setDraft({ ...draft, endAt: event.target.value })} /></Field>
        <Field label="Máximo de personas"><input type="number" min={1} value={draft.maxCount} onChange={(event) => setDraft({ ...draft, maxCount: Number(event.target.value) })} /></Field>
        <Field label="Días de regreso"><input type="number" value={draft.returnDay} onChange={(event) => setDraft({ ...draft, returnDay: Number(event.target.value) })} /></Field>
      </div>
      {(draft.rewards || []).map((reward: any, index: number) => (
        <div key={reward.rewardType} className="ev-step">
          <Field label={reward.rewardType === 1 ? 'Quien invita' : 'Quien llega'}>
            <Items
              single
              items={reward.productId ? [{ id: reward.productId, name: reward.productName }] : []}
              onChange={(items) => setReward(index, { productId: items[0]?.id || 0, productName: items[0]?.name || '' })}
            />
          </Field>
        </div>
      ))}
      <SaveBar
        saving={saving}
        label="Guardar recomendar"
        onClick={() => onSave({
          eventId: draft.eventId,
          start: day(draft.startAt),
          end: day(draft.endAt),
          maxCount: Number(draft.maxCount),
          returnDay: Number(draft.returnDay),
          rewards: draft.rewards,
        })}
      />
    </>
  );
}

function Expgp({ draft, setDraft, saving, onSave, data }: any) {
  const pick = (row: any) => setDraft({ ...row });
  return (
    <>
      <h2>EXP y GP</h2>
      <p className="sub">1 es lo normal. 2 es el doble. Varios activos se suman.</p>
      <div className="ev-boosts">
        <button type="button" className={!draft.eventId ? 'on' : ''} onClick={() => pick({ eventId: 0, lobbyServerId: 0, modeId: 0, mapId: 0, expRate: 2, gpRate: 2, startAt: '', endAt: '', enable: true, description: '' })}>Nuevo</button>
        {(data?.rows || []).map((row: any) => (
          <button key={row.eventId} type="button" className={draft.eventId === row.eventId ? 'on' : ''} onClick={() => pick(row)}>
            #{row.eventId} x{row.expRate} {row.running ? '· activo' : ''}
          </button>
        ))}
      </div>
      <div className="ev-grid">
        <Field label="Empieza"><input type="datetime-local" value={clock(draft.startAt)} onChange={(event) => setDraft({ ...draft, startAt: event.target.value })} /></Field>
        <Field label="Termina"><input type="datetime-local" value={clock(draft.endAt)} onChange={(event) => setDraft({ ...draft, endAt: event.target.value })} /></Field>
        <Field label="EXP"><input type="number" min={1} max={10} step="0.1" value={draft.expRate} onChange={(event) => setDraft({ ...draft, expRate: Number(event.target.value) })} /></Field>
        <Field label="GP"><input type="number" min={1} max={10} step="0.1" value={draft.gpRate} onChange={(event) => setDraft({ ...draft, gpRate: Number(event.target.value) })} /></Field>
        <Field label="Lobby"><input type="number" value={draft.lobbyServerId || 0} onChange={(event) => setDraft({ ...draft, lobbyServerId: Number(event.target.value) })} /></Field>
        <Field label="Modo"><input type="number" value={draft.modeId || 0} onChange={(event) => setDraft({ ...draft, modeId: Number(event.target.value) })} /></Field>
        <Field label="Mapa"><input type="number" value={draft.mapId || 0} onChange={(event) => setDraft({ ...draft, mapId: Number(event.target.value) })} /></Field>
      </div>
      <Field label="Nota"><input value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Field>
      <label className="ev-check"><input type="checkbox" checked={!!draft.enable} onChange={(event) => setDraft({ ...draft, enable: event.target.checked })} /> Encendido</label>
      <SaveBar
        saving={saving}
        label="Guardar EXP y GP"
        onClick={() => onSave({
          eventId: draft.eventId || 0,
          start: draft.startAt,
          end: draft.endAt,
          expRate: Number(draft.expRate),
          gpRate: Number(draft.gpRate),
          lobbyServerId: Number(draft.lobbyServerId) || 0,
          modeId: Number(draft.modeId) || 0,
          mapId: Number(draft.mapId) || 0,
          enable: draft.enable,
          description: draft.description || '',
        })}
      />
    </>
  );
}
