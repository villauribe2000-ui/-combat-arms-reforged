import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Check, Loader, ShieldAlert, Ticket, X } from 'lucide-react';

type InviteRequest = {
  id: number;
  code: string;
  status: string;
  nxEach: number;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  sameIp: boolean;
  referrer: { oidUser: number; username: string; ip: string };
  referred: { oidUser: number; username: string; ip: string; registrationIp: string };
};

function when(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('es-CO');
}

export default function InviteRequestsDesk() {
  const [rows, setRows] = useState<InviteRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const load = async (status = filter) => {
    const data = await api.getReferralRequestsAdmin(status);
    setRows(data.requests || []);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setNotice(null);
        await load(filter);
      } catch (error: any) {
        if (alive) setNotice({ type: 'error', text: error?.message || 'No se pudieron cargar las solicitudes' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [filter]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    try {
      setBusyId(id);
      setNotice(null);
      const result = action === 'approve'
        ? await api.approveReferralRequest(id)
        : await api.rejectReferralRequest(id);
      setNotice({ type: 'ok', text: result.message });
      await load();
    } catch (error: any) {
      setNotice({ type: 'error', text: error?.message || 'No se pudo actualizar la solicitud' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ev-desk">
      <div className="pl-hero">
        <div className="pl-hero-ico"><Ticket /></div>
        <div>
          <p className="eyebrow">OPERATIONS / INVITES</p>
          <h1>SOLICITUDES DE INVITACIÓN</h1>
          <p>Quién canjeó, de quién es el código y las IP. Solo al aprobar se entrega el NX; si rechazas, no se paga nada.</p>
        </div>
      </div>

      <div className="staff-toolbar" style={{ marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={filter === key ? 'staff-btn staff-btn-gold' : 'staff-btn'}
            onClick={() => setFilter(key)}
          >
            {key === 'pending' ? 'Pendientes' : key === 'approved' ? 'Aprobadas' : key === 'rejected' ? 'Rechazadas' : 'Todas'}
          </button>
        ))}
      </div>

      {notice && (
        <p className={`invite-notice invite-notice-${notice.type}`} style={{ marginBottom: 12 }}>
          {notice.text}
        </p>
      )}

      {loading ? (
        <div className="pd-empty"><Loader className="animate-spin" /> Cargando…</div>
      ) : !rows.length ? (
        <div className="pd-empty">No hay solicitudes en este filtro.</div>
      ) : (
        <section className="ol-panel">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Quién canjeó</th>
                <th>Código / dueño</th>
                <th>IP canje</th>
                <th>IP dueño</th>
                <th>NX</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <b>{row.referred.username}</b>
                    <div style={{ color: '#888', fontSize: 12 }}>oid {row.referred.oidUser}</div>
                    {row.referred.registrationIp ? (
                      <div style={{ color: '#888', fontSize: 11 }}>reg {row.referred.registrationIp}</div>
                    ) : null}
                  </td>
                  <td>
                    <code>{row.code}</code>
                    <div><b>{row.referrer.username}</b></div>
                    <div style={{ color: '#888', fontSize: 12 }}>oid {row.referrer.oidUser}</div>
                  </td>
                  <td>
                    <code>{row.referred.ip || '—'}</code>
                    {row.sameIp ? (
                      <div style={{ color: '#f87171', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
                        <ShieldAlert size={12} /> Misma IP
                      </div>
                    ) : null}
                  </td>
                  <td><code>{row.referrer.ip || '—'}</code></td>
                  <td>{Number(row.nxEach || 0).toLocaleString('es-CO')}</td>
                  <td>
                    <span style={{
                      color: row.status === 'pending' ? '#fbbf24' : row.status === 'approved' ? '#34d399' : '#f87171',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: 11,
                    }}
                    >
                      {row.status}
                    </span>
                    {row.reviewedBy ? (
                      <div style={{ color: '#777', fontSize: 11 }}>{row.reviewedBy}</div>
                    ) : null}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                    {when(row.createdAt)}
                    {row.reviewedAt ? <div style={{ color: '#777' }}>rev {when(row.reviewedAt)}</div> : null}
                  </td>
                  <td>
                    {row.status === 'pending' ? (
                      <div className="admin-actions" style={{ gap: 6 }}>
                        <button
                          type="button"
                          className="admin-ok"
                          disabled={busyId === row.id}
                          onClick={() => act(row.id, 'approve')}
                        >
                          <Check size={14} /> Aprobar
                        </button>
                        <button
                          type="button"
                          className="admin-no"
                          disabled={busyId === row.id}
                          onClick={() => act(row.id, 'reject')}
                        >
                          <X size={14} /> Rechazar
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#666' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
