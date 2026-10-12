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
  const [room, setRoom] = useState<any>({});
  const [roomLoading, setRoomLoading] = useState(false);
  const [clock, setClock] = useState(new Date());

  const READ_SECTIONS: Section[] = ['players', 'online', 'clans', 'shop', 'economy', 'reports', 'matches', 'logins', 'linked', 'announcements', 'maps', 'boosts'];

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!READ_SECTIONS.includes(section)) return;
    let live = true;
    setRoomLoading(true);
    const q = section === 'players' ? find : undefined;
    api.getAdminSection(section, q)
      .then((d) => { if (live) setRoom(d || {}); })
      .catch(() => { if (live) setRoom({}); })
      .finally(() => { if (live) setRoomLoading(false); });
    return () => { live = false; };
  }, [section]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [codeData, paymentData, refundData, ticketData, ov] = await Promise.all([
        api.getPendingPaymentCodes().catch(() => []),
        api.getPendingPayments().catch(() => []),
        api.getPendingRefunds().catch(() => []),
        api.getAllTickets().catch(() => []),
        api.getAdminOverview().catch(() => null),
      ]);
      setPaymentCodes(codeData || []);
      setPayments(paymentData || []);
      setRefunds(refundData || []);
      setSupportTickets(ticketData || []);
      setOverview(ov);
    } catch (error) {
      console.error('[ADMIN] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dt = (v: any) => (v ? new Date(v).toLocaleString('es') : '—');
  const Empty = ({ text }: { text: string }) => <div className="admin-empty">{text}</div>;
  const Grid = ({ rows, cols }: { rows: any[]; cols: { key: string; label: string; fmt?: (v: any, r: any) => any }[] }) => {
    if (roomLoading) return <Empty text="Leyendo SQL..." />;
    if (!rows?.length) return <Empty text="Sin filas en esta consulta (solo lectura)." />;
    return (
      <table className="admin-table">
        <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? r.oidUser ?? r.ProductID ?? r.MapID ?? r.discord_id ?? i}>
              {cols.map((c) => <td key={c.key}>{c.fmt ? c.fmt(r[c.key], r) : (r[c.key] ?? '—')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
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
            <div className="admin-toolbar">
              <h1>PLAYERS</h1>
              <button className="admin-chip" onClick={() => {
                setRoomLoading(true);
                api.getAdminSection('players', find).then(setRoom).catch(() => setRoom({})).finally(() => setRoomLoading(false));
              }}>Search Find</button>
            </div>
            <p className="sub">CBT_User — nick, EXP, kills, last login. Search uses Find in the sidebar.</p>
            <Grid rows={room.data} cols={[
              { key: 'NickName', label: 'NICK' },
              { key: 'username', label: 'ACCOUNT' },
              { key: 'Exp', label: 'EXP' },
              { key: 'kills', label: 'KILLS' },
              { key: 'wins', label: 'WINS' },
              { key: 'Status', label: 'STATUS', fmt: (v) => (v === 1 ? 'ONLINE' : 'OFFLINE') },
              { key: 'lastLoginDate', label: 'LAST LOGIN', fmt: dt },
            ]} />
          </div>
        )}

        {section === 'online' && (
          <div className="admin-panel">
            <div className="admin-toolbar">
              <h1>ONLINE</h1>
              <span className="admin-chip">{room.data?.length || 0} Status=1</span>
            </div>
            <p className="sub">{room.source}{room.concurrent ? ` · CCU ${room.concurrent.Total_UserCnt} @ ${dt(room.concurrent.CreateDate)}` : ''}</p>
            <Grid rows={room.data} cols={[
              { key: 'NickName', label: 'NICK' },
              { key: 'username', label: 'ACCOUNT' },
              { key: 'kills', label: 'KILLS' },
              { key: 'Exp', label: 'EXP' },
              { key: 'lastLoginDate', label: 'LOGIN', fmt: dt },
            ]} />
          </div>
        )}

        {section === 'clans' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>CLANS</h1><span className="admin-chip">{room.source}</span></div>
            <Grid rows={room.data} cols={[
              { key: 'strName', label: 'CLAN' },
              { key: 'strID', label: 'TAG' },
              { key: 'dn_strCharacterName_master', label: 'MASTER' },
              { key: 'dn_n4TotalRegularMember', label: 'MEMBERS' },
              { key: 'dateCreated', label: 'CREATED', fmt: dt },
              { key: 'strNotice', label: 'NOTICE' },
            ]} />
          </div>
        )}

        {section === 'shop' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>SHOP</h1><span className="admin-chip">{room.source}</span></div>
            <Grid rows={room.data} cols={[
              { key: 'ProductID', label: 'ID' },
              { key: 'ProductName', label: 'ITEM' },
              { key: 'Price', label: 'PRICE' },
              { key: 'SalePrice', label: 'SALE' },
              { key: 'BonusGP', label: 'GP' },
              { key: 'ShopView', label: 'VIEW' },
            ]} />
          </div>
        )}

        {section === 'economy' && (
          <div>
            <div className="admin-stats">
              <article><p>PENDING CODES</p><strong>{room.pendingCodes ?? pendingCodes.length}</strong></article>
              <article><p>PENDING REFUNDS</p><strong>{room.pendingRefunds ?? pendingRefunds.length}</strong></article>
              <article><p>NX WALLETS</p><strong>{room.nxAccounts ?? 0}</strong></article>
              <article><p>NX TOTAL</p><strong>{Number(room.nxTotal || 0).toLocaleString()}</strong></article>
            </div>
            <div className="admin-quick">
              <button onClick={() => setSection('codes')}><div><strong>Payment codes</strong><small>combatarms_web.PaymentCodes</small></div><span>→</span></button>
              <button onClick={() => setSection('payments')}><div><strong>Recargas</strong><small>{pendingCount} pending</small></div><span>→</span></button>
              <button onClick={() => setSection('refunds')}><div><strong>Refunds</strong><small>combatarms_web.RefundRequests</small></div><span>→</span></button>
            </div>
            <div className="admin-panel">
              <h2>VISMS PURCHASE LOG</h2>
              <p className="sub">{room.source}</p>
              <Grid rows={room.purchases} cols={[
                { key: 'strNexonID', label: 'ACCOUNT' },
                { key: 'ProductNo', label: 'PRODUCT' },
                { key: 'TotalPrice', label: 'PRICE' },
                { key: 'IsGift', label: 'GIFT', fmt: (v) => (v ? 'YES' : '') },
                { key: 'RegDate', label: 'DATE', fmt: dt },
              ]} />
            </div>
          </div>
        )}

        {section === 'reports' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>REPORTS</h1><span className="admin-chip">{room.source}</span></div>
            <p className="sub">In-game reports, web reviews, punishments. Tickets remain in Tickets.</p>
            <h2>IN-GAME</h2>
            <Grid rows={room.ingame} cols={[
              { key: 'TargetNickName', label: 'TARGET' },
              { key: 'Message', label: 'MESSAGE' },
              { key: 'MainCategory', label: 'CAT' },
              { key: 'RegDate', label: 'DATE', fmt: dt },
            ]} />
            <h2>PUNISHMENTS</h2>
            <Grid rows={room.punishments} cols={[
              { key: 'nickname', label: 'NICK' },
              { key: 'type', label: 'TYPE' },
              { key: 'reason', label: 'REASON' },
              { key: 'issuedByName', label: 'BY' },
              { key: 'createdAt', label: 'DATE', fmt: dt },
            ]} />
            <h2>REVIEWS</h2>
            <Grid rows={room.reviews} cols={[
              { key: 'reportSeq', label: 'SEQ' },
              { key: 'status', label: 'STATUS' },
              { key: 'note', label: 'NOTE' },
              { key: 'reviewedByName', label: 'REVIEWER' },
            ]} />
          </div>
        )}

        {section === 'matches' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>MATCHES</h1><span className="admin-chip">{room.source}</span></div>
            <p className="sub">Last rooms and player results from COMBATARMS_LOG.</p>
            <h2>ROOMS</h2>
            <Grid rows={room.rooms} cols={[
              { key: 'RoomName', label: 'ROOM' },
              { key: 'MapNo', label: 'MAP' },
              { key: 'GameType', label: 'TYPE' },
              { key: 'PlayerCnt', label: 'PLAYERS' },
              { key: 'StartDate', label: 'START', fmt: dt },
              { key: 'PlayTime', label: 'SEC' },
            ]} />
            <h2>PLAYER RESULTS</h2>
            <Grid rows={room.games} cols={[
              { key: 'NickName', label: 'NICK' },
              { key: 'KillCnt', label: 'K' },
              { key: 'DeadCnt', label: 'D' },
              { key: 'MapNo', label: 'MAP' },
              { key: 'WinType', label: 'WIN' },
              { key: 'EndDate', label: 'END', fmt: dt },
            ]} />
          </div>
        )}

        {section === 'logins' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>LOGINS</h1><span className="admin-chip">{room.source}</span></div>
            <Grid rows={room.data} cols={[
              { key: 'NickName', label: 'NICK' },
              { key: 'username', label: 'ACCOUNT' },
              { key: 'IP', label: 'IP' },
              { key: 'LoginDate', label: 'LOGIN', fmt: dt },
              { key: 'LogoutDate', label: 'LOGOUT', fmt: dt },
              { key: 'LobbyServerNo', label: 'LOBBY' },
            ]} />
            <h2>LAST HARDWARE</h2>
            <Grid rows={room.hardware} cols={[
              { key: 'oiduser', label: 'OID' },
              { key: 'MacAddress', label: 'MAC' },
              { key: 'LastLoginDate', label: 'DATE', fmt: dt },
            ]} />
          </div>
        )}

        {section === 'linked' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>LINKED ACCOUNTS</h1><span className="admin-chip">{room.source}</span></div>
            <h2>DISCORD</h2>
            <Grid rows={room.discord} cols={[
              { key: 'NickName', label: 'NICK' },
              { key: 'username', label: 'ACCOUNT' },
              { key: 'discord_id', label: 'DISCORD' },
              { key: 'data_vinculo', label: 'LINKED', fmt: dt },
            ]} />
            <h2>2FA ENABLED</h2>
            <Grid rows={room.twofa} cols={[
              { key: 'userId', label: 'USER' },
              { key: 'version', label: 'VER' },
              { key: 'enabledAt', label: 'SINCE', fmt: dt },
            ]} />
            <h2>PARTNER</h2>
            <Grid rows={room.partners} cols={[
              { key: 'oiduser', label: 'OID' },
              { key: 'PartnerCode', label: 'CODE' },
              { key: 'RegDate', label: 'DATE', fmt: dt },
            ]} />
          </div>
        )}

        {section === 'announcements' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>ANNOUNCEMENTS</h1><span className="admin-chip">{room.source}</span></div>
            <p className="sub">In-game advertise ticker. Read only — not edited from the web.</p>
            <Grid rows={room.ticker} cols={[
              { key: 'ADMessageNo', label: '#' },
              { key: 'ADMessage', label: 'MESSAGE' },
              { key: 'Enable', label: 'ON' },
              { key: 'ADURL', label: 'URL' },
            ]} />
            <h2>MESSAGE SETS</h2>
            <Grid rows={room.messages} cols={[
              { key: 'Message', label: 'MESSAGE' },
              { key: 'Enable', label: 'ON' },
              { key: 'ViewDate', label: 'DATE', fmt: dt },
            ]} />
          </div>
        )}

        {section === 'maps' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>MAPS</h1><span className="admin-chip">{room.source}</span></div>
            <h2>OPEN ROTATION</h2>
            <Grid rows={room.open} cols={[
              { key: 'MapName', label: 'MAP' },
              { key: 'ModeName', label: 'MODE' },
              { key: 'Enable', label: 'ON' },
              { key: 'IsOfficial', label: 'OFFICIAL' },
              { key: 'ClearanceLevel', label: 'LVL' },
            ]} />
            <h2>ALL MAPS</h2>
            <Grid rows={room.maps} cols={[
              { key: 'MapID', label: 'ID' },
              { key: 'Name', label: 'NAME' },
            ]} />
          </div>
        )}

        {section === 'boosts' && (
          <div className="admin-panel">
            <div className="admin-toolbar"><h1>BOOSTS</h1><span className="admin-chip">{room.source}</span></div>
            <p className="sub">EXP/GP events and hottime. Read only.</p>
            <h2>EXP / GP</h2>
            <Grid rows={room.events} cols={[
              { key: 'EventID', label: 'ID' },
              { key: 'EXPRate', label: 'EXP' },
              { key: 'GPRate', label: 'GP' },
              { key: 'Enable', label: 'ON' },
              { key: 'BeginTime', label: 'START', fmt: dt },
              { key: 'EndTime', label: 'END', fmt: dt },
              { key: 'description', label: 'DESC' },
            ]} />
            <h2>HOTTIME</h2>
            <Grid rows={room.hottime} cols={[
              { key: 'EventID', label: 'ID' },
              { key: 'Enable', label: 'ON' },
              { key: 'DurationHour', label: 'HOURS' },
              { key: 'BeginTime', label: 'START', fmt: dt },
              { key: 'EndTime', label: 'END', fmt: dt },
              { key: 'Description', label: 'DESC' },
            ]} />
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
