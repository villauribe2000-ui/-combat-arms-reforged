import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { rankIcon, rankFromExp } from '@/lib/ranks';
import {
  ArrowLeft, Users, Package, Inbox, ShoppingBag, TrendingUp, UsersRound, Flag, Search, Shield, Swords, Gift,
} from 'lucide-react';

const ISO3: Record<string, string> = {
  ARG:'ar',BRA:'br',COL:'co',EGY:'eg',FRA:'fr',ISR:'il',MEX:'mx',USA:'us',VIE:'vn',VNM:'vn',PER:'pe',CHL:'cl',ECU:'ec',VEN:'ve',URY:'uy',GTM:'gt',HND:'hn',SLV:'sv',NIC:'ni',PAN:'pa',CRI:'cr',DOM:'do',ESP:'es',
};

function flagCode(code?: string) {
  const raw = String(code || '').trim();
  if (raw.length === 2) return raw.toLowerCase();
  return ISO3[raw.toUpperCase()] || '';
}

function stamp(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function isPermanent(v: any) {
  if (!v) return true;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) || d.getFullYear() >= 2499;
}

function usesLeft(row: any) {
  const count = Number(row.remaincount);
  if (!Number.isFinite(count) || count <= 0) return '—';
  return String(count);
}

function itemTitle(row: any) {
  return String(row.Name || row.ProductName || 'Unknown item').trim();
}

function stampShort(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: Search },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'gifts', label: 'Regalos', icon: Gift },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'friends', label: 'Friends & clan', icon: UsersRound },
  { id: 'reports', label: 'Reports & kicks', icon: Flag },
] as const;

type Tab = typeof TABS[number]['id'];

export default function AdminPlayerAccount({ id, onBack }: { id: number; onBack: () => void }) {
  const { profile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [giftAmount, setGiftAmount] = useState('50000');
  const [giftMessage, setGiftMessage] = useState('');
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftQuota, setGiftQuota] = useState<any>(null);
  const [giftLog, setGiftLog] = useState<any[]>([]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setTab('overview');
    api.getAdminPlayer(id)
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData(null); })
      .finally(() => { if (live) setLoading(false); });
    const loadQuota = async () => {
      try {
        const d = await api.getAdminStaffMe();
        if (Number(d?.quota?.monthlyAllotment || 0) > 0 || d?.unlimited) {
          if (live) setGiftQuota(d.quota);
          return;
        }
        const uid = Number(profile?.userId || profile?.id || 0);
        if (uid) {
          const desk = await api.getAdminStaffDesk(uid);
          if (live) setGiftQuota(desk?.quota?.monthlyAllotment ? desk.quota : (d?.quota || desk?.quota || null));
          return;
        }
        if (live) setGiftQuota(d?.quota || null);
      } catch {
        try {
          const uid = Number(profile?.userId || profile?.id || 0);
          if (!uid) throw new Error('no id');
          const desk = await api.getAdminStaffDesk(uid);
          if (live) setGiftQuota(desk?.quota || null);
        } catch {
          if (live) setGiftQuota(null);
        }
      }
    };
    loadQuota();
    api.getAdminStaffGifts()
      .then((d) => { if (live) setGiftLog((d?.gifts || []).filter((g: any) => Number(g.toUserId) === Number(id))); })
      .catch(() => { if (live) setGiftLog([]); });
    return () => { live = false; };
  }, [id, profile?.userId, profile?.id]);

  if (loading) return <div className="admin-empty">Loading player account...</div>;
  if (!data?.user) return <div className="admin-empty">Account not found. <button className="pl-apply" onClick={onBack}>Back</button></div>;

  const u = data.user;
  const code = flagCode(u.countryCode || u.NationCode);
  const nick = u.isGM ? `[GM]${u.NickName || u.username}` : (u.NickName || u.username);
  const panelRole = u.superAdmin ? 'Superadmin' : (u.webRole ? String(u.webRole) : 'Player');
  const rankLevel = u.rank || rankFromExp(u.Exp || 0);
  const rankLabel = `${String(u.rankName || 'TRAINEE').toUpperCase()} (${rankLevel})`;

  return (
    <div className="pd">
      <button className="pd-back" onClick={onBack}><ArrowLeft /> Players</button>

      <div className="pd-hero">
        <img src={rankIcon({ rank: rankLevel, exp: u.Exp })} alt="" onError={(e) => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
        <div className="pd-hero-copy">
          <p className="eyebrow">PLAYER ACCOUNT / #{u.id}</p>
          <h1>{nick}</h1>
          <p className="pd-mail">{u.email || '—'}</p>
          <div className="pl-roles" style={{ marginTop: 8 }}>
            {u.superAdmin && <span className="pl-pill pl-pill-super">SUPERADMIN</span>}
            {u.webRole && !u.superAdmin && <span className="pl-pill pl-pill-admin">{String(u.webRole).toUpperCase()}</span>}
            {(u.isGM || u.webGm) && String(u.webRole || '').toLowerCase() !== 'gm' && <span className="pl-pill pl-pill-gm">GM</span>}
            <span className={u.accountStatus === 'banned' ? 'pl-status-ban' : 'pl-status'}>{u.accountStatus === 'banned' ? 'BANNED' : 'ACTIVE'}</span>
            <span className="pl-pill pl-pill-player">{u.twofa ? '2FA ON' : '2FA OFF'}</span>
          </div>
        </div>
        <div className="pd-stats">
          <article><p>GP</p><strong>{Number(u.Money || 0).toLocaleString()}</strong></article>
          <article><p>EXP</p><strong>{Number(u.Exp || 0).toLocaleString()}</strong></article>
          <article><p>NX</p><strong>{Number(u.nx || 0).toLocaleString()}</strong></article>
        </div>
      </div>

      <div className="pd-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <Icon /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <>
          <div className="pd-split">
            <section className="pd-card">
              <h2><Users /> ACCOUNT DETAILS</h2>
              <p className="sub">Identity, character information, and recent activity.</p>
              <div className="pd-grid">
                <div><p>UID</p><b>#{u.id}</b></div>
                <div><p>USERNAME</p><b>{u.username}</b></div>
                <div>
                  <p>EMAIL VERIFICATION</p>
                  <b className={u.emailVerified ? 'pl-status' : ''}>{u.emailVerified ? 'VERIFIED' : 'UNVERIFIED'}</b>
                </div>
                <div><p>GAME ROLE</p><b>{u.isGM ? 'GM' : 'PLAYER'}</b></div>
                <div><p>PANEL ROLE</p><b>{panelRole}</b></div>
                <div>
                  <p>RANK: R{rankLevel}</p>
                  <select disabled value={rankLevel}>
                    {(data.grades || []).map((g: any) => (
                      <option key={g.GradeLevel} value={g.GradeLevel}>{String(g.GradeName || '').toUpperCase()} ({g.GradeLevel})</option>
                    ))}
                    {!(data.grades || []).length && <option value={rankLevel}>{rankLabel}</option>}
                  </select>
                  <small>Confirmation required. Seals EXP to this rank minimum. Read only.</small>
                </div>
                <div>
                  <p>FLAG</p>
                  <b className="pl-flag">
                    {code ? <img src={`https://flagcdn.com/20x15/${code}.png`} alt="" /> : null}
                    {u.countryName || u.NationCode || '—'}
                  </b>
                </div>
                <div><p>REGISTERED AT</p><b>{stampShort(u.authRegDate || u.CreateDate)}</b></div>
                <div><p>CHARACTER CREATED</p><b>{stamp(u.CreateDate)}</b></div>
                <div><p>LAST GAME LOGIN</p><b>{stamp(u.lastLoginDate)}</b></div>
              </div>
            </section>
            <section className="pd-card">
              <div className="pd-card-top">
                <h2><Shield /> PLAYER MODERATION</h2>
                <span className={u.accountStatus === 'banned' || u.muted ? 'pl-status-ban' : 'pl-status'}>
                  {u.accountStatus === 'banned' ? 'RESTRICTED' : (u.muted ? 'MUTED' : 'NO RESTRICTIONS')}
                </span>
              </div>
              <p className="sub">Active restrictions and available account actions.</p>
              {u.superAdmin ? (
                <p className="pd-note">This account has no active bans or chat restrictions.<br />Superadmins cannot be punished from the panel.</p>
              ) : u.accountStatus === 'banned' ? (
                <p className="pd-note">This account is banned until {stamp(u.StatusEndDate || u.BlockEndDate)}.</p>
              ) : u.muted ? (
                <p className="pd-note">Chat silence until {stamp(u.SilenceEndDate)}.</p>
              ) : (
                <p className="pd-note">This account has no active bans or chat restrictions.</p>
              )}
            </section>
          </div>

          <div className="pd-split">
            <section className="pd-card">
              <div className="pd-card-top">
                <h2><Swords /> RECENT MATCHES</h2>
                <span className="pd-chip">90 days</span>
              </div>
              <p className="sub">Open a match to review the full results</p>
              <table className="pd-table">
                <thead><tr><th>ENDED</th><th>MODE</th><th>MAP</th><th>K / D / A</th><th>RESULT</th></tr></thead>
                <tbody>
                  {(data.matches || []).length === 0 ? (
                    <tr><td colSpan={5} className="pd-empty">No matches in the last 90 days.</td></tr>
                  ) : data.matches.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="pd-time">{stamp(m.EndDate)}</td>
                      <td>{m.ModeName || m.GameMode || '—'}</td>
                      <td>{m.MapName || m.MapNo || '—'}</td>
                      <td>{m.KillCnt || 0} / {m.DeadCnt || 0} / {m.Assist || 0}</td>
                      <td><span className={m.result === 'WIN' ? 'pd-win' : 'pd-left'}>{m.result}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="pd-card">
              <h2>NICKNAME HISTORY</h2>
              <p className="sub">Previous names recorded for this character.</p>
              {(data.nicks || []).length === 0 ? (
                <p className="pd-note">No nickname changes.</p>
              ) : (
                <table className="pd-table">
                  <thead><tr><th>PREVIOUS</th><th>CURRENT</th><th>DATE</th></tr></thead>
                  <tbody>
                    {data.nicks.map((n: any, i: number) => (
                      <tr key={i}><td>{n.PreviousNickName}</td><td>{n.CurrentNickName}</td><td>{stampShort(n.RegDate)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <section className="pd-card">
            <div className="pd-card-top">
              <h2><Shield /> MODERATION HISTORY</h2>
              <span className="pd-chip">{(data.punishments?.length || 0) + (data.bans?.length || 0)} RECORDS</span>
            </div>
            <p className="sub">Restrictions, mutes, and releases from the panel and game.</p>
            <table className="pd-table">
              <thead><tr><th>DATE</th><th>TYPE</th><th>UNTIL</th><th>REASON</th><th>BY</th><th>SOURCE</th><th>LIFTED</th></tr></thead>
              <tbody>
                {!(data.punishments || []).length && !(data.bans || []).length ? (
                  <tr><td colSpan={7} className="pd-empty">No moderation records.</td></tr>
                ) : (
                  <>
                    {(data.punishments || []).map((r: any) => (
                      <tr key={`p${r.id}`}>
                        <td>{stampShort(r.createdAt || r.startsAt)}</td>
                        <td>{r.type}</td>
                        <td>{stampShort(r.endsAt)}</td>
                        <td>{r.reason}</td>
                        <td>{r.issuedByName || '—'}</td>
                        <td>Web</td>
                        <td>{r.liftedAt ? stampShort(r.liftedAt) : '—'}</td>
                      </tr>
                    ))}
                    {(data.bans || []).map((r: any, i: number) => (
                      <tr key={`b${i}`}>
                        <td>{stampShort(r.BanDate)}</td>
                        <td>{String(r.BanType || '').trim() || 'KICK'}</td>
                        <td>{r.BanPeriod ? `${r.BanPeriod}` : '—'}</td>
                        <td>{r.Reason}</td>
                        <td>{r.GMOidUser}</td>
                        <td>Game</td>
                        <td>—</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === 'gifts' && (
        <section className="pd-card">
          <div className="pd-card-top">
            <h2><Gift /> REGALOS NX</h2>
            <span className="pd-chip">{profile?.username === 'villauribe12' ? 'ILIMITADO' : `CUPO ${Number(giftQuota?.remaining || 0).toLocaleString()} NX`}</span>
          </div>
          <p className="sub">Se descuenta de tu cupo de GM, entra al juego y queda en Charge Coins con el mensaje.</p>
          {profile?.username !== 'villauribe12' && Number(giftQuota?.remaining || 0) <= 0 && (
            <p className="staff-alert">No tienes saldo para regalar</p>
          )}
          <form
            className="staff-toolbar"
            onSubmit={async (e) => {
              e.preventDefault();
              const amount = Math.floor(Number(String(giftAmount).replace(/[^\d]/g, '')) || 0);
              if (amount <= 0) return;
              const owner = profile?.username === 'villauribe12';
              if (!owner && amount > Number(giftQuota?.remaining || 0)) {
                alert('No tienes saldo para regalar');
                return;
              }
              setGiftBusy(true);
              try {
                const d = await api.giftAdminNx(id, amount, giftMessage.trim(), { userId: profile?.userId || profile?.id, username: profile?.username });
                setGiftQuota(d.quota);
                const log = await api.getAdminStaffGifts();
                setGiftLog((log?.gifts || []).filter((g: any) => Number(g.toUserId) === Number(id)));
                setGiftMessage('');
                const fresh = await api.getAdminPlayer(id);
                setData(fresh);
              } catch (err: any) {
                alert(err?.message || 'No tienes saldo para regalar');
              } finally {
                setGiftBusy(false);
              }
            }}
          >
            <input value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} placeholder="Cantidad NX, ej. 50000" />
            <input value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Mensaje para Charge Coins" maxLength={300} />
            <button className="staff-btn staff-btn-gold" type="submit" disabled={giftBusy || (profile?.username !== 'villauribe12' && Number(giftQuota?.remaining || 0) <= 0)}>
              Enviar NX
            </button>
            {profile?.username === 'villauribe12' && (
              <button
                className="staff-btn staff-btn-danger staff-btn-danger-sm"
                type="button"
                disabled={giftBusy}
                onClick={async () => {
                  const amount = Math.floor(Number(String(giftAmount).replace(/[^\d]/g, '')) || 0);
                  if (amount <= 0) return;
                  setGiftBusy(true);
                  try {
                    await api.takeAdminNx(id, amount, giftMessage.trim() || 'NX retirado por el dueño', { userId: profile?.userId || profile?.id, username: profile?.username });
                    const log = await api.getAdminStaffGifts();
                    setGiftLog((log?.gifts || []).filter((g: any) => Number(g.toUserId) === Number(id)));
                    const fresh = await api.getAdminPlayer(id);
                    setData(fresh);
                  } catch (err: any) {
                    alert(err?.message || 'No se pudo quitar NX');
                  } finally {
                    setGiftBusy(false);
                  }
                }}
              >
                Quitar NX
              </button>
            )}
          </form>
          <p className="staff-note">
            {profile?.username === 'villauribe12'
              ? 'Como dueño puedes poner NX sin límite y también quitar NX a esta cuenta. Queda en Historial.'
              : `Usado ${Number(giftQuota?.used || 0).toLocaleString()} · asignado ${Number(giftQuota?.monthlyAllotment || 0).toLocaleString()} este mes.`}
          </p>
          <h3 style={{ fontSize: 11, letterSpacing: '1.2px', color: '#888', margin: '18px 0 8px' }}>ENVIOS A ESTA CUENTA</h3>
          <div className="staff-gift-list">
            {giftLog.length === 0 ? <p className="staff-note">Nadie le ha regalado NX todavía.</p> : giftLog.map((g: any) => (
              <div key={g.id} className="staff-gift-row">
                <div>
                  <b style={{ color: Number(g.amount) < 0 ? '#e8a0a0' : undefined }}>{Number(g.amount).toLocaleString()} NX</b>
                  <small>{g.fromNick || g.fromUsername} · {stampShort(g.createdAt)}{g.message ? ` · ${g.message}` : ''}</small>
                </div>
                <strong>{String(g.fromRole || '').toUpperCase()}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'inventory' && (
        <section className="pd-card">
          <div className="pd-card-top">
            <h2><Package /> PLAYER INVENTORY</h2>
          </div>
          <p className="sub">
            {Number(data.inventoryStats?.active || 0)} active items
            {Number(data.inventoryStats?.expired || 0) ? ` · ${data.inventoryStats.expired} expired` : ''}
            {Number(data.inventoryStats?.total || 0) ? ` · ${data.inventoryStats.total} total` : ''}
          </p>
          <table className="pd-table inv-table">
            <thead>
              <tr>
                <th>ITEM</th>
                <th>SINCE</th>
                <th>EXPIRES</th>
                <th>USES LEFT</th>
              </tr>
            </thead>
            <tbody>
              {(data.inventory || []).length === 0 ? (
                <tr><td colSpan={4} className="pd-empty">Empty inventory.</td></tr>
              ) : data.inventory.map((i: any) => (
                <tr key={i.InventorySeqNo}>
                  <td>
                    <div className="inv-item">
                      <span className={`inv-thumb g${i.ItemGrade || 0}`}>{String(itemTitle(i)).slice(0, 1)}</span>
                      <span>
                        <b>{itemTitle(i)}</b>
                        <small>Item #{i.ItemNo}</small>
                      </span>
                    </div>
                  </td>
                  <td className="pd-time">{stamp(i.StartDate)}</td>
                  <td className="pd-time">{isPermanent(i.EndDate) ? '—' : stamp(i.EndDate)}</td>
                  <td>{usesLeft(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'inbox' && (
        <section className="pd-card">
          <div className="pd-card-top">
            <h2><Inbox /> PLAYER INBOX</h2>
            <span className="pd-chip">{(data.inbox || []).length} ITEMS</span>
          </div>
          <p className="sub">Gifts and mailbox items from CBT_UserStore.</p>
          <table className="pd-table inv-table">
            <thead><tr><th>ITEM</th><th>FROM</th><th>STATUS</th><th>RECEIVED</th><th>EXPIRES</th></tr></thead>
            <tbody>
              {(data.inbox || []).length === 0 ? (
                <tr><td colSpan={5} className="pd-empty">Inbox is empty.</td></tr>
              ) : data.inbox.map((i: any) => (
                <tr key={i.UserStoreSeqNo}>
                  <td>
                    <div className="inv-item">
                      <span className="inv-thumb">{String(i.ProductName || i.ProductID || 'P').slice(0, 1)}</span>
                      <span>
                        <b>{i.ProductName || `Product #${i.ProductID}`}</b>
                        <small>{i.Message || `Product #${i.ProductID}`}</small>
                      </span>
                    </div>
                  </td>
                  <td>{i.SendNickname || 'System'}</td>
                  <td>{Number(i.ConfirmType) === 1 ? 'CLAIMED' : 'PENDING'}</td>
                  <td className="pd-time">{stamp(i.RecvDate)}</td>
                  <td className="pd-time">{isPermanent(i.enddate) ? '—' : stamp(i.enddate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'purchases' && (
        <section className="pd-card">
          <div className="pd-card-top">
            <h2><ShoppingBag /> PURCHASE HISTORY</h2>
            <span className="pd-chip">{(data.purchases || []).length} ORDERS</span>
          </div>
          <p className="sub">NX shop orders from VISMS_PurchaseLog.</p>
          <table className="pd-table">
            <thead><tr><th>ORDER</th><th>PRODUCT</th><th>PRICE</th><th>GIFT</th><th>DATE</th></tr></thead>
            <tbody>
              {(data.purchases || []).length === 0 ? (
                <tr><td colSpan={5} className="pd-empty">No purchases.</td></tr>
              ) : data.purchases.map((i: any, n: number) => (
                <tr key={i.OrderID || n}>
                  <td>{i.OrderID}</td>
                  <td>
                    <b>{i.ProductName || `Product #${i.ProductNo}`}</b>
                    <small style={{ display: 'block', color: '#888' }}>#{i.ProductNo}</small>
                  </td>
                  <td>{Number(i.TotalPrice || 0).toLocaleString()} NX</td>
                  <td>{i.IsGift ? 'YES' : '—'}</td>
                  <td className="pd-time">{stamp(i.RegDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'progress' && (
        <>
          <section className="pd-card">
            <h2><TrendingUp /> COMBAT RECORD</h2>
            <p className="sub">Lifetime stats from CBT_User.</p>
            <div className="pd-grid">
              <div><p>RANK</p><b>{rankLabel}</b></div>
              <div><p>EXP</p><b>{Number(u.Exp || 0).toLocaleString()}</b></div>
              <div><p>KILLS</p><b>{Number(u.KillCnt || 0).toLocaleString()}</b></div>
              <div><p>DEATHS</p><b>{Number(u.DeadCnt || 0).toLocaleString()}</b></div>
              <div><p>WINS</p><b>{Number(u.WinCnt || 0).toLocaleString()}</b></div>
              <div><p>LOSSES</p><b>{Number(u.LoseCnt || 0).toLocaleString()}</b></div>
              <div><p>HEADSHOTS</p><b>{Number(u.HeadShotCnt || 0).toLocaleString()}</b></div>
              <div><p>ROUNDS</p><b>{Number(u.PlayRoundCnt || 0).toLocaleString()}</b></div>
              <div><p>USED NX</p><b>{Number(u.usedNX || 0).toLocaleString()}</b></div>
              <div><p>K/D</p><b>{u.DeadCnt ? (Number(u.KillCnt || 0) / Number(u.DeadCnt)).toFixed(2) : Number(u.KillCnt || 0).toFixed(2)}</b></div>
            </div>
          </section>
          <section className="pd-card">
            <h2>MODE DETAILS</h2>
            <p className="sub">Extra stats from CBT_UserDetailInfo.</p>
            {!data.detail ? (
              <p className="pd-note">No extra mode stats for this account.</p>
            ) : (
              <div className="pd-grid">
                <div><p>CO-OP KILLS</p><b>{data.detail.CoopKill || 0}</b></div>
                <div><p>CO-OP DEATHS</p><b>{data.detail.CoopDead || 0}</b></div>
                <div><p>CO-OP WINS</p><b>{data.detail.CoopSuccess || 0}</b></div>
                <div><p>CO-OP PLAYS</p><b>{data.detail.CoopPlayNum || 0}</b></div>
                <div><p>QUARANTINE PLAYS</p><b>{data.detail.QuaRanTinePlayNum || 0}</b></div>
                <div><p>HUMAN KILLS</p><b>{data.detail.HumanKillCnt || 0}</b></div>
                <div><p>INFECTED KILLS</p><b>{data.detail.InfectKillCnt || 0}</b></div>
                <div><p>SPY KILLS</p><b>{data.detail.SpyKillCnt || 0}</b></div>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'friends' && (
        <div className="pd-split">
          <section className="pd-card">
            <h2><UsersRound /> CLAN</h2>
            {data.clan ? (
              <div className="pd-grid">
                <div><p>NAME</p><b>{data.clan.strName}</b></div>
                <div><p>TAG</p><b>{data.clan.strID}</b></div>
                <div><p>MASTER</p><b>{data.clan.dn_strCharacterName_master}</b></div>
                <div><p>MEMBERS</p><b>{data.clan.dn_n4TotalRegularMember}</b></div>
              </div>
            ) : <p className="pd-note">Not in a clan.</p>}
          </section>
          <section className="pd-card">
            <h2>FRIENDS</h2>
            <p className="sub">{(data.friends || []).length} messenger friends</p>
            <table className="pd-table">
              <thead><tr><th>NICK</th><th>ACCOUNT</th><th>SINCE</th></tr></thead>
              <tbody>
                {(data.friends || []).length === 0 ? <tr><td colSpan={3} className="pd-empty">No friends listed.</td></tr> : data.friends.map((f: any) => (
                  <tr key={f.oidFriend}><td>{f.NickName || '—'}</td><td>{f.username || f.oidFriend}</td><td className="pd-time">{stamp(f.RegDate)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'reports' && (
        <>
          <section className="pd-card">
            <div className="pd-card-top">
              <h2><Flag /> REPORTS</h2>
              <span className="pd-chip">{(data.reports || []).length} RECORDS</span>
            </div>
            <p className="sub">Reports involving this account as target or reporter.</p>
            <table className="pd-table">
              <thead><tr><th>DATE</th><th>TARGET</th><th>MESSAGE</th><th>CAT</th></tr></thead>
              <tbody>
                {(data.reports || []).length === 0 ? (
                  <tr><td colSpan={4} className="pd-empty">No reports.</td></tr>
                ) : data.reports.map((r: any) => (
                  <tr key={r.SeqNo}>
                    <td className="pd-time">{stamp(r.RegDate)}</td>
                    <td>{r.TargetNickName}</td>
                    <td>{r.Message}</td>
                    <td>{r.MainCategory}/{r.SubCategory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="pd-card">
            <div className="pd-card-top">
              <h2>KICKS</h2>
              <span className="pd-chip">{(data.kicks || []).length} LOGS</span>
            </div>
            <p className="sub">Kick history from CBT_CharacterKickedLog.</p>
            {data.kickCounts && (
              <div className="pd-grid" style={{ marginBottom: 16 }}>
                <div><p>NO MANNER</p><b>{data.kickCounts.nomanercnt || 0}</b></div>
                <div><p>BUG PLAY</p><b>{data.kickCounts.bugplaycnt || 0}</b></div>
                <div><p>DEFAMATION</p><b>{data.kickCounts.defamationcnt || 0}</b></div>
                <div><p>HACK</p><b>{data.kickCounts.hackprogramusecnt || 0}</b></div>
              </div>
            )}
            <table className="pd-table">
              <thead><tr><th>DATE</th><th>REASON</th><th>FORFEITED</th></tr></thead>
              <tbody>
                {(data.kicks || []).length === 0 ? (
                  <tr><td colSpan={3} className="pd-empty">No kick logs.</td></tr>
                ) : data.kicks.map((k: any) => (
                  <tr key={k.logId}>
                    <td className="pd-time">{stamp(k.loggedAt)}</td>
                    <td>{k.kickReason}</td>
                    <td>{k.forfeited ? 'YES' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
