import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PageId } from '@/components/Layout';
import { rankIcon } from '@/lib/ranks';
import AdminPlayerAccount from '@/components/AdminPlayerAccount';
import AdminClanProfile from '@/components/AdminClanProfile';
import {
  XCircle, Loader, RotateCcw, MessageSquare, Send,
  LayoutDashboard, Users, Radio, Shield, Store, Landmark, FileBarChart, Swords, LogIn,
  Link2, Megaphone, Map, Zap, ArrowLeft, Ticket, KeyRound, CreditCard, ExternalLink, ChevronRight, Search, Activity, TrendingUp, Wallet, ShoppingBag, Coins
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
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'CONTROL ROOM' },
  { id: 'players', label: 'Players', icon: Users, group: 'CONTROL ROOM' },
  { id: 'matches', label: 'Matches', icon: Swords, group: 'CONTROL ROOM' },
  { id: 'online', label: 'Online', icon: Radio, group: 'CONTROL ROOM' },
  { id: 'logins', label: 'Logins', icon: LogIn, group: 'TRACKING' },
  { id: 'linked', label: 'Linked accounts', icon: Link2, group: 'TRACKING' },
  { id: 'reports', label: 'Player reports', icon: FileBarChart, group: 'TRACKING' },
  { id: 'clans', label: 'Clans', icon: Shield, group: 'TRACKING' },
  { id: 'economy', label: 'Economy', icon: Landmark, group: 'TRACKING' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, group: 'GAME CONTROL' },
  { id: 'shop', label: 'Shop', icon: Store, group: 'GAME CONTROL' },
  { id: 'maps', label: 'Maps & modes', icon: Map, group: 'GAME CONTROL' },
  { id: 'boosts', label: 'EXP & GP boosts', icon: Zap, group: 'EVENTS' },
  { id: 'codes', label: 'Payment codes', icon: KeyRound, group: 'OPERATIONS' },
  { id: 'payments', label: 'Recargas', icon: CreditCard, group: 'OPERATIONS' },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw, group: 'OPERATIONS' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, group: 'OPERATIONS' },
];

const ISO3: Record<string, string> = {
  AFG:'af',ALB:'al',DZA:'dz',AND:'ad',AGO:'ao',ARG:'ar',ARM:'am',AUS:'au',AUT:'at',AZE:'az',
  BHS:'bs',BHR:'bh',BGD:'bd',BLR:'by',BEL:'be',BLZ:'bz',BOL:'bo',BIH:'ba',BRA:'br',BRN:'bn',
  BGR:'bg',KHM:'kh',CAN:'ca',CHL:'cl',CHN:'cn',COL:'co',CRI:'cr',HRV:'hr',CUB:'cu',CYP:'cy',
  CZE:'cz',DNK:'dk',DOM:'do',ECU:'ec',EGY:'eg',SLV:'sv',EST:'ee',FIN:'fi',FRA:'fr',GEO:'ge',
  DEU:'de',GRC:'gr',GTM:'gt',HND:'hn',HKG:'hk',HUN:'hu',ISL:'is',IND:'in',IDN:'id',IRN:'ir',
  IRQ:'iq',IRL:'ie',ISR:'il',ITA:'it',JAM:'jm',JPN:'jp',JOR:'jo',KAZ:'kz',KEN:'ke',KOR:'kr',
  KWT:'kw',LVA:'lv',LBN:'lb',LBY:'ly',LTU:'lt',LUX:'lu',MYS:'my',MEX:'mx',MDA:'md',MNG:'mn',
  MNE:'me',MAR:'ma',NPL:'np',NLD:'nl',NZL:'nz',NIC:'ni',NGA:'ng',NOR:'no',OMN:'om',PAK:'pk',
  PAN:'pa',PRY:'py',PER:'pe',PHL:'ph',POL:'pl',PRT:'pt',PRI:'pr',QAT:'qa',ROU:'ro',RUS:'ru',
  SAU:'sa',SRB:'rs',SGP:'sg',SVK:'sk',SVN:'si',ZAF:'za',ESP:'es',LKA:'lk',SWE:'se',CHE:'ch',
  SYR:'sy',TWN:'tw',THA:'th',TTO:'tt',TUN:'tn',TUR:'tr',UKR:'ua',ARE:'ae',GBR:'gb',USA:'us',
  URY:'uy',UZB:'uz',VEN:'ve',VIE:'vn',VNM:'vn',YEM:'ye'
};

function flagCode(code?: string, nation?: string) {
  const raw = String(code || nation || '').trim();
  if (raw.length === 2) return raw.toLowerCase();
  return ISO3[raw.toUpperCase()] || '';
}

function hourLabel(t: string) {
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:00`;
}

function SpendChart({ points, color = '#df8104' }: { points: { t: string; peak: number }[]; color?: string }) {
  if (!points?.length) return <div className="ol-empty">No spending in this range.</div>;
  const w = 960;
  const h = 260;
  const pad = { l: 56, r: 18, t: 18, b: 38 };
  const raw = Math.max(1, ...points.map((p) => Number(p.peak || 0)));
  const max = raw <= 4 ? raw : Math.ceil(raw / 4) * 4;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const coords = points.map((p, i) => {
    const x = pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = pad.t + innerH - (Number(p.peak || 0) / max) * innerH;
    return { x, y, p };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const last = coords[coords.length - 1];
  const ticks = [0, Math.round(max / 2), max];
  const step = points.length > 20 ? 6 : points.length > 10 ? 4 : 1;
  const labels = coords.filter((_, i) => i === 0 || i === coords.length - 1 || i % step === 0);
  const fmt = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  return (
    <svg className="ol-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {ticks.map((tick) => {
        const y = pad.t + innerH - (tick / max) * innerH;
        return (
          <g key={tick}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#262626" strokeWidth="1" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fill="#666" fontSize="11">{fmt(tick)}</text>
          </g>
        );
      })}
      <polygon points={`${pad.l},${pad.t + innerH} ${line} ${w - pad.r},${pad.t + innerH}`} fill="url(#spFill)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.4" />
      {last && <circle cx={last.x} cy={last.y} r="4.5" fill={color} />}
      <defs>
        <linearGradient id="spFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {labels.map((c, i) => (
        <text key={i} x={c.x} y={h - 10} textAnchor="middle" fill="#777" fontSize="11">
          {String(c.p.t).slice(5, 10)}
        </text>
      ))}
    </svg>
  );
}

function PeakChart({ points }: { points: { t: string; peak: number }[] }) {
  if (!points?.length) return <div className="ol-empty">No CCU samples in the last 48 hours.</div>;
  const w = 960;
  const h = 240;
  const pad = { l: 40, r: 18, t: 18, b: 38 };
  const raw = Math.max(1, ...points.map((p) => Number(p.peak || 0)));
  const max = raw <= 4 ? raw : Math.ceil(raw / 2) * 2;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const coords = points.map((p, i) => {
    const x = pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = pad.t + innerH - (Number(p.peak || 0) / max) * innerH;
    return { x, y, p };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const last = coords[coords.length - 1];
  const tickCount = Math.min(5, max + 1);
  const ticks = Array.from({ length: tickCount }, (_, i) => Math.round((max * i) / (tickCount - 1)));
  const labels = coords.filter((_, i) => i === 0 || i === coords.length - 1 || i % 8 === 0);
  return (
    <svg className="ol-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {ticks.map((tick) => {
        const y = pad.t + innerH - (tick / max) * innerH;
        return (
          <g key={tick}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#262626" strokeWidth="1" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fill="#666" fontSize="11">{tick}</text>
          </g>
        );
      })}
      <polygon
        points={`${pad.l},${pad.t + innerH} ${line} ${w - pad.r},${pad.t + innerH}`}
        fill="url(#olFill)"
      />
      <polyline points={line} fill="none" stroke="#df8104" strokeWidth="2.4" />
      {last && <circle cx={last.x} cy={last.y} r="4.5" fill="#df8104" />}
      <defs>
        <linearGradient id="olFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#df8104" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#df8104" stopOpacity="0" />
        </linearGradient>
      </defs>
      {labels.map((c, i) => (
        <text key={i} x={c.x} y={h - 10} textAnchor="middle" fill="#777" fontSize="11">
          {hourLabel(c.p.t)}
        </text>
      ))}
    </svg>
  );
}

function stamp(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function stampSec(v: any) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

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
  const [playerQ, setPlayerQ] = useState('');
  const [playerRole, setPlayerRole] = useState('all');
  const [playerStatus, setPlayerStatus] = useState('all');
  const [playerPage, setPlayerPage] = useState(1);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [matchQ, setMatchQ] = useState('');
  const [matchMode, setMatchMode] = useState('all');
  const [matchDays, setMatchDays] = useState('7');
  const [matchPage, setMatchPage] = useState(1);
  const [openMatch, setOpenMatch] = useState<any>(null);
  const [openPlayers, setOpenPlayers] = useState<any[]>([]);
  const [loginQ, setLoginQ] = useState('');
  const [loginDays, setLoginDays] = useState('7');
  const [loginPage, setLoginPage] = useState(1);
  const [clanId, setClanId] = useState<number | null>(null);
  const [economyDays, setEconomyDays] = useState('30');
  const [economyCur, setEconomyCur] = useState<'gp' | 'nx'>('gp');

  const READ_SECTIONS: Section[] = ['players', 'online', 'clans', 'shop', 'economy', 'reports', 'matches', 'logins', 'linked', 'announcements', 'maps', 'boosts'];

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadPlayers = (page = playerPage) => {
    setRoomLoading(true);
    api.getAdminSection('players', { q: playerQ, role: playerRole, status: playerStatus, page })
      .then(setRoom)
      .catch(() => setRoom({}))
      .finally(() => setRoomLoading(false));
  };

  const loadMatches = (page = matchPage) => {
    setRoomLoading(true);
    api.getAdminSection('matches', { q: matchQ, mode: matchMode, days: matchDays, page })
      .then(setRoom)
      .catch(() => setRoom({}))
      .finally(() => setRoomLoading(false));
  };

  const loadLogins = (page = loginPage) => {
    setRoomLoading(true);
    api.getAdminSection('logins', { q: loginQ, days: loginDays, page })
      .then(setRoom)
      .catch(() => setRoom({}))
      .finally(() => setRoomLoading(false));
  };

  useEffect(() => {
    if (section !== 'players') setPlayerId(null);
    if (section !== 'clans') setClanId(null);
    if (section === 'players') {
      if (!playerId) loadPlayers(playerPage);
      return;
    }
    if (section === 'matches') {
      loadMatches(matchPage);
      return;
    }
    if (section === 'logins') {
      loadLogins(loginPage);
      return;
    }
    if (section === 'online') {
      let live = true;
      let first = true;
      const tick = () => {
        if (first) setRoomLoading(true);
        api.getAdminSection('online')
          .then((d) => { if (live) setRoom(d || {}); })
          .catch(() => { if (live && first) setRoom({}); })
          .finally(() => {
            if (live && first) setRoomLoading(false);
            first = false;
          });
      };
      tick();
      const id = setInterval(tick, 15000);
      return () => { live = false; clearInterval(id); };
    }
    if (section === 'economy') {
      let live = true;
      setRoomLoading(true);
      api.getAdminSection('economy', { days: economyDays })
        .then((d) => { if (live) setRoom(d || {}); })
        .catch(() => { if (live) setRoom({}); })
        .finally(() => { if (live) setRoomLoading(false); });
      return () => { live = false; };
    }
    if (section === 'clans') {
      if (clanId) return;
      let live = true;
      setRoomLoading(true);
      api.getAdminSection('clans')
        .then((d) => { if (live) setRoom(d || {}); })
        .catch(() => { if (live) setRoom({}); })
        .finally(() => { if (live) setRoomLoading(false); });
      return () => { live = false; };
    }
    if (!READ_SECTIONS.includes(section)) return;
    let live = true;
    setRoomLoading(true);
    api.getAdminSection(section)
      .then((d) => { if (live) setRoom(d || {}); })
      .catch(() => { if (live) setRoom({}); })
      .finally(() => { if (live) setRoomLoading(false); });
    return () => { live = false; };
  }, [section, playerPage, matchPage, loginPage, clanId, economyDays]);

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
            <small>ADMIN CONSOLE</small>
          </div>
        </div>
        <div className="admin-find-wrap">
          <Search />
          <input className="admin-find" placeholder="Find a section..." value={find} onChange={(e) => setFind(e.target.value)} />
        </div>
        <nav className="admin-nav">
          {groups.map(group => (
            <div key={group}>
              <p>{group}</p>
              {NAV.filter(n => n.group === group && n.label.toLowerCase().includes(q)).map(item => {
                const Icon = item.icon;
                const on = section === item.id;
                return (
                  <button key={item.id} className={on ? 'admin-on' : ''} onClick={() => { setSection(item.id); if (item.id === 'players') setPlayerId(null); if (item.id === 'clans') setClanId(null); }}>
                    <Icon />
                    <span>{item.label}</span>
                    {on && <ChevronRight />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <button className="admin-back" onClick={() => onNavigate?.('home')}>
          <span>Back to website</span>
          <small>Combat Arms Classic</small>
        </button>
      </aside>

      <div className="admin-main">
        <div className="admin-head">
          <div className="admin-crumb">
            Administration <span>›</span> <b>{NAV.find((n) => n.id === section)?.label || section}</b>
          </div>
          <div className="admin-head-actions">
            <button className="admin-viewweb" onClick={() => onNavigate?.('home')}>View website <ExternalLink className="ml-1 inline h-3 w-3" /></button>
            <div className="admin-who">
              <span className="admin-avatar">{(profile.username || 'A').slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{profile.username}</strong>
                <small>ADMINISTRATOR</small>
              </div>
            </div>
          </div>
        </div>
        <div className="admin-body">

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

        {section === 'players' && playerId && (
          <AdminPlayerAccount id={playerId} onBack={() => setPlayerId(null)} />
        )}

        {section === 'players' && !playerId && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Users /></div>
              <div>
                <p className="eyebrow">CONTROL ROOM / COMBAT ARMS</p>
                <h1>PLAYERS</h1>
                <p>Search accounts by login, nickname, email or account number</p>
              </div>
            </div>
            <form className="pl-filters" onSubmit={(e) => { e.preventDefault(); setPlayerPage(1); loadPlayers(1); }}>
              <input
                value={playerQ}
                onChange={(e) => setPlayerQ(e.target.value)}
                placeholder="Login, nickname, email or #id"
              />
              <select value={playerRole} onChange={(e) => setPlayerRole(e.target.value)}>
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="gm">GM</option>
                <option value="player">Player</option>
              </select>
              <select value={playerStatus} onChange={(e) => setPlayerStatus(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="online">Online</option>
                <option value="banned">Banned</option>
              </select>
              <button className="pl-apply" type="submit">Apply</button>
            </form>
            <div className="pl-meta">
              <h2>{room.total ?? 0} ACCOUNTS</h2>
              <span>Account number • newest first &nbsp;&nbsp; Showing {room.showingFrom || 0}–{room.showingTo || 0}</span>
            </div>
            {roomLoading ? <Empty text="Leyendo cuentas..." /> : (
              <table className="pl-table">
                <thead>
                  <tr>
                    <th>PLAYER</th>
                    <th>EMAIL</th>
                    <th>ROLE</th>
                    <th>FLAG</th>
                    <th>REGISTERED</th>
                    <th>LAST GAME LOGIN</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {(room.data || []).length === 0 ? (
                    <tr><td colSpan={7} style={{ color: '#777', padding: 28 }}>No accounts match this search.</td></tr>
                  ) : room.data.map((p: any) => {
                    const code = flagCode(p.CountryCode, p.NationCode);
                    const superAdmin = p.username === 'villauribe12' || String(p.webRole || '').toLowerCase() === 'superadmin';
                    const isAdmin = superAdmin || Boolean(p.webRole);
                    return (
                      <tr key={p.id} className="pl-row" onClick={() => setPlayerId(p.id)}>
                        <td>
                          <div className="pl-player">
                            <img src={rankIcon({ exp: p.Exp, UserType: p.UserType })} alt="" onError={(e) => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                            <div>
                              <b>{p.isGM ? `[GM]${p.NickName || p.username}` : (p.NickName || p.username)}</b>
                              <small>{p.username}_ #{p.id}</small>
                            </div>
                          </div>
                        </td>
                        <td className="pl-mail">{p.email || '—'}</td>
                        <td>
                          <div className="pl-roles">
                            {superAdmin && <span className="pl-pill pl-pill-super">SUPERADMIN</span>}
                            {isAdmin && !superAdmin && <span className="pl-pill pl-pill-admin">ADMINISTRATOR</span>}
                            {p.isGM && <span className="pl-pill pl-pill-gm">GM</span>}
                            {!isAdmin && !p.isGM && <span className="pl-pill pl-pill-player">PLAYER</span>}
                          </div>
                        </td>
                        <td>
                          <div className="pl-flag">
                            {code ? <img src={`https://flagcdn.com/20x15/${code}.png`} alt="" /> : null}
                            <span>{p.CountryName || p.NationCode || '—'}</span>
                          </div>
                        </td>
                        <td>{stamp(p.CreateDate)}</td>
                        <td>{stamp(p.lastLoginDate)}</td>
                        <td>
                          <span className={p.accountStatus === 'banned' ? 'pl-status-ban' : 'pl-status'}>
                            {p.accountStatus === 'banned' ? 'BANNED' : 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {(room.total || 0) > (room.limit || 25) && (
              <div className="pl-pager">
                <button disabled={playerPage <= 1} onClick={() => setPlayerPage((n) => Math.max(1, n - 1))}>Prev</button>
                <button disabled={(room.showingTo || 0) >= (room.total || 0)} onClick={() => setPlayerPage((n) => n + 1)}>Next</button>
              </div>
            )}
          </>
        )}

        {section === 'online' && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Radio /></div>
              <div>
                <p className="eyebrow">CONTROL ROOM / COMBAT ARMS</p>
                <h1>ONLINE</h1>
                <p>Players on the game servers. The chart refreshes every 15 seconds.</p>
              </div>
            </div>
            {roomLoading ? <Empty text="Leyendo jugadores conectados..." /> : (
              <>
                <div className="ol-kpis">
                  <article>
                    <p>ONLINE NOW</p>
                    <strong className="ol-green">{room.onlineNow ?? (room.data || []).length}</strong>
                    <Activity />
                    <small>AT {stampSec(room.sampledAt)} · live</small>
                  </article>
                  <article>
                    <p>PEAK TODAY</p>
                    <strong>{room.peakToday ?? 0}</strong>
                    <TrendingUp />
                  </article>
                  <article>
                    <p>PEAK, LAST 48 HOURS</p>
                    <strong className="ol-gold">{room.peak48 ?? 0}</strong>
                    <Users />
                  </article>
                </div>
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2>PEAK PER HOUR</h2>
                    <span className="pd-chip">Live · last 48 hours</span>
                  </div>
                  <p className="ol-peak-label">{room.peak48 ?? 0} <small>players peak</small></p>
                  <PeakChart points={room.hourly || []} />
                </section>
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2>CONNECTED PLAYERS</h2>
                    <span className="pd-chip">{(room.data || []).length} ONLINE</span>
                  </div>
                  <p className="sub">Live accounts with Status = 1 in CBT_User.</p>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>PLAYER</th>
                        <th>ACCOUNT</th>
                        <th>EXP</th>
                        <th>LAST GAME LOGIN</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(room.data || []).length === 0 ? (
                        <tr><td colSpan={5} className="pd-empty">No players connected right now.</td></tr>
                      ) : room.data.map((p: any) => (
                        <tr
                          key={p.id}
                          className="pl-row"
                          onClick={() => { setSection('players'); setPlayerId(p.id); }}
                        >
                          <td>
                            <div className="pl-player">
                              <img src={rankIcon({ exp: p.Exp, UserType: p.UserType })} alt="" onError={(e) => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                              <div>
                                <b>{p.isGM ? `[GM]${p.NickName || p.username}` : (p.NickName || p.username)}</b>
                                <small>#{p.id}</small>
                              </div>
                            </div>
                          </td>
                          <td>{p.username}</td>
                          <td>{Number(p.Exp || 0).toLocaleString()}</td>
                          <td>{stamp(p.lastLoginDate)}</td>
                          <td><span className="pl-status">ONLINE</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        )}

        {section === 'clans' && clanId && (
          <AdminClanProfile
            id={clanId}
            onBack={() => setClanId(null)}
            onPlayer={(pid) => { setSection('players'); setPlayerId(pid); }}
          />
        )}

        {section === 'clans' && !clanId && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Shield /></div>
              <div>
                <p className="eyebrow">TRACKING / COMBAT ARMS</p>
                <h1>CLANS</h1>
                <p>Every clan made with the in-game clan manager</p>
              </div>
            </div>
            <div className="pl-meta">
              <h2>{room.total ?? (room.data || []).length} CLANS</h2>
            </div>
            {roomLoading ? <Empty text="Leyendo clanes..." /> : (
              <table className="pl-table">
                <thead>
                  <tr>
                    <th>CLAN</th>
                    <th>LEADER</th>
                    <th>MEMBERS</th>
                    <th>APPLICATIONS</th>
                    <th>WINS / LOSSES</th>
                    <th>CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {(room.data || []).length === 0 ? (
                    <tr><td colSpan={6} className="pd-empty">No clans found.</td></tr>
                  ) : room.data.map((g: any) => (
                    <tr key={g.oidGuild} className="pl-row" onClick={() => setClanId(g.oidGuild)}>
                      <td className="login-nick">{g.strName}</td>
                      <td className="login-nick">{g.dn_strCharacterName_master}</td>
                      <td>{g.members}</td>
                      <td>{g.applications ? g.applications : '—'}</td>
                      <td>{g.wins || 0} / {g.losses || 0}</td>
                      <td className="pd-time">{stampSec(g.dateCreated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
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
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Landmark /></div>
              <div>
                <p className="eyebrow">TRACKING / COMBAT ARMS</p>
                <h1>ECONOMY</h1>
                <p>Shop spending and the money in players' hands.</p>
              </div>
            </div>
            <div className="eco-tabs">
              {[{ id: '7', label: 'Last 7 days' }, { id: '30', label: 'Last 30 days' }, { id: '90', label: 'Last 90 days' }].map((tab) => (
                <button key={tab.id} className={economyDays === tab.id ? 'on' : ''} onClick={() => setEconomyDays(tab.id)}>{tab.label}</button>
              ))}
            </div>
            {roomLoading ? <Empty text="Leyendo economía..." /> : (
              <>
                <div className="ol-kpis">
                  <article>
                    <p>PURCHASES</p>
                    <strong>{Number(room.purchases || 0).toLocaleString()}</strong>
                    <ShoppingBag />
                  </article>
                  <article>
                    <p>GP SPENT</p>
                    <strong className="ol-gold">{Number(room.gpSpent || 0).toLocaleString()}</strong>
                    <Coins />
                  </article>
                  <article>
                    <p>NX SPENT IN THE SHOP</p>
                    <strong className="eco-nx">{Number(room.nxSpent || 0).toLocaleString()}</strong>
                    <Wallet />
                  </article>
                  <article>
                    <p>NX ORDERS (BILLING)</p>
                    <strong>{Number(room.nxOrders || 0).toLocaleString()}</strong>
                    <CreditCard />
                    <small>{Number(room.nxBilling || 0).toLocaleString()} NX · {room.nxGifts || 0} gifts</small>
                  </article>
                  <article>
                    <p>NX HELD BY PLAYERS</p>
                    <strong>{Number(room.nxHeld || 0).toLocaleString()}</strong>
                    <Wallet />
                    <small>{room.nxAccounts || 0} players with NX</small>
                  </article>
                  <article>
                    <p>GP HELD BY PLAYERS</p>
                    <strong>{Number(room.gpHeld || 0).toLocaleString()}</strong>
                    <Coins />
                  </article>
                </div>
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2>SPENDING PER DAY</h2>
                    <div className="eco-cur">
                      <button className={economyCur === 'gp' ? 'on' : ''} onClick={() => setEconomyCur('gp')}>GP</button>
                      <button className={economyCur === 'nx' ? 'on nx' : ''} onClick={() => setEconomyCur('nx')}>NX</button>
                    </div>
                  </div>
                  <p className="ol-peak-label">
                    {Number((room.daily || []).slice(-1)[0]?.[economyCur] || 0).toLocaleString()}
                    <small> {economyCur === 'gp' ? 'GP' : 'NX'} last day</small>
                  </p>
                  <SpendChart
                    color={economyCur === 'gp' ? '#df8104' : '#7dcea0'}
                    points={(room.daily || []).map((d: any) => ({ t: d.t || d.d, peak: Number(d[economyCur] || 0) }))}
                  />
                </section>
              </>
            )}
          </>
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
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Swords /></div>
              <div>
                <p className="eyebrow">CONTROL ROOM / COMBAT ARMS</p>
                <h1>MATCHES</h1>
                <p>Every match the game servers finished, with its players. Game server time.</p>
              </div>
            </div>
            <form className="pl-filters" onSubmit={(e) => { e.preventDefault(); setMatchPage(1); loadMatches(1); }}>
              <input
                value={matchQ}
                onChange={(e) => setMatchQ(e.target.value)}
                placeholder="Player: #id, login or nickname"
              />
              <select value={matchMode} onChange={(e) => setMatchMode(e.target.value)}>
                <option value="all">All modes</option>
                {(room.modes || []).map((m: any) => (
                  <option key={m.Mode} value={m.Mode}>{m.Name}</option>
                ))}
              </select>
              <select value={matchDays} onChange={(e) => setMatchDays(e.target.value)}>
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="0">All time</option>
              </select>
              <button className="pl-apply" type="submit">Apply</button>
            </form>
            <div className="pl-meta">
              <h2>{room.total ?? 0} MATCHES</h2>
              <span>Newest first &nbsp;&nbsp; Showing {room.showingFrom || 0}–{room.showingTo || 0}</span>
            </div>
            {roomLoading ? <Empty text="Leyendo partidas..." /> : (
              <table className="pl-table">
                <thead>
                  <tr>
                    <th>ENDED</th>
                    <th>MODE</th>
                    <th>MAP</th>
                    <th>TYPE</th>
                    <th>PLAYERS</th>
                    <th>WINNER</th>
                    <th>LENGTH</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(room.data || []).length === 0 ? (
                    <tr><td colSpan={8} style={{ color: '#777', padding: 28 }}>No matches in this range.</td></tr>
                  ) : room.data.map((m: any) => (
                    <tr key={m.id}>
                      <td className="pd-time">{stamp(m.EndDate)}</td>
                      <td>{m.ModeName}</td>
                      <td>{m.MapName}</td>
                      <td>{m.TypeName}</td>
                      <td>{m.PlayerCnt}</td>
                      <td><span className={m.Winner === '—' ? 'pd-left' : 'pd-win'}>{m.Winner}</span></td>
                      <td>{m.Length}</td>
                      <td>
                        <button className="match-open" onClick={() => {
                          setOpenMatch(m);
                          api.getAdminMatchRoom(m.RoomKeyNo).then((d) => setOpenPlayers(d.players || [])).catch(() => setOpenPlayers([]));
                        }}>Open</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(room.total || 0) > (room.limit || 25) && (
              <div className="pl-pager">
                <button disabled={matchPage <= 1} onClick={() => setMatchPage((n) => Math.max(1, n - 1))}>Prev</button>
                <button disabled={(room.showingTo || 0) >= (room.total || 0)} onClick={() => setMatchPage((n) => n + 1)}>Next</button>
              </div>
            )}
            {openMatch && (
              <div className="pd-card" style={{ marginTop: 16 }}>
                <div className="pd-card-top">
                  <h2><Swords /> {openMatch.ModeName} · {openMatch.MapName}</h2>
                  <button className="match-open" onClick={() => { setOpenMatch(null); setOpenPlayers([]); }}>Close</button>
                </div>
                <p className="sub">{stamp(openMatch.EndDate)} · {openMatch.Winner} · {openMatch.Length}</p>
                <table className="pd-table">
                  <thead><tr><th>PLAYER</th><th>TEAM</th><th>K / D / A</th></tr></thead>
                  <tbody>
                    {openPlayers.length === 0 ? (
                      <tr><td colSpan={3} className="pd-empty">No player rows for this room.</td></tr>
                    ) : openPlayers.map((p: any) => (
                      <tr key={p.oidUser}>
                        <td>{p.NickName}</td>
                        <td>{p.TeamType === 1 ? 'ALPHA' : p.TeamType === 2 ? 'BRAVO' : p.TeamType}</td>
                        <td>{p.KillCnt || 0} / {p.DeadCnt || 0} / {p.Assist || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {section === 'logins' && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><LogIn /></div>
              <div>
                <p className="eyebrow">TRACKING / COMBAT ARMS</p>
                <h1>LOGINS</h1>
                <p>Lobby sessions, written when a player leaves the lobby (so someone online now appears after they log out).</p>
              </div>
            </div>
            <form className="pl-filters" onSubmit={(e) => { e.preventDefault(); setLoginPage(1); loadLogins(1); }}>
              <input
                value={loginQ}
                onChange={(e) => setLoginQ(e.target.value)}
                placeholder="Player: #id, login or nickname"
              />
              <select value={loginDays} onChange={(e) => setLoginDays(e.target.value)}>
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="0">All time</option>
              </select>
              <button className="pl-apply" type="submit">Apply</button>
            </form>
            <div className="pl-meta">
              <h2>{Number(room.total || 0).toLocaleString()} SESSIONS</h2>
              <span>Newest login first &nbsp;&nbsp; Showing {room.showingFrom || 0}–{room.showingTo || 0}</span>
            </div>
            {roomLoading ? <Empty text="Leyendo sesiones..." /> : (
              <table className="pl-table">
                <thead>
                  <tr>
                    <th>PLAYER</th>
                    <th>ENTERED LOBBY</th>
                    <th>LEFT</th>
                    <th>STAYED</th>
                    <th>HOW IT ENDED</th>
                  </tr>
                </thead>
                <tbody>
                  {(room.data || []).length === 0 ? (
                    <tr><td colSpan={5} className="pd-empty">No lobby sessions in this range.</td></tr>
                  ) : room.data.map((row: any) => (
                    <tr key={row.id} className="pl-row" onClick={() => { setSection('players'); setPlayerId(row.oidUser); }}>
                      <td><span className="login-nick">{row.NickName || row.username}</span></td>
                      <td className="pd-time">{stampSec(row.LoginDate)}</td>
                      <td className="pd-time">{stampSec(row.LogoutDate)}</td>
                      <td>{row.stayed}</td>
                      <td>{row.ended}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(room.total || 0) > (room.limit || 25) && (
              <div className="pl-pager">
                <button disabled={loginPage <= 1} onClick={() => setLoginPage((n) => Math.max(1, n - 1))}>Prev</button>
                <button disabled={(room.showingTo || 0) >= (room.total || 0)} onClick={() => setLoginPage((n) => n + 1)}>Next</button>
              </div>
            )}
          </>
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
    </div>
  );
}
