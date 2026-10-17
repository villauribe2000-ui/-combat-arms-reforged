import { useState } from 'react';
import { api } from '@/lib/api';

export default function NoticeComposer({ onChanged }: { onChanged: () => void }) {
  const [message, setMessage] = useState('');
  const [days, setDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const publish = async () => {
    setSaving(true);
    setError('');
    setOk('');
    try {
      const result = await api.createNotice(message.trim(), Number(days));
      setOk(result.message || 'Publicada');
      setMessage('');
      onChanged();
    } catch (err: any) {
      setError(err.message || 'No se pudo publicar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ol-panel">
      <div className="pd-card-top">
        <h2>NUEVA NOTICIA</h2>
      </div>
      <p className="pd-note">Este texto es el que sale en rojo como NOTICE dentro de la partida y en el lobby. Al cumplirse los días, el juego la apaga.</p>
      <label className="ev-field">
        <span>TEXTO</span>
        <textarea maxLength={280} value={message} placeholder="400% EXP is live on ALL modes and maps!" onChange={(event) => setMessage(event.target.value)} />
      </label>
      <label className="ev-field">
        <span>DÍAS</span>
        <input type="number" min={1} max={90} value={days} onChange={(event) => setDays(Number(event.target.value))} />
      </label>
      {error && <p className="ev-err">{error}</p>}
      {ok && <p className="ev-ok">{ok}</p>}
      <div className="ev-save">
        <button type="button" className="primary" disabled={saving} onClick={publish}>Publicar</button>
        <small>{message.trim().length}/280</small>
      </div>
    </section>
  );
}
