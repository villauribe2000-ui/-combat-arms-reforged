import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { rankIcon, rankFromExp } from '@/lib/ranks';
import {
  ArrowLeft, Users, Package, Inbox, ShoppingBag, TrendingUp, UsersRound, Flag, Search, Shield,
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
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'friends', label: 'Friends & clan', icon: UsersRound },
  { id: 'reports', label: 'Reports & kicks', icon: Flag },
] as const;

type Tab = typeof TABS[number]['id'];

export default function AdminPlayerAccount({ id, onBack }: { id: number; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setTab('overview');
    api.getAdminPlayer(id)
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData(null); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id]);

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
            {u.webRole && !u.superAdmin && <span className="pl-pill pl-pill-admin">ADMINISTRATOR</span>}
            {u.isGM && <span className="pl-pill pl-pill-gm">GM</span>}
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
                <h2>RECENT MATCHES</h2>
                <span>90 days</span>
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
              <p className="sub">Previous names recorded for this character</p>
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
              <h2>MODERATION HISTORY</h2>
              <span>{(data.punishments?.length || 0) + (data.bans?.length || 0)} RECORDS</span>
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
                        <td>web</td>
                        <td>{r.liftedAt ? stampShort(r.liftedAt) : '—'}</td>
                      </tr>
                    ))}
                    {(data.bans || []).map((r: any, i: number) => (
                      <tr key={`b${i}`}>
                        <td>{stampShort(r.BanDate)}</td>
                        <td>{r.BanType}</td>
                        <td>{r.BanPeriod ? `${r.BanPeriod}` : '—'}</td>
                        <td>{r.Reason}</td>
                        <td>{r.GMOidUser}</td>
                        <td>game</td>
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

      {tab === 'inventory' && (
        <section className="pd-card">
          <h2>INVENTORY</h2>
          <p className="sub">CBT_UserInventory — read only</p>
          <table className="pd-table">
            <thead><tr><th>ITEM</th><th>NO</th><th>PRODUCT</th><th>START</th><th>END</th><th>QTY</th></tr></thead>
            <tbody>
              {(data.inventory || []).length === 0 ? <tr><td colSpan={6} className="pd-empty">Empty inventory.</td></tr> : data.inventory.map((i: any) => (
                <tr key={i.InventorySeqNo}>
                  <td>{i.Name || '—'}</td>
                  <td>{i.ItemNo}</td>
                  <td>{i.ProductID}</td>
                  <td>{stampShort(i.StartDate)}</td>
                  <td>{stampShort(i.EndDate)}</td>
                  <td>{i.remaincount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'inbox' && (
        <section className="pd-card">
          <h2>INBOX</h2>
          <p className="sub">CBT_UserStore gifts and inbox items</p>
          <table className="pd-table">
            <thead><tr><th>FROM</th><th>PRODUCT</th><th>MESSAGE</th><th>RECEIVED</th></tr></thead>
            <tbody>
              {(data.inbox || []).length === 0 ? <tr><td colSpan={4} className="pd-empty">Inbox is empty.</td></tr> : data.inbox.map((i: any) => (
                <tr key={i.UserStoreSeqNo}>
                  <td>{i.SendNickname || '—'}</td>
                  <td>{i.ProductID}</td>
                  <td>{i.Message || '—'}</td>
                  <td>{stampShort(i.RecvDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'purchases' && (
        <section className="pd-card">
          <h2>PURCHASES</h2>
          <p className="sub">VISMS_PurchaseLog</p>
          <table className="pd-table">
            <thead><tr><th>ORDER</th><th>PRODUCT</th><th>PRICE</th><th>GIFT</th><th>DATE</th></tr></thead>
            <tbody>
              {(data.purchases || []).length === 0 ? <tr><td colSpan={5} className="pd-empty">No purchases.</td></tr> : data.purchases.map((i: any, n: number) => (
                <tr key={i.OrderID || n}>
                  <td>{i.OrderID}</td>
                  <td>{i.ProductNo}</td>
                  <td>{i.TotalPrice}</td>
                  <td>{i.IsGift ? 'YES' : ''}</td>
                  <td>{stampShort(i.RegDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'progress' && (
        <section className="pd-card">
          <h2>PROGRESS</h2>
          <div className="pd-grid">
            <div><p>KILLS</p><b>{u.KillCnt || 0}</b></div>
            <div><p>DEATHS</p><b>{u.DeadCnt || 0}</b></div>
            <div><p>WINS</p><b>{u.WinCnt || 0}</b></div>
            <div><p>LOSSES</p><b>{u.LoseCnt || 0}</b></div>
            <div><p>HEADSHOTS</p><b>{u.HeadShotCnt || 0}</b></div>
            <div><p>ROUNDS</p><b>{u.PlayRoundCnt || 0}</b></div>
            <div><p>USED NX</p><b>{u.usedNX || 0}</b></div>
            <div><p>RANK</p><b>{rankLabel}</b></div>
          </div>
        </section>
      )}

      {tab === 'friends' && (
        <div className="pd-split">
          <section className="pd-card">
            <h2>CLAN</h2>
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
            <table className="pd-table">
              <thead><tr><th>NICK</th><th>ACCOUNT</th><th>SINCE</th></tr></thead>
              <tbody>
                {(data.friends || []).length === 0 ? <tr><td colSpan={3} className="pd-empty">No friends listed.</td></tr> : data.friends.map((f: any) => (
                  <tr key={f.oidFriend}><td>{f.NickName}</td><td>{f.username}</td><td>{stampShort(f.RegDate)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'reports' && (
        <section className="pd-card">
          <h2>REPORTS</h2>
          <p className="sub">CBT_UserReportCommon — as target or reporter</p>
          <table className="pd-table">
            <thead><tr><th>DATE</th><th>TARGET</th><th>MESSAGE</th><th>CAT</th></tr></thead>
            <tbody>
              {(data.reports || []).length === 0 ? <tr><td colSpan={4} className="pd-empty">No reports.</td></tr> : data.reports.map((r: any) => (
                <tr key={r.SeqNo}>
                  <td>{stampShort(r.RegDate)}</td>
                  <td>{r.TargetNickName}</td>
                  <td>{r.Message}</td>
                  <td>{r.MainCategory}/{r.SubCategory}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
