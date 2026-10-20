import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CheckCircle, KeyRound } from 'lucide-react';

type RedeemInfo = {
  reward: number;
  redeemed: boolean;
  redeemedCode: string | null;
};

export default function RedeemCodePage() {
  const { profile, refreshProfile } = useAuth();
  const [info, setInfo] = useState<RedeemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const load = async () => {
    const data = await api.getReferral();
    setInfo({
      reward: data.reward,
      redeemed: data.redeemed,
      redeemedCode: data.redeemedCode,
    });
  };

  useEffect(() => {
    if (!profile?.username) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await api.getReferral();
        if (alive) {
          setInfo({
            reward: data.reward,
            redeemed: data.redeemed,
            redeemedCode: data.redeemedCode,
          });
        }
      } catch (error: any) {
        if (alive) setNotice({ type: 'error', text: error?.message || 'No se pudo cargar el estado del canje' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [profile?.username]);

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
      await refreshProfile();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo canjear el código' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="inner-page page-width invite-page">
        <div className="invite-card invite-card-center">
          <KeyRound className="h-10 w-10 text-[#df8104]" />
          <h1>Cargando canje</h1>
        </div>
      </main>
    );
  }

  const reward = Number(info?.reward || 20000);

  return (
    <main className="inner-page page-width invite-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> CANJE</p>
          <h1>CANJEAR CÓDIGO.</h1>
          <p className="page-heading-description">
            Ingresa el código de invitación de otra persona. Tú y quien te invitó reciben {reward.toLocaleString('es-CO')} NX.
            Cada cuenta solo puede canjear una vez.
          </p>
        </div>
      </header>

      <section className="redeem-grid">
        <article className="invite-card">
          <p className="invite-kicker">Canjear código</p>
          {info?.redeemed ? (
            <div className="invite-done">
              <CheckCircle size={22} />
              <div>
                <strong>Ya canjeaste un código</strong>
                <p>Usaste {info.redeemedCode}. Esta cuenta no puede canjear otro.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={redeem}>
              <label htmlFor="redeem-code">Código de invitación</label>
              <input
                id="redeem-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="EV······"
                maxLength={12}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="invite-cta" disabled={busy || code.trim().length < 6}>
                {busy ? 'Canjeando…' : `Canjear y recibir ${reward.toLocaleString('es-CO')} NX`}
              </button>
            </form>
          )}
          {notice && <p className={`invite-notice invite-notice-${notice.type}`}>{notice.text}</p>}
        </article>
      </section>
    </main>
  );
}
