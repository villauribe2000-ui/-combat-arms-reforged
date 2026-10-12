import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { rankFromExp, rankIcon, rankProgress } from '@/lib/ranks';
import type { PageId } from '@/components/Layout';
import {
  ChevronRight, Eye, KeyRound, LayoutDashboard, LogOut, Mail, Shield, ShieldCheck, UserRound, Calendar, Activity, Lock, Crosshair, Target, Users, Trophy, ArrowRight,
} from 'lucide-react';

type Tab = 'overview' | 'stats' | 'logs' | '2fa' | 'password';
type LogItem = { id: string; title: string; detail: string; at: string };

function monthLabel(date?: string) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function dateLabel(date?: string) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString('en-US');
  return d.toLocaleDateString('en-US');
}

function readLogs(username: string): LogItem[] {
  try {
    return JSON.parse(localStorage.getItem(`account_logs_${username}`) || '[]');
  } catch {
    return [];
  }
}

function writeLogs(username: string, logs: LogItem[]) {
  localStorage.setItem(`account_logs_${username}`, JSON.stringify(logs.slice(0, 40)));
}

export default function ProfilePage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [game, setGame] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [expRank, setExpRank] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);

  const name = game?.NickName || profile?.nickname || profile?.username || 'Player';
  const email = profile?.email || 'Email changes are not available yet.';
  const joined = profile?.joinDate;

  useEffect(() => {
    const stored = sessionStorage.getItem('profile_tab') as Tab | null;
    if (stored && ['overview', 'stats', 'logs', '2fa', 'password'].includes(stored)) setTab(stored);
    sessionStorage.removeItem('profile_tab');
  }, []);

  useEffect(() => {
    if (!profile?.username) return;
    const stored = localStorage.getItem(`profile_${profile.username}`);
    const storedData = stored ? JSON.parse(stored) : {};
    setAvatarUrl(storedData.avatar_url || '');

    const existing = readLogs(profile.username);
    const loginEntry: LogItem = {
      id: `login-${Date.now()}`,
      title: 'Signed in',
      detail: 'Website account',
      at: new Date().toISOString(),
    };
    const next = [loginEntry, ...existing.filter(l => l.title !== 'Signed in' || Date.now() - Date.parse(l.at) > 60_000)];
    writeLogs(profile.username, next);
    setLogs(next);

    (async () => {
      try {
        const dbProfile = await api.getProfile(profile.username);
        setGame({ ...dbProfile, ...storedData, nx: profile.gameCoins, gp: profile.totalBalance, Exp: dbProfile.Exp ?? dbProfile.experience ?? 0 });
        try {
          const top = await api.getTopPlayers(100);
          const list = Array.isArray(top) ? [...top] : [];
          list.sort((a, b) => Number(b.userExp ?? b.Exp ?? b.experience ?? 0) - Number(a.userExp ?? a.Exp ?? a.experience ?? 0));
          const idx = list.findIndex(p => p.username === profile.username || p.NickName === dbProfile.NickName);
          setExpRank(idx >= 0 ? idx + 1 : null);
          setPlayerCount(list.length);
        } catch {
          setExpRank(null);
        }
      } catch {
        setGame({ NickName: name, ...storedData, nx: profile.gameCoins, gp: profile.totalBalance, kills: 0, deaths: 0, wins: 0, losses: 0, level: profile.level || 0 });
      }
    })();
  }, [profile?.username]);

  const pushLog = (title: string, detail: string) => {
    if (!profile?.username) return;
    const item: LogItem = { id: `${title}-${Date.now()}`, title, detail, at: new Date().toISOString() };
    const next = [item, ...logs];
    setLogs(next);
    writeLogs(profile.username, next);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.username) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target?.result as string;
      setAvatarUrl(base64);
      localStorage.setItem(`profile_${profile.username}`, JSON.stringify({ avatar_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    try {
      setLoadingPassword(true);
      await api.changePassword(profile?.id || profile?.userId || 0, currentPassword, newPassword, confirmPassword);
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      pushLog('Password changed', 'Account password updated');
    } catch (error: any) {
      setPasswordError(error.message || 'Could not change password.');
    } finally {
      setLoadingPassword(false);
    }
  };

  const logout = async () => {
    pushLog('Signed out', 'Website session ended');
    await signOut();
    onNavigate('home');
  };

  const kd = game?.deaths > 0 ? (game.kills / game.deaths).toFixed(2) : (game?.kills || 0).toFixed(2);
  const exp = Number(game?.Exp ?? game?.experience ?? profile?.experience ?? 0);
  const rankLevel = Number(game?.rank) || rankFromExp(exp);
  const rankSrc = rankIcon({ rank: game?.rank, exp, isGM: game?.isGM || game?.UserType === 1 });
  const wins = Number(game?.wins || 0);
  const losses = Number(game?.losses || 0);
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';
  const assists = Number(game?.assists || 0);
  const kda = game?.deaths > 0 ? ((Number(game?.kills || 0) + assists) / game.deaths).toFixed(2) : (Number(game?.kills || 0) + assists).toFixed(2);
  const progress = rankProgress(exp);
  const snapshot = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const showPlayer = tab === 'overview' || tab === 'stats';

  if (showPlayer) {
    return (
      <div className="player-profile">
        <div className="player-profile-hero">
          <img src="/caevo/hero.jpg" alt="" />
        </div>
        <div className="page-width player-profile-body">
          <div className="player-crumb">
            <button type="button" onClick={() => onNavigate('home')}>Home</button>
            <span>/</span>
            <button type="button" onClick={() => onNavigate('rankings')}>Players</button>
            <span>/</span>
            <span>{name}</span>
          </div>
          <header className="page-heading">
            <div>
              <p className="eyebrow"><span className="tiny-square" />COMBAT ARMS / THE CLASSIC</p>
              <h1>PLAYER PROFILE.</h1>
            </div>
          </header>
          <div className="player-identity">
            <img src={rankSrc} alt="" className="player-rank-img" onError={e => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
            <div>
              <h2>
                {name}
                <span className="player-level">LEVEL {rankLevel}</span>
              </h2>
              <p>{game?.isGM || game?.UserType === 1 ? 'Game Master' : game?.rankName || 'Soldier'}</p>
            </div>
          </div>
          <div className="player-metrics">
            <article>
              <p>CLAN</p>
              <strong>{game?.clan || '—'}</strong>
            </article>
            <article>
              <p>TOTAL EXP</p>
              <strong>{exp.toLocaleString()}</strong>
            </article>
            <article>
              <p>K/D RATIO</p>
              <strong>{kd}</strong>
            </article>
            <article>
              <p>WIN RATE</p>
              <strong>{winRate}%</strong>
            </article>
          </div>
          <section className="player-record">
            <div className="player-record-head">
              <div>
                <p className="eyebrow">EVERY MATCH COUNTS</p>
                <h2>COMBAT RECORD.</h2>
              </div>
              <span className="player-kda">KDA {kda}</span>
            </div>
            <div className="player-record-grid">
              <article className="player-record-card">
                <p><Crosshair size={14} /> KILLS</p>
                <strong>{Number(game?.kills || 0).toLocaleString()}</strong>
                <small>Eliminations recorded</small>
              </article>
              <article className="player-record-card">
                <p><Target size={14} /> DEATHS</p>
                <strong>{Number(game?.deaths || 0).toLocaleString()}</strong>
                <small>Deaths recorded</small>
              </article>
              <article className="player-record-card">
                <p><Users size={14} /> ASSISTS</p>
                <strong>{assists.toLocaleString()}</strong>
                <small>Assists recorded</small>
              </article>
              <article className="player-record-card">
                <p><Shield size={14} /> WINS</p>
                <strong>{wins.toLocaleString()}</strong>
                <small>{losses.toLocaleString()} losses</small>
              </article>
            </div>
          </section>

          <div className="player-bottom">
            <section className="player-panel">
              <div className="player-panel-head">
                <div>
                  <p>KEEP MOVING FORWARD</p>
                  <h3>Rank progression</h3>
                </div>
                <ArrowRight size={16} />
              </div>
              <div className="player-progress-ranks">
                <div>
                  <img src={rankSrc} alt="" onError={e => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                  <small>CURRENT RANK</small>
                  <strong>{game?.isGM || game?.UserType === 1 ? 'Game Master' : game?.rankName || `Rank ${rankLevel}`}</strong>
                </div>
                <ArrowRight size={18} className="player-progress-arrow" />
                <div>
                  {progress.complete ? (
                    <Trophy size={28} className="text-[#df8104]" />
                  ) : (
                    <img src={rankIcon({ rank: progress.nextLevel, exp })} alt="" onError={e => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                  )}
                  <small>TOP RANK</small>
                  <strong>{progress.complete ? 'Highest rank reached' : `Rank ${progress.nextLevel}`}</strong>
                </div>
              </div>
              <div className="player-progress-meta">
                <span>{progress.complete ? 'Rank complete' : 'Progress to next rank'}</span>
                <span>{progress.percent.toFixed(1)}%</span>
              </div>
              <div className="player-progress-bar"><i style={{ width: `${progress.percent}%` }} /></div>
              <div className="player-progress-meta">
                <span>{exp.toLocaleString()} total EXP</span>
                <span>{progress.complete ? 'All ranks completed' : `${progress.nextExp.toLocaleString()} EXP needed`}</span>
              </div>
            </section>

            <section className="player-panel">
              <div className="player-panel-head">
                <div>
                  <p>AMONG THE PLAYERS</p>
                  <h3>Leaderboard standing</h3>
                </div>
                <Trophy size={16} />
              </div>
              <div className="player-standing">
                <strong>#{expRank ?? '—'}</strong>
                <div>
                  <p>EXP RANKING</p>
                  <small>{exp.toLocaleString()} experience points{playerCount ? ` · top ${playerCount}` : ''}</small>
                </div>
              </div>
              <button type="button" className="player-board-link" onClick={() => onNavigate('rankings')}>
                View the leaderboard <ArrowRight size={14} />
              </button>
            </section>
          </div>

          <div className="player-notes">
            <p>KDA = (kills + assists) / deaths. Assists include more match types than kills and deaths.</p>
            <p>Win rate = wins / (wins + losses). Ratios without the required data appear as —.</p>
          </div>
          <div className="player-notes player-notes-foot">
            <p>PUBLIC PLAYER RECORD</p>
            <p>Profile snapshot: {snapshot}</p>
          </div>
        </div>

        <footer className="mx-auto max-w-[1440px] px-6 pb-6 pt-8 lg:px-16">
          <div className="flex flex-col gap-6 border-t border-[#333] pt-8 md:flex-row md:items-center md:justify-between">
            <button onClick={() => onNavigate('home')} className="brand-evo text-left">
              <img src="/caevo/ca.ico" alt="" className="h-10 w-10 object-contain" />
              <span>
                COMBAT<span className="brand-arms">ARMS</span>
                <small>EVOLUTION</small>
              </span>
            </button>
            <nav className="flex flex-wrap items-center gap-5 text-[13px] text-[#b5b5b5]">
              <button onClick={() => onNavigate('rankings')} className="hover:text-white">Rankings</button>
              <button onClick={() => onNavigate('birthday')} className="hover:text-white">Events</button>
              <button onClick={() => onNavigate('guide')} className="hover:text-white">Guide</button>
              <button onClick={() => onNavigate('download')} className="hover:text-white">Download</button>
              <a href="https://discord.gg/5EpJwAh2r6" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#5865F2] hover:text-[#7983f5]">
                <img src="/caevo/discord-mark-white.svg" alt="" className="h-3.5 w-4" />
                Join Discord
              </a>
            </nav>
          </div>
          <div className="mt-6 flex flex-col gap-2 border-t border-[#333] pt-4 text-[12px] text-[#777] md:flex-row md:justify-between">
            <p>An independent fan concept. Combat Arms and its artwork belong to their respective owners.</p>
            <span>COMBAT ARMS EVOLUTION / CA EVO</span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="inner-page page-width account-page">
      <header className="page-heading account-page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" /> PLAYER DASHBOARD</p>
          <h1>MY ACCOUNT.</h1>
          <p className="page-heading-description">
            Welcome back, <strong>{name}</strong>. Make yourself at home.
          </p>
        </div>
        <span className="account-preview-chip">
          <Shield size={14} /> ACCOUNT CONNECTED
        </span>
      </header>

      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-identity">
            <label className="account-avatar" style={{ cursor: 'pointer' }}>
              <img src={avatarUrl || '/caevo/hero.jpg'} alt="" />
              <span />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <h2>{name}</h2>
            {email.includes('@') && <p>{email}</p>}
            <span className="account-member-tag">COMBAT ARMS PLAYER</span>
          </div>
          <nav className="account-navigation">
            {([
              ['overview', 'Overview', LayoutDashboard],
              ['stats', 'Account stats', Activity],
              ['logs', 'Account logs', Eye],
              ['2fa', 'Two-factor auth', ShieldCheck],
              ['password', 'Reset password', KeyRound],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" aria-selected={tab === id} onClick={() => setTab(id)}>
                <Icon size={16} />
                {label}
                <ChevronRight size={16} />
              </button>
            ))}
          </nav>
          <div className="account-sidebar-bottom">
            <p><span /> Signed in</p>
            <button type="button" onClick={logout}><LogOut size={14} /> Sign out</button>
          </div>
        </aside>

        <div className="account-content">
          {tab === 'overview' && (
            <div className="account-overview">
              <div className="account-stats">
                <article>
                  <div className="account-stat-icon"><UserRound size={18} /></div>
                  <div>
                    <p>ACCOUNT STATUS</p>
                    <strong>Connected</strong>
                    <small>Signed in to this website</small>
                  </div>
                </article>
                <article>
                  <div className="account-stat-icon"><ShieldCheck size={18} /></div>
                  <div>
                    <p>TWO-FACTOR AUTH</p>
                    <strong>Website</strong>
                    <small>Password sign-in protection</small>
                  </div>
                </article>
                <article>
                  <div className="account-stat-icon"><Calendar size={18} /></div>
                  <div>
                    <p>MEMBER SINCE</p>
                    <strong>{monthLabel(joined)}</strong>
                    <small>Account registration</small>
                  </div>
                </article>
              </div>

              <section className="account-panel">
                <div className="account-panel-head">
                  <div>
                    <p className="account-eyebrow">THE PLAYER BEHIND THE NAME</p>
                    <h2>Profile details</h2>
                    <p className="account-panel-description">Your identity across Combat Arms.</p>
                  </div>
                </div>
                <dl className="account-profile-details">
                  <div>
                    <dt><UserRound size={14} /> Display name</dt>
                    <dd>{name}<small>Permanent sign-in name. Cannot be changed.</small></dd>
                  </div>
                  <div>
                    <dt><Mail size={14} /> Email address</dt>
                    <dd>{email}<small>Email changes are not available yet.</small></dd>
                  </div>
                  <div>
                    <dt><Shield size={14} /> Email status</dt>
                    <dd>Active<small>Account email status</small></dd>
                  </div>
                  <div>
                    <dt><Calendar size={14} /> Date created</dt>
                    <dd>{dateLabel(joined)}<small>Account creation date</small></dd>
                  </div>
                </dl>
              </section>

              <div className="account-overview-grid">
                <section className="account-panel account-security-card">
                  <div className="account-large-icon"><ShieldCheck size={22} /></div>
                  <h2>Account security.</h2>
                  <p>Your website account is protected by your password. Keep it private and update it if you need to.</p>
                  <button type="button" className="account-text-action" onClick={() => setTab('password')}>
                    Reset password <ChevronRight size={14} />
                  </button>
                </section>
                <section className="account-panel account-recent-card">
                  <div className="account-panel-head">
                    <div>
                      <p className="account-eyebrow">LATEST ACTIVITY</p>
                      <h2>Website activity</h2>
                    </div>
                  </div>
                  <ul>
                    {logs.slice(0, 4).map(log => (
                      <li key={log.id}>
                        <span className="account-activity-dot" />
                        <div>
                          <strong>{log.title}</strong>
                          <p>{log.detail}</p>
                        </div>
                        <small>{dateLabel(log.at)}</small>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}

          {tab === 'stats' && (
            <section className="account-panel account-game-panel">
              <div className="account-panel-head account-game-heading">
                <div>
                  <p className="account-eyebrow">GAME ACCOUNT</p>
                  <h2>Account stats</h2>
                </div>
                <span className="account-game-sample">LIVE</span>
              </div>
              <div className="account-game-level">
                <div className="account-game-insignia">
                  <img src="/caevo/ca.ico" alt="" width={48} height={48} />
                </div>
                <div className="account-game-level-info">
                  <span>CURRENT LEVEL</span>
                  <h3>{game?.level ?? profile?.level ?? 0}</h3>
                  <p className="account-game-rank-code">{game?.rankName || 'Combat Arms'}</p>
                </div>
              </div>
              <div className="account-game-grid">
                {[
                  ['Kills', game?.kills ?? 0],
                  ['Deaths', game?.deaths ?? 0],
                  ['K/D', kd],
                  ['Wins', game?.wins ?? 0],
                  ['Losses', game?.losses ?? 0],
                  ['NX', profile?.gameCoins ?? 0],
                  ['GP', profile?.totalBalance ?? 0],
                ].map(([label, value]) => (
                  <article key={String(label)} className="account-game-card">
                    <p>{label}</p>
                    <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
                  </article>
                ))}
              </div>
              <p className="account-game-notes">Balances and stats reflect your game account.</p>
            </section>
          )}

          {tab === 'logs' && (
            <section className="account-panel account-logs-panel">
              <div className="account-panel-head">
                <div>
                  <p className="account-eyebrow">RECENT ACTIVITY</p>
                  <h2>Account logs</h2>
                  <p className="account-panel-description">Your website sign-ins and account changes.</p>
                </div>
                <span className="account-sample-label">WEBSITE ACTIVITY</span>
              </div>
              {logs.length === 0 ? (
                <div className="account-log-empty">No website activity in this category yet.</div>
              ) : (
                <div className="account-log-table-wrap">
                  <table className="account-log-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Detail</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td className="account-log-activity">
                            <span className="account-log-icon"><Activity size={14} /></span>
                            {log.title}
                          </td>
                          <td>{log.detail}</td>
                          <td>{dateLabel(log.at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === '2fa' && (
            <section className="account-panel account-two-factor-panel">
              <div className="account-panel-head">
                <div>
                  <p className="account-eyebrow">WEBSITE PROTECTION</p>
                  <h2>Two-factor authentication</h2>
                </div>
              </div>
              <div className="account-security-summary">
                <div className="account-security-icon"><Shield size={22} /></div>
                <div>
                  <h3>Password protection is active</h3>
                  <p className="account-2fa-scope">Authenticator 2FA is not enabled on this client yet. Your website sign-in uses your account password.</p>
                </div>
              </div>
            </section>
          )}

          {tab === 'password' && (
            <section className="account-panel">
              <div className="account-panel-head">
                <div>
                  <p className="account-eyebrow">KEEP YOUR ACCESS SAFE</p>
                  <h2>Reset password</h2>
                  <p className="account-panel-description">Update the password you use to sign in to the website and game.</p>
                </div>
              </div>
              <form className="account-form" onSubmit={handleChangePassword}>
                <div className="account-field">
                  <label className="account-field-label">Current password</label>
                  <div className="account-input-wrap">
                    <Lock size={16} />
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter your current password" />
                  </div>
                </div>
                <div className="account-field">
                  <label className="account-field-label">New password</label>
                  <div className="account-input-wrap">
                    <KeyRound size={16} />
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" />
                  </div>
                </div>
                <div className="account-field">
                  <label className="account-field-label">Confirm new password</label>
                  <div className="account-input-wrap">
                    <KeyRound size={16} />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat the new password" />
                  </div>
                </div>
                {passwordError && <p className="account-field-error">{passwordError}</p>}
                {passwordSuccess && <p className="account-feedback is-success">{passwordSuccess}</p>}
                <div className="account-actions">
                  <button type="submit" className="account-action" disabled={loadingPassword}>
                    {loadingPassword ? 'Saving…' : 'Change password'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
