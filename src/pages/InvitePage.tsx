import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CheckCircle, Copy, Ticket, Users } from 'lucide-react';

type InviteInfo = {
  code: string;
  reward: number;
  redeemed: boolean;
  redeemedCode: string | null;
  pending: boolean;
  pendingCode: string | null;
  uses: number;
  earned: number;
  recent: { username: string; at: string }[];
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function InvitePage() {
  const { profile, refreshProfile } = useAuth();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const load = async () => {
    const data = await api.getReferral();
    setInfo(data);
  };

  useEffect(() => {
    if (!profile?.username) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api.getReferral();
        if (alive) setInfo(data);
      } catch (error: any) {
        if (alive) setNotice({ type: 'error', text: error?.message || 'No se pudo cargar tu código' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [profile?.username]);

  const copyCode = async () => {
    if (!info?.code) return;
    try {
      await navigator.clipboard.writeText(info.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setNotice({ type: 'error', text: 'No se pudo copiar. Selecciona el código y cópialo a mano.' });
    }
  };

  const redeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim() || busy) return;
    try {
      setBusy(true);
      setNotice(null);
      const result = await api.redeemReferral(code);
      setNotice({ type: 'ok', text: result.message });
      setCode('');
      await load();
      if (!result.pending) await refreshProfile();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo enviar la solicitud' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="inner-page page-width invite-page">
        <div className="invite-card invite-card-center">
          <Ticket className="h-10 w-10 text-[#df8104]" />
          <h1>Cargando tu código</h1>
        </div>
      </main>
    );
  }

  const reward = Number(info?.reward || 20000);

  return (
    <main className="inner-page page-width invite-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> INVITACIONES</p>
          <h1>INVITA Y GANA.</h1>
          <p className="page-heading-description">
            Comparte tu código. Quien lo envía genera una solicitud: cuando el admin la apruebe,
            ambos reciben {reward.toLocaleString('es-CO')} NX. Cada cuenta solo puede canjear una vez.
          </p>
        </div>
      </header>

      <section className="invite-grid">
        <article className="invite-card">
          <p className="invite-kicker">Tu código</p>
          <div className="invite-code-row">
            <strong>{info?.code || '—'}</strong>
            <button type="button" onClick={copyCode} disabled={!info?.code}>
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="invite-note">Sirve para varias personas. Cada canje aprobado te da {reward.toLocaleString('es-CO')} NX.</p>
          <div className="invite-stats">
            <div>
              <span>Personas</span>
              <b>{info?.uses || 0}</b>
            </div>
            <div>
              <span>NX ganado</span>
              <b>{Number(info?.earned || 0).toLocaleString('es-CO')}</b>
            </div>
          </div>
        </article>

        <article className="invite-card">
          <p className="invite-kicker">Canjear un código</p>
          {info?.redeemed ? (
            <div className="invite-done">
              <CheckCircle size={22} />
              <div>
                <strong>Ya canjeaste un código</strong>
                <p>Usaste {info.redeemedCode}. Esta cuenta no puede canjear otro. Comparte el tuyo.</p>
              </div>
            </div>
          ) : info?.pending ? (
            <div className="invite-done">
              <Ticket size={22} />
              <div>
                <strong>Solicitud en revisión</strong>
                <p>
                  Enviaste el código {info.pendingCode}. El admin debe aprobarla para que ambos reciban el NX.
                  Mientras tanto no puedes enviar otra.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={redeem}>
              <label htmlFor="invite-code">Código de otra persona</label>
              <input
                id="invite-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="EV······"
                maxLength={12}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="invite-cta" disabled={busy || code.trim().length < 6}>
                {busy ? 'Enviando…' : 'Enviar solicitud de canje'}
              </button>
            </form>
          )}
          {notice && <p className={`invite-notice invite-notice-${notice.type}`}>{notice.text}</p>}
        </article>
      </section>

      <section className="invite-how">
        <h2><Users size={18} /> Cómo funciona</h2>
        <ol>
          <li>Una cuenta que ya existe recibe su código al entrar aquí.</li>
          <li>Una cuenta que todavía no ha canjeado escribe ese código y queda una solicitud para el admin.</li>
          <li>Si el admin aprueba, ambos reciben {reward.toLocaleString('es-CO')} NX. Si rechaza, no se entrega nada.</li>
        </ol>
        {info?.recent?.length ? (
          <ul className="invite-recent">
            {info.recent.map((row) => (
              <li key={`${row.username}-${row.at}`}>
                <span>{row.username}</span>
                <time>{formatWhen(row.at)}</time>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
