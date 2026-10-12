import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PageId } from '@/components/Layout';
import {
  ChevronRight, Eye, KeyRound, LayoutDashboard, LogOut, Mail, Shield, ShieldCheck, UserRound, Calendar, Activity, Lock,
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
        setGame({ ...dbProfile, ...storedData, nx: profile.gameCoins, gp: profile.totalBalance });
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
