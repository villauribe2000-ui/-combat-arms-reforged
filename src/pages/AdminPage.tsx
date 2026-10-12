import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PageId } from '@/components/Layout';
import {
  XCircle, Loader, RotateCcw, MessageSquare, Send,
  LayoutDashboard, Users, Radio, Shield, Store, Landmark, FileBarChart, Swords, LogIn,
  Link2, Megaphone, Map, Zap, ArrowLeft, Search, RefreshCw, Ticket, KeyRound, CreditCard
} from 'lucide-react';

interface PaymentCode {
  id: number;
  oidUser: number;
  username: string;
  NickName: string;
  paymentCode: string;
  nxAmount: number;
  dollarAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface PaymentRequest {
  id: number;
  oidUser: number;
  username: string;
  NickName: string;
  nxAmount: number;
  dollarAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface RefundRequest {
  id: number;
  oidUser: number;
  username: string;
  NickName: string;
  productId: number;
  productName: string;
  nxPaid: number;
  nxCommission: number;
  nxToRefund: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  username: string;
  NickName: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: number;
  senderType: 'user' | 'admin';
  senderUsername: string;
  message: string;
  createdAt: string;
}

type Section =
  | 'overview' | 'players' | 'online' | 'clans' | 'shop' | 'economy' | 'reports'
  | 'matches' | 'logins' | 'linked' | 'announcements' | 'maps' | 'boosts'
  | 'codes' | 'payments' | 'refunds' | 'tickets';

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'CONTROL' },
  { id: 'players', label: 'Players', icon: Users, group: 'CONTROL' },
  { id: 'online', label: 'Online', icon: Radio, group: 'CONTROL' },
  { id: 'clans', label: 'Clans', icon: Shield, group: 'CONTROL' },
  { id: 'shop', label: 'Shop', icon: Store, group: 'CONTROL' },
  { id: 'codes', label: 'Payment codes', icon: KeyRound, group: 'ECONOMY' },
  { id: 'payments', label: 'Recargas', icon: CreditCard, group: 'ECONOMY' },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw, group: 'ECONOMY' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, group: 'ECONOMY' },
  { id: 'economy', label: 'Economy', icon: Landmark, group: 'ECONOMY' },
  { id: 'reports', label: 'Reports', icon: FileBarChart, group: 'ECONOMY' },
  { id: 'matches', label: 'Matches', icon: Swords, group: 'WORLD' },
  { id: 'logins', label: 'Logins', icon: LogIn, group: 'WORLD' },
  { id: 'linked', label: 'Linked accounts', icon: Link2, group: 'WORLD' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, group: 'WORLD' },
  { id: 'maps', label: 'Maps', icon: Map, group: 'WORLD' },
  { id: 'boosts', label: 'Boosts', icon: Zap, group: 'WORLD' },
];

export default function AdminPage({ onNavigate }: { onNavigate?: (page: PageId) => void }) {
  const { profile } = useAuth();
  const [paymentCodes, setPaymentCodes] = useState<PaymentCode[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [approvingCode, setApprovingCode] = useState<number | null>(null);
  const [rejectingCode, setRejectingCode] = useState<number | null>(null);
  const [approvingRefund, setApprovingRefund] = useState<number | null>(null);
  const [rejectingRefund, setRejectingRefund] = useState<number | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [find, setFind] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [clans, setClans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [modes, setModes] = useState<any[]>([]);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [codeData, paymentData, refundData, ticketData, ov, pl, cl, pr, gm] = await Promise.all([
        api.getPendingPaymentCodes().catch(() => []),
        api.getPendingPayments().catch(() => []),
        api.getPendingRefunds().catch(() => []),
        api.getAllTickets().catch(() => []),
        api.getAdminOverview().catch(() => null),
        api.getPlayers(1, 40).catch(() => ({ data: [] })),
        api.getClans().catch(() => []),
        api.getProducts().catch(() => []),
        api.getTournaments().catch(() => []),
      ]);
      setPaymentCodes(codeData || []);
      setPayments(paymentData || []);
      setRefunds(refundData || []);
      setSupportTickets(ticketData || []);
      setOverview(ov);
      setPlayers(pl?.data || []);
      setClans(Array.isArray(cl) ? cl : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setModes(Array.isArray(gm) ? gm : []);
    } catch (error) {
      console.error('[ADMIN] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: number) => {
    if (!profile?.username) return;
    try {
      setApproving(paymentId);
      const result = await api.approvePayment(paymentId, profile.username);
      if (result.success) {
        alert(`✅ Aprobado: ${result.message}`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (paymentId: number) => {
    if (!profile?.username) return;
    try {
      const reason = prompt('¿Razón del rechazo?');
      if (reason === null) return;
      setRejecting(paymentId);
      const result = await api.rejectPayment(paymentId, profile.username, reason);
      if (result.success) {
        alert(`❌ Rechazado`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setRejecting(null);
    }
  };

  const handleApproveCode = async (codeId: number) => {
    if (!profile?.username) return;
    try {
      setApprovingCode(codeId);
      const result = await api.approvePaymentCode(codeId, profile.username);
      if (result.success) {
        alert(`✅ Código aprobado: ${result.message}`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setApprovingCode(null);
    }
  };

  const handleRejectCode = async (codeId: number) => {
    if (!profile?.username) return;
    try {
      const reason = prompt('¿Razón del rechazo?');
      if (reason === null) return;
      setRejectingCode(codeId);
      const result = await api.rejectPaymentCode(codeId, profile.username, reason);
      if (result.success) {
        alert(`❌ Código rechazado`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setRejectingCode(null);
    }
  };

  const handleApproveRefund = async (refundId: number) => {
    if (!profile?.username) return;
    try {
      setApprovingRefund(refundId);
      const result = await api.approveRefund(refundId, profile.username);
      if (result.success) {
        alert(`✅ Reembolso aprobado\n${result.message}\n\nNX devuelto: ${result.details.nxRefunded}`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setApprovingRefund(null);
    }
  };

  const handleRejectRefund = async (refundId: number) => {
    if (!profile?.username) return;
    try {
      const reason = prompt('¿Razón del rechazo?');
      if (reason === null) return;
      setRejectingRefund(refundId);
      const result = await api.rejectRefund(refundId, profile.username, reason);
      if (result.success) {
        alert(`❌ Reembolso rechazado`);
        await loadData();
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setRejectingRefund(null);
    }
  };

  const loadTicketDetail = async (ticketId: number) => {
    try {
      setLoadingTicket(true);
      const data = await api.getTicketDetails(ticketId);
      setSelectedTicket(data.ticket);
      setTicketMessages(data.messages);
    } catch (error) {
      console.error('Error loading ticket:', error);
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleSendTicketMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !profile?.username) return;
    try {
      setSendingMessage(true);
      await api.sendTicketMessage(selectedTicket.id, 'admin', profile.username, newMessage);
      setNewMessage('');
      await loadTicketDetail(selectedTicket.id);
    } catch (error: any) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, newStatus: string) => {
    if (!profile?.username) return;
    try {
      setUpdatingStatus(ticketId);
      await api.updateTicketStatus(ticketId, newStatus, profile.username);
      if (selectedTicket?.id === ticketId) await loadTicketDetail(ticketId);
      await loadData();
    } catch (error: any) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (profile?.username !== 'villauribe12') {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="mt-4 text-xl font-bold text-red-400">Acceso Denegado</h2>
          <p className="mt-2 text-slate-400">Solo administradores pueden acceder a este panel</p>
        </div>
      </div>
    );
  }

  const pendingCodes = paymentCodes;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const totalNX = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.nxAmount, 0);
  const totalDollars = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.dollarAmount, 0);
  const totalCodesNX = pendingCodes.reduce((sum, c) => sum + c.nxAmount, 0);
  const totalCodesDollars = pendingCodes.reduce((sum, c) => sum + c.dollarAmount, 0);
  const pendingRefunds = refunds.filter(p => p.status === 'pending');
  const totalRefundNX = pendingRefunds.reduce((sum, p) => sum + p.nxPaid, 0);
  const totalRefundCommission = pendingRefunds.reduce((sum, p) => sum + p.nxCommission, 0);
  const q = find.trim().toLowerCase();
  const groups = [...new Set(NAV.map(n => n.group))];
  const latest = overview?.latest || [];
  const onlineList = overview?.onlineList || [];

  const Empty = ({ text }: { text: string }) => <div className="admin-empty">{text}</div>;

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <img src="/caevo/ca.ico" alt="" />
          <div>
            <strong>COMBAT ARMS</strong>
            <small>CONTROL ROOM</small>
          </div>
        </div>
        <input className="admin-find" placeholder="Find..." value={find} onChange={(e) => setFind(e.target.value)} />
        <nav className="admin-nav">
          {groups.map(group => (
            <div key={group}>
              <p>{group}</p>
              {NAV.filter(n => n.group === group && n.label.toLowerCase().includes(q)).map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.id} className={section === item.id ? 'admin-on' : ''} onClick={() => setSection(item.id)}>
                    <Icon /> {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <button className="admin-back" onClick={() => onNavigate?.('home')}>
          <ArrowLeft className="mr-2 inline h-4 w-4" /> Back to website
        </button>
      </aside>

      <div className="admin-main">
        <div className="admin-top">
          <span>CONTROL ROOM / {section.toUpperCase()}</span>
          <div className="admin-top-actions">
            <span className="admin-chip">SQL READ ONLY</span>
            <button className="admin-chip" onClick={loadData}><RefreshCw className="mr-1 inline h-3 w-3" /> Refresh</button>
            <Search className="h-4 w-4" />
          </div>
        </div>

        {section === 'overview' && (
          <>
            <div className="admin-hero">
              <img src="/caevo/hero.jpg" alt="" />
              <div className="admin-clock">{clock.toLocaleString('en-GB')}</div>
              <div className="admin-hero-copy">
                <p className="eyebrow">SERVER CONTROL</p>
                <h1>COMMAND<br /><span>CENTER</span></h1>
                <p>Live Combat Arms operations. New views only read the database — they never change it.</p>
                <div className="admin-hero-btns">
                  <button className="primary" onClick={() => setSection('players')}>Manage players</button>
                  <button onClick={() => setSection('codes')}>Payment codes</button>
                </div>
              </div>
            </div>
            <div className="admin-metrics">
              <article><p>ONLINE NOW</p><strong className="admin-green">{overview?.onlineNow ?? 0}</strong><small>Status = 1</small></article>
              <article><p>MATCH RESULTS</p><strong>{overview?.matchesRecorded ?? 0}</strong><small>Wins + losses recorded</small></article>
              <article><p>NEW TODAY</p><strong>{overview?.newAccountsToday ?? 0}</strong><small>CreateDate today</small></article>
              <article><p>NEW 7 DAYS</p><strong>{overview?.newAccounts7 ?? 0}</strong><small>Last week</small></article>
              <article><p>CHARACTERS</p><strong>{overview?.characters ?? 0}</strong><small>CBT_User</small></article>
              <article><p>CLANS</p><strong>{overview?.clans ?? 0}</strong><small>GuildMaster</small></article>
            </div>
            <div className="admin-split">
              <div className="admin-panel">
                <h2><Users /> LATEST REGISTRATIONS</h2>
                <p className="sub">Newest rows from CBT_User. Read only.</p>
                <table className="admin-table">
                  <thead><tr><th>NICK</th><th>ACCOUNT</th><th>CREATED</th><th>STATUS</th></tr></thead>
                  <tbody>
                    {latest.length === 0 ? (
                      <tr><td colSpan={4}>No rows</td></tr>
                    ) : latest.map((u: any) => (
                      <tr key={u.id}>
                        <td>{u.NickName || '—'}</td>
                        <td>{u.username}</td>
                        <td>{u.CreateDate ? new Date(u.CreateDate).toLocaleString('es') : '—'}</td>
                        <td><span className="admin-active">{u.Status === 1 ? 'ONLINE' : 'OFFLINE'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-panel admin-quick">
                <h2>QUICK ACCESS</h2>
                <p className="sub">Jump to working panels</p>
                <button onClick={() => setSection('codes')}><div><strong>Payment codes</strong><small>{pendingCodes.length} pending</small></div><span>→</span></button>
                <button onClick={() => setSection('payments')}><div><strong>Recargas</strong><small>{pendingCount} pending</small></div><span>→</span></button>
                <button onClick={() => setSection('refunds')}><div><strong>Refunds</strong><small>{pendingRefunds.length} pending</small></div><span>→</span></button>
                <button onClick={() => setSection('tickets')}><div><strong>Tickets</strong><small>{supportTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length} open</small></div><span>→</span></button>
              </div>
            </div>
          </>
        )}

        {section === 'players' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>PLAYERS</h1></div>
            <p className="sub">Existing player list — SELECT only.</p>
            {loading ? <Empty text="Loading..." /> : players.length === 0 ? <Empty text="No players returned" /> : (
              <table className="admin-table">
                <thead><tr><th>NICK</th><th>ACCOUNT</th><th>KILLS</th><th>WINS</th><th>EXP</th></tr></thead>
                <tbody>
                  {players.map((p: any) => (
                    <tr key={p.id || p.username}>
                      <td>{p.NickName}</td>
                      <td>{p.username}</td>
                      <td>{p.kills ?? p.KillCnt ?? 0}</td>
                      <td>{p.wins ?? p.WinCnt ?? 0}</td>
                      <td>{p.userExp ?? p.Exp ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {section === 'online' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>ONLINE</h1><span className="admin-chip">{overview?.onlineNow ?? 0} now</span></div>
            {onlineList.length === 0 ? <Empty text="Nobody online (Status = 1) or column unavailable." /> : (
              <table className="admin-table">
                <thead><tr><th>NICK</th><th>ACCOUNT</th><th>KILLS</th></tr></thead>
                <tbody>
                  {onlineList.map((u: any) => (
                    <tr key={u.id}><td>{u.NickName}</td><td>{u.username}</td><td>{u.kills}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {section === 'clans' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>CLANS</h1></div>
            {clans.length === 0 ? <Empty text="No clans returned from GuildMaster." /> : (
              <table className="admin-table">
                <thead><tr><th>CLAN</th><th>ID</th></tr></thead>
                <tbody>
                  {clans.map((c: any, i: number) => (
                    <tr key={c.GuildID || c.id || i}>
                      <td>{c.GuildName || c.name || JSON.stringify(c).slice(0, 80)}</td>
                      <td>{c.GuildID || c.id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {section === 'shop' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>SHOP</h1></div>
            {products.length === 0 ? <Empty text="No store products returned." /> : (
              <table className="admin-table">
                <thead><tr><th>ITEM</th><th>NX</th><th>CATEGORY</th></tr></thead>
                <tbody>
                  {products.map((p: any, i: number) => (
                    <tr key={p.id || i}>
                      <td>{p.name || p.productName || p.Name}</td>
                      <td>{p.price ?? p.nx ?? p.NX ?? '—'}</td>
                      <td>{p.category || p.Category || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {section === 'economy' && (
          <div>
            <div className="admin-stats">
              <article><p>CODES</p><strong>{pendingCodes.length}</strong></article>
              <article><p>RECARGAS</p><strong>{pendingCount}</strong></article>
              <article><p>REFUNDS</p><strong>{pendingRefunds.length}</strong></article>
            </div>
            <div className="admin-quick">
              <button onClick={() => setSection('codes')}><div><strong>Open payment codes</strong><small>Approve / reject existing requests</small></div><span>→</span></button>
              <button onClick={() => setSection('payments')}><div><strong>Open recargas</strong><small>Existing payment queue</small></div><span>→</span></button>
            </div>
          </div>
        )}

        {section === 'reports' && (
          <div className="admin-quick">
            <button onClick={() => setSection('refunds')}><div><strong>Refund queue</strong><small>{pendingRefunds.length} pending</small></div><span>→</span></button>
            <button onClick={() => setSection('tickets')}><div><strong>Support tickets</strong><small>{supportTickets.length} total</small></div><span>→</span></button>
          </div>
        )}

        {section === 'matches' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>MATCHES</h1></div>
            <p className="sub">Recorded results: {overview?.matchesRecorded ?? 0}. Modes from CBT_GameMode. No match writes.</p>
            {modes.length === 0 ? <Empty text="No game modes returned." /> : (
              <table className="admin-table">
                <thead><tr><th>MODE</th></tr></thead>
                <tbody>
                  {modes.map((m: any, i: number) => (
                    <tr key={i}><td>{m.GameModeName || m.Name || m.name || JSON.stringify(m).slice(0, 120)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {section === 'logins' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>LOGINS</h1></div>
            <p className="sub">There is no login-history table in use. Showing account CreateDate instead — read only.</p>
            {latest.length === 0 ? <Empty text="No registration rows." /> : (
              <table className="admin-table">
                <thead><tr><th>ACCOUNT</th><th>CREATED</th></tr></thead>
                <tbody>
                  {latest.map((u: any) => (
                    <tr key={u.id}><td>{u.username}</td><td>{u.CreateDate ? new Date(u.CreateDate).toLocaleString('es') : '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {section === 'linked' && <Empty text="No linked-account table is connected. SQL was not modified to add one." />}
        {section === 'announcements' && <Empty text="No announcements table is connected. SQL was not modified to add one." />}
        {section === 'boosts' && <Empty text="No boosts table is connected. SQL was not modified to add one." />}

        {section === 'maps' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>MAPS / MODES</h1></div>
            {modes.length === 0 ? <Empty text="No maps/modes returned from CBT_GameMode." /> : (
              <table className="admin-table">
                <thead><tr><th>ENTRY</th></tr></thead>
                <tbody>
                  {modes.map((m: any, i: number) => (
                    <tr key={i}><td>{JSON.stringify(m)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {section === 'codes' && (
          <>
            <div className="admin-stats">
              <article><p>PENDING CODES</p><strong>{pendingCodes.length}</strong></article>
              <article><p>NX PENDING</p><strong>{totalCodesNX.toLocaleString()}</strong></article>
              <article><p>MONEY</p><strong>${totalCodesDollars.toFixed(2)}</strong></article>
            </div>
            {loading ? <Empty text="Loading..." /> : pendingCodes.length === 0 ? <Empty text="No hay códigos de pago pendientes" /> : pendingCodes.map(code => (
              <div className="admin-row" key={code.id}>
                <div>
                  <b>{code.NickName}</b>
                  <span>{code.username} · {code.paymentCode} · {code.nxAmount.toLocaleString()} NX · ${code.dollarAmount.toFixed(2)}</span>
                </div>
                <div className="admin-actions">
                  <button className="admin-ok" disabled={approvingCode === code.id} onClick={() => handleApproveCode(code.id)}>
                    {approvingCode === code.id ? '...' : 'Aprobar'}
                  </button>
                  <button className="admin-no" disabled={rejectingCode === code.id} onClick={() => handleRejectCode(code.id)}>
                    {rejectingCode === code.id ? '...' : 'Rechazar'}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {section === 'payments' && (
          <>
            <div className="admin-stats">
              <article><p>PENDING</p><strong>{pendingCount}</strong></article>
              <article><p>NX</p><strong>{totalNX.toLocaleString()}</strong></article>
              <article><p>MONEY</p><strong>${totalDollars.toFixed(2)}</strong></article>
            </div>
            {loading ? <Empty text="Loading..." /> : payments.filter(p => p.status === 'pending').length === 0 ? <Empty text="No hay solicitudes pendientes" /> : payments.filter(p => p.status === 'pending').map(payment => (
              <div className="admin-row" key={payment.id}>
                <div>
                  <b>{payment.NickName}</b>
                  <span>{payment.username} · {payment.nxAmount.toLocaleString()} NX · ${payment.dollarAmount.toFixed(2)}</span>
                </div>
                <div className="admin-actions">
                  <button className="admin-ok" disabled={approving === payment.id} onClick={() => handleApprove(payment.id)}>Aprobar</button>
                  <button className="admin-no" disabled={rejecting === payment.id} onClick={() => handleReject(payment.id)}>Rechazar</button>
                </div>
              </div>
            ))}
          </>
        )}

        {section === 'refunds' && (
          <>
            <div className="admin-stats">
              <article><p>REFUNDS</p><strong>{pendingRefunds.length}</strong></article>
              <article><p>NX TO RETURN</p><strong>{totalRefundNX.toLocaleString()}</strong></article>
              <article><p>COMMISSION</p><strong>{totalRefundCommission.toLocaleString()}</strong></article>
            </div>
            {loading ? <Empty text="Loading..." /> : pendingRefunds.length === 0 ? <Empty text="No hay solicitudes de reembolso pendientes" /> : pendingRefunds.map(refund => (
              <div className="admin-row" key={refund.id}>
                <div>
                  <b>{refund.NickName}</b>
                  <span>{refund.productName} · pagar {refund.nxPaid} · devolver {refund.nxToRefund}</span>
                </div>
                <div className="admin-actions">
                  <button className="admin-ok" disabled={approvingRefund === refund.id} onClick={() => handleApproveRefund(refund.id)}>Aprobar</button>
                  <button className="admin-no" disabled={rejectingRefund === refund.id} onClick={() => handleRejectRefund(refund.id)}>Rechazar</button>
                </div>
              </div>
            ))}
          </>
        )}

        {section === 'tickets' && (
          <div className="admin-split">
            <div className="admin-panel">
              <h2><MessageSquare /> TICKETS</h2>
              {supportTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length === 0 ? <Empty text="No hay tickets pendientes" /> : (
                supportTickets.filter(t => t.status === 'open' || t.status === 'in-progress').map(ticket => (
                  <button key={ticket.id} className="admin-row" onClick={() => loadTicketDetail(ticket.id)}>
                    <div>
                      <b>{ticket.subject}</b>
                      <span>#{ticket.ticketNumber} · {ticket.status}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="admin-panel">
              {!selectedTicket ? <Empty text="Selecciona un ticket" /> : (
                <>
                  <h2>{selectedTicket.subject}</h2>
                  <p className="sub">#{selectedTicket.ticketNumber} · {selectedTicket.username}</p>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                    disabled={updatingStatus === selectedTicket.id}
                    className="w-full rounded bg-[#111] border border-[#343434] px-3 py-2"
                  >
                    <option value="open">Abierto</option>
                    <option value="in-progress">En progreso</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </select>
                  <div className="admin-thread">
                    {loadingTicket ? <Loader className="h-5 w-5 animate-spin" /> : ticketMessages.map(msg => (
                      <div key={msg.id} className={`admin-msg ${msg.senderType === 'admin' ? 'admin-msg-admin' : ''}`}>
                        <b>{msg.senderUsername}</b>
                        <p>{msg.message}</p>
                      </div>
                    ))}
                  </div>
                  {selectedTicket.status !== 'closed' && (
                    <div className="admin-compose">
                      <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendTicketMessage()} placeholder="Respuesta..." />
                      <button onClick={handleSendTicketMessage} disabled={sendingMessage}><Send className="h-4 w-4" /></button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
