import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { KeyRound } from 'lucide-react';

const SEGMENTS = 6;
const SEG_LEN = 5;

function normalizeCode(value: string) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, SEGMENTS * SEG_LEN);
}

function splitCode(value: string) {
  const clean = normalizeCode(value);
  return Array.from({ length: SEGMENTS }, (_, i) => clean.slice(i * SEG_LEN, (i + 1) * SEG_LEN));
}

export default function RedeemCodePage() {
  const { profile } = useAuth();
  const [parts, setParts] = useState<string[]>(() => Array(SEGMENTS).fill(''));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, [profile?.username]);

  const fullCode = parts.join('');

  const setPart = (index: number, raw: string) => {
    const clean = normalizeCode(raw);
    if (clean.length > SEG_LEN) {
      const all = normalizeCode(parts.join('') + clean);
      setParts(splitCode(all));
      const focusAt = Math.min(Math.floor(all.length / SEG_LEN), SEGMENTS - 1);
      window.setTimeout(() => refs.current[focusAt]?.focus(), 0);
      return;
    }
    const next = [...parts];
    next[index] = clean.slice(0, SEG_LEN);
    setParts(next);
    if (clean.length >= SEG_LEN && index < SEGMENTS - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !parts[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < SEGMENTS - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const onPaste = (event: React.ClipboardEvent) => {
    const text = event.clipboardData.getData('text');
    if (!text) return;
    event.preventDefault();
    const next = splitCode(text);
    setParts(next);
    const filled = normalizeCode(text).length;
    const focusAt = Math.min(Math.floor(filled / SEG_LEN), SEGMENTS - 1);
    window.setTimeout(() => refs.current[focusAt]?.focus(), 0);
  };

  const redeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || fullCode.length < SEGMENTS * SEG_LEN) return;
    try {
      setBusy(true);
      setNotice(null);
      const result = await api.redeemPromo(fullCode);
      setNotice({ type: 'ok', text: result.message });
      setParts(Array(SEGMENTS).fill(''));
      refs.current[0]?.focus();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo canjear el código' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="inner-page page-width invite-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> PROMO</p>
          <h1>CANJEAR CÓDIGO.</h1>
          <p className="page-heading-description">
            Es el mismo código que en el juego (ENTER CODE). Sin guiones al escribir;
            los bloques son solo para separar. Los ítems llegan a tu bandeja de entrada.
          </p>
        </div>
      </header>

      <section className="redeem-grid">
        <article className="invite-card redeem-modal">
          <div className="redeem-modal-head">
            <KeyRound size={18} />
            <strong>ENTER CODE</strong>
          </div>
          <p className="redeem-modal-label">Enter promotional code:</p>
          <form onSubmit={redeem} onPaste={onPaste}>
            <div className="redeem-segments" role="group" aria-label="Código promocional">
              {parts.map((part, index) => (
                <input
                  key={index}
                  ref={(el) => { refs.current[index] = el; }}
                  value={part}
                  onChange={(event) => setPart(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(index, event)}
                  maxLength={SEG_LEN}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  aria-label={`Bloque ${index + 1}`}
                />
              ))}
            </div>
            <div className="redeem-modal-actions">
              <button type="submit" className="invite-cta" disabled={busy || fullCode.length < SEGMENTS * SEG_LEN}>
                {busy ? 'Canjeando…' : 'OK'}
              </button>
              <button
                type="button"
                className="redeem-cancel"
                disabled={busy}
                onClick={() => { setParts(Array(SEGMENTS).fill('')); setNotice(null); refs.current[0]?.focus(); }}
              >
                CANCEL
              </button>
            </div>
          </form>
          {notice && <p className={`invite-notice invite-notice-${notice.type}`}>{notice.text}</p>}
        </article>
      </section>
    </main>
  );
}
