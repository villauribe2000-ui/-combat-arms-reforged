import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, Shield, Users, Swords, ExternalLink } from 'lucide-react';

function stampSec(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function AdminClanProfile({
  id,
  onBack,
  onPlayer,
}: {
  id: number;
  onBack: () => void;
  onPlayer: (playerId: number) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api.getAdminClan(id)
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData(null); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id]);

  if (loading) return <div className="admin-empty">Loading clan profile...</div>;
  if (!data?.clan) return <div className="admin-empty">Clan not found. <button className="pl-apply" onClick={onBack}>Back</button></div>;

  const c = data.clan;
  const roster = data.roster || [];

  return (
    <div className="pd">
      <button className="pd-back" onClick={onBack}><ArrowLeft /> Clans</button>
      <div className="pd-hero">
        <div className="pl-hero-ico"><Shield /></div>
        <div className="pd-hero-copy">
          <p className="eyebrow">CLAN PROFILE / #{c.oidGuild}</p>
          <h1>{c.strName}</h1>
          <p className="pd-mail">Created {stampSec(c.dateCreated)} · Leader {c.dn_strCharacterName_master}</p>
          <button className="clan-public" type="button"><ExternalLink /> Public clan page</button>
        </div>
      </div>
      <div className="ol-kpis clan-kpis">
        <article>
          <p>MEMBERS</p>
          <strong>{c.members ?? roster.length}</strong>
          <Users />
          <small>Current clan roster</small>
        </article>
        <article>
          <p>CLAN EXP</p>
          <strong className="ol-gold">{Number(c.exp || 0).toLocaleString()}</strong>
          <Shield />
          <small>Total clan experience</small>
        </article>
        <article>
          <p>WINS / LOSSES / DRAWS</p>
          <strong>{c.wins || 0} / {c.losses || 0} / {c.draws || 0}</strong>
          <Swords />
        </article>
        <article>
          <p>KILLS / DEATHS</p>
          <strong>{c.kills || 0} / {c.deaths || 0}</strong>
          <Swords />
        </article>
      </div>
      <section className="ol-panel">
        <div className="pd-card-top">
          <h2><Users /> CLAN ROSTER</h2>
          <span className="pd-chip">{roster.length} MEMBERS</span>
        </div>
        <p className="sub">Open a player to review their account and activity.</p>
        <table className="pl-table">
          <thead>
            <tr>
              <th>PLAYER</th>
              <th>ROLE</th>
              <th>JOINED</th>
              <th>LAST GAME LOGIN</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr><td colSpan={4} className="pd-empty">No members.</td></tr>
            ) : roster.map((m: any) => (
              <tr key={m.id} className="pl-row" onClick={() => onPlayer(m.id)}>
                <td>
                  <span className="login-nick">{m.isGM ? `[GM]${m.NickName}` : m.NickName}</span>
                  <small style={{ display: 'block', color: '#888' }}>Account #{m.id}</small>
                </td>
                <td>
                  <span className={m.role === 'LEADER' ? 'clan-leader' : 'pl-pill pl-pill-player'}>{m.role}</span>
                </td>
                <td className="pd-time">{stampSec(m.dateCreated)}</td>
                <td className="pd-time">{stampSec(m.lastLoginDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {(data.applications || []).length > 0 && (
        <section className="ol-panel">
          <div className="pd-card-top">
            <h2>APPLICATIONS</h2>
            <span className="pd-chip">{data.applications.length} PENDING</span>
          </div>
          <table className="pl-table">
            <thead><tr><th>PLAYER</th><th>APPLIED</th></tr></thead>
            <tbody>
              {data.applications.map((a: any, i: number) => (
                <tr key={a.oidUser || i} className="pl-row" onClick={() => onPlayer(a.oidUser)}>
                  <td className="login-nick">{a.dn_strCharacterName}</td>
                  <td className="pd-time">{stampSec(a.dateCreated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
