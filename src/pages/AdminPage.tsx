import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { PageId } from '@/components/Layout';
import { rankIcon } from '@/lib/ranks';
import AdminPlayerAccount from '@/components/AdminPlayerAccount';
import AdminClanProfile from '@/components/AdminClanProfile';
import PageLoader from '@/components/PageLoader';
import EventsDesk from '@/components/EventsDesk';
import CouponCodesDesk from '@/components/CouponCodesDesk';
import InviteRequestsDesk from '@/components/InviteRequestsDesk';
import NoticeComposer from '@/components/NoticeComposer';
import {
  XCircle, Loader, RotateCcw, MessageSquare, Send,
  LayoutDashboard, Users, Radio, Shield, Store, Landmark, FileBarChart, Swords, LogIn, CalendarDays,
  Link2, Megaphone, Map, Zap, ArrowLeft, Ticket, KeyRound, CreditCard, ExternalLink, ChevronRight, Search, Activity, TrendingUp, Wallet, ShoppingBag, Coins, Flag, Check, Star, UserCog, Crown, History, X, Gift, UserPlus
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
  | 'codes' | 'coupons' | 'invites' | 'payments' | 'refunds' | 'tickets' | 'staff' | 'gm' | 'history' | 'events';

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard; group: string; ownerOnly?: boolean }[] = [
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
  { id: 'events', label: 'Eventos', icon: CalendarDays, group: 'EVENTS', ownerOnly: true },
  { id: 'coupons', label: 'Códigos promo', icon: Gift, group: 'EVENTS', ownerOnly: true },
  { id: 'invites', label: 'Invitaciones', icon: UserPlus, group: 'OPERATIONS', ownerOnly: true },
  { id: 'codes', label: 'Payment codes', icon: KeyRound, group: 'OPERATIONS', ownerOnly: true },
  { id: 'payments', label: 'Recargas', icon: CreditCard, group: 'OPERATIONS', ownerOnly: true },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw, group: 'OPERATIONS', ownerOnly: true },
  { id: 'tickets', label: 'Tickets', icon: Ticket, group: 'OPERATIONS' },
  { id: 'staff', label: 'Administración', icon: UserCog, group: 'OPERATIONS', ownerOnly: true },
  { id: 'gm', label: 'GM', icon: Crown, group: 'OPERATIONS' },
  { id: 'history', label: 'Historial', icon: History, group: 'OPERATIONS', ownerOnly: true },
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
  const [reportTab, setReportTab] = useState<'open' | 'handled' | 'dismissed' | 'all'>('open');
  const [openReport, setOpenReport] = useState<any>(null);
  const [shopQ, setShopQ] = useState('');
  const [mapLevel, setMapLevel] = useState<number | null>(null);
  const [staffQ, setStaffQ] = useState('');
  const [staffHits, setStaffHits] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffRoles, setStaffRoles] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleGm, setNewRoleGm] = useState(false);
  const [staffBusy, setStaffBusy] = useState(false);
  const [pickRole, setPickRole] = useState('ADMINISTRATOR');
  const [staffOpen, setStaffOpen] = useState<any>(null);
  const [staffDesk, setStaffDesk] = useState<any>(null);
  const [quotaInput, setQuotaInput] = useState('');
  const [gmDesk, setGmDesk] = useState<any>(null);
  const [gmQ, setGmQ] = useState('');
  const [gmHits, setGmHits] = useState<any[]>([]);
  const [gmAmount, setGmAmount] = useState('');
  const [giftHistory, setGiftHistory] = useState<any[]>([]);
  const [histQ, setHistQ] = useState('');
  const [navLoading, setNavLoading] = useState(true);
  const [navLeaving, setNavLeaving] = useState(false);
  const navTimer = useRef<ReturnType<typeof setTimeout>>();
  const navLeaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const READ_SECTIONS: Section[] = ['players', 'online', 'clans', 'shop', 'economy', 'reports', 'matches', 'logins', 'linked', 'announcements', 'maps', 'boosts'];

  const flashLoader = () => {
    setNavLeaving(false);
    setNavLoading(true);
    window.clearTimeout(navTimer.current);
    window.clearTimeout(navLeaveTimer.current);
  };

  const goSection = (id: Section) => {
    const item = NAV.find((n) => n.id === id);
    if (item?.ownerOnly && profile?.username !== 'villauribe12') return;
    flashLoader();
    setSection(id);
    if (id === 'players') setPlayerId(null);
    if (id === 'clans') setClanId(null);
  };

  const goPlayer = (id: number) => {
    flashLoader();
    setSection('players');
    setPlayerId(id);
  };

  useEffect(() => {
    if (!profile) return;
    loadData();
  }, [profile, section]);

  useEffect(() => {
    const locked = NAV.find((n) => n.id === section)?.ownerOnly;
    if (locked && profile?.username !== 'villauribe12') {
      setSection('overview');
    }
  }, [section, profile?.username]);

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
    if (section === 'shop') {
      let live = true;
      setRoomLoading(true);
      api.getAdminSection('shop', { q: shopQ || undefined })
        .then((d) => { if (live) setRoom(d || {}); })
        .catch(() => { if (live) setRoom({}); })
        .finally(() => { if (live) setRoomLoading(false); });
      return () => { live = false; };
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
    if (section === 'staff') {
      let live = true;
      setRoomLoading(true);
      api.getAdminStaff()
        .then((d) => {
          if (!live) return;
          setStaffList(d.staff || []);
          setStaffRoles(d.roles || []);
          if ((d.roles || []).length && !pickRole) setPickRole(d.roles[0].name);
        })
        .catch(() => {
          if (live) { setStaffList([]); setStaffRoles([]); }
        })
        .finally(() => { if (live) setRoomLoading(false); });
      return () => { live = false; };
    }
    if (section === 'gm') {
      let live = true;
      setRoomLoading(true);
      const applyDesk = (d: any) => {
        if (!live) return;
        if (d?.me) setGmDesk(d);
        else if (d?.staff) setGmDesk({ me: d.staff, quota: d.quota, gifts: d.gifts, unlimited: false });
        else setGmDesk(d || {});
      };
      api.getAdminStaffMe()
        .then(applyDesk)
        .catch(async () => {
          const uid = Number(profile?.userId || profile?.id || 0);
          if (!uid) {
            if (live) setGmDesk(null);
            return;
          }
          try {
            applyDesk(await api.getAdminStaffDesk(uid));
          } catch {
            if (live) setGmDesk(null);
          }
        })
        .finally(() => { if (live) setRoomLoading(false); });
      return () => { live = false; };
    }
    if (section === 'history') {
      let live = true;
      setRoomLoading(true);
      api.getAdminStaffGifts()
        .then((d) => { if (live) setGiftHistory(d.gifts || []); })
        .catch(() => { if (live) setGiftHistory([]); })
        .finally(() => { if (live) setRoomLoading(false); });
      return () => { live = false; };
    }
    if (!READ_SECTIONS.includes(section)) {
      setRoomLoading(false);
      return;
    }
    let live = true;
    setRoomLoading(true);
    api.getAdminSection(section)
      .then((d) => { if (live) setRoom(d || {}); })
      .catch(() => { if (live) setRoom({}); })
      .finally(() => { if (live) setRoomLoading(false); });
    return () => { live = false; };
  }, [section, playerPage, matchPage, loginPage, clanId, economyDays, profile?.userId, profile?.id]);

  useEffect(() => {
    if (!navLoading) return;
    if (loading || roomLoading) return;
    navTimer.current = window.setTimeout(() => {
      setNavLeaving(true);
      navLeaveTimer.current = window.setTimeout(() => setNavLoading(false), 220);
    }, 850);
    return () => {
      window.clearTimeout(navTimer.current);
      window.clearTimeout(navLeaveTimer.current);
    };
  }, [navLoading, loading, roomLoading, section, playerId, clanId]);

  useEffect(() => () => {
    window.clearTimeout(navTimer.current);
    window.clearTimeout(navLeaveTimer.current);
  }, []);

  const reloadAnnouncements = () => {
    api.getAdminSection('announcements').then((d) => setRoom(d || {})).catch(() => setRoom({}));
  };

  const removeNotice = async (id: number) => {
    if (!window.confirm('¿Quitar esta noticia del juego?')) return;
    try {
      await api.deleteNotice(id);
      reloadAnnouncements();
    } catch (err: any) {
      window.alert(err.message || 'No se pudo eliminar');
    }
  };

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

  const applyStaffBundle = (d: any) => {
    setStaffList(d?.staff || []);
    setStaffRoles(d?.roles || []);
  };

  const searchStaffPlayers = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = staffQ.trim();
    if (q.length < 2) { setStaffHits([]); return; }
    setStaffBusy(true);
    try {
      const d = await api.searchAdminStaff(q);
      setStaffHits(d.data || []);
    } catch {
      setStaffHits([]);
    } finally {
      setStaffBusy(false);
    }
  };

  const canManageStaff = String(profile?.username || '').toLowerCase() === 'villauribe12';
  const isStaffOwner = canManageStaff
    || String(gmDesk?.me?.username || '').toLowerCase() === 'villauribe12';
  const unlimitedGift = Boolean(gmDesk?.unlimited)
    || ['villauribe12', 'john_exe'].includes(String(gmDesk?.me?.username || '').toLowerCase())
    || ['villauribe12', 'john_exe'].includes(String(profile?.username || '').toLowerCase());

  const assignStaff = async (userId: number, role: string) => {
    if (!canManageStaff) return;
    setStaffBusy(true);
    try {
      const d = await api.assignAdminStaff({ userId, role, grantedByName: profile?.username });
      applyStaffBundle(d);
      setStaffHits((rows) => rows.map((p) => (p.id === userId ? { ...p, webRole: role } : p)));
    } catch (err: any) {
      alert(err?.message || 'No se pudo asignar el rol');
    } finally {
      setStaffBusy(false);
    }
  };

  const removeStaff = async (userId: number) => {
    if (!canManageStaff) return;
    setStaffBusy(true);
    try {
      applyStaffBundle(await api.removeAdminStaff(userId));
    } catch (err: any) {
      alert(err?.message || 'No se pudo quitar el rol');
    } finally {
      setStaffBusy(false);
    }
  };

  const openStaffDesk = async (p: any) => {
    setStaffOpen(p);
    setQuotaInput('');
    try {
      const d = await api.getAdminStaffDesk(p.userId);
      setStaffDesk(d);
    } catch {
      setStaffDesk({ staff: p, quota: p, gifts: [] });
    }
  };

  const saveQuota = async (mode: 'add' | 'sub' | 'set' | 'clear') => {
    if (!canManageStaff || !staffOpen) return;
    const amount = Math.max(0, Math.floor(Number(String(quotaInput).replace(/[^\d]/g, '')) || 0));
    if (mode !== 'clear' && amount <= 0) {
      alert('Escribe cuánto NX quieres poner o sumar');
      return;
    }
    setStaffBusy(true);
    try {
      const d = await api.setAdminStaffQuota(staffOpen.userId, amount, mode);
      if (d.staff) setStaffList(d.staff);
      setStaffDesk((prev: any) => ({ ...(prev || {}), quota: d.quota }));
      setStaffOpen((prev: any) => prev ? {
        ...prev,
        monthlyAllotment: d.quota?.monthlyAllotment,
        used: d.quota?.used,
        remaining: d.quota?.remaining,
      } : prev);
      setQuotaInput('');
    } catch (err: any) {
      alert(err?.message || 'No se pudo guardar el cupo');
    } finally {
      setStaffBusy(false);
    }
  };

  const searchGmPlayers = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = gmQ.trim();
    if (q.length < 2) { setGmHits([]); return; }
    setStaffBusy(true);
    try {
      const d = await api.searchAdminStaff(q);
      setGmHits(d.data || []);
    } catch {
      setGmHits([]);
    } finally {
      setStaffBusy(false);
    }
  };

  const sendGmGift = async (toUserId: number) => {
    const amount = Math.floor(Number(String(gmAmount).replace(/[^\d]/g, '')) || 0);
    if (amount <= 0) return;
    const owner = unlimitedGift;
    if (!owner && amount > Number(gmDesk?.quota?.remaining || 0)) {
      alert('No tienes saldo para regalar');
      return;
    }
    setStaffBusy(true);
    try {
      const d = await api.giftAdminNx(toUserId, amount, '', { userId: profile?.userId || profile?.id, username: profile?.username });
      setGmDesk((prev: any) => ({ ...(prev || {}), quota: d.quota, gifts: d.gifts, unlimited: d.quota?.unlimited }));
      setGmHits((rows) => rows.map((p) => (Number(p.id) === Number(toUserId) ? { ...p, nx: Number(p.nx || 0) + amount } : p)));
      setGmAmount('');
    } catch (err: any) {
      alert(err?.message || 'No tienes saldo para regalar');
    } finally {
      setStaffBusy(false);
    }
  };

  const takeGmNx = async (toUserId: number) => {
    if (!isStaffOwner) return;
    const amount = Math.floor(Number(String(gmAmount).replace(/[^\d]/g, '')) || 0);
    if (amount <= 0) {
      alert('Escribe cuánto NX quieres quitar');
      return;
    }
    setStaffBusy(true);
    try {
      const d = await api.takeAdminNx(toUserId, amount, 'NX retirado por el dueño', { userId: profile?.userId || profile?.id, username: profile?.username });
      setGmDesk((prev: any) => ({ ...(prev || {}), gifts: d.gifts || prev?.gifts }));
      setGmHits((rows) => rows.map((p) => (Number(p.id) === Number(toUserId) ? { ...p, nx: d.balance ?? Math.max(0, Number(p.nx || 0) - amount) } : p)));
      setGmAmount('');
    } catch (err: any) {
      alert(err?.message || 'No se pudo quitar NX');
    } finally {
      setStaffBusy(false);
    }
  };

  const searchHistory = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setStaffBusy(true);
    try {
      const d = await api.getAdminStaffGifts(histQ.trim() || undefined);
      setGiftHistory(d.gifts || []);
    } catch {
      setGiftHistory([]);
    } finally {
      setStaffBusy(false);
    }
  };

  const nxFmt = (v: any) => Number(v || 0).toLocaleString();

  const createStaffRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageStaff) return;
    const name = newRoleName.trim();
    if (name.length < 2) return;
    setStaffBusy(true);
    try {
      const d = await api.createAdminStaffRole({
        name,
        siteAdmin: true,
        isGm: newRoleGm,
        createdBy: profile?.username,
      });
      applyStaffBundle(d);
      setPickRole(name);
      setNewRoleName('');
    } catch (err: any) {
      alert(err?.message || 'No se pudo crear el rol');
    } finally {
      setStaffBusy(false);
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

  if (!profile?.is_admin && profile?.username !== 'villauribe12') {
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
  const pendingCount = pendingCodes.length;
  const totalNX = pendingCodes.reduce((sum, p) => sum + Number(p.nxAmount || 0), 0);
  const totalDollars = pendingCodes.reduce((sum, p) => sum + Number(p.dollarAmount || 0), 0);
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
      {navLoading && <PageLoader leaving={navLeaving} />}
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
              {NAV.filter(n => n.group === group && n.label.toLowerCase().includes(q) && (!n.ownerOnly || profile?.username === 'villauribe12')).map(item => {
                const Icon = item.icon;
                const on = section === item.id;
                return (
                  <button key={item.id} className={on ? 'admin-on' : ''} onClick={() => goSection(item.id)}>
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
                  <button className="primary" onClick={() => goSection('players')}>Manage players</button>
                  {profile?.username === 'villauribe12' && (
                    <>
                      <button onClick={() => goSection('invites')}>Invitaciones</button>
                      <button onClick={() => goSection('codes')}>Payment codes</button>
                    </>
                  )}
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
                {profile?.username === 'villauribe12' && (
                  <>
                    <button onClick={() => goSection('invites')}><div><strong>Invitaciones</strong><small>Aprobar / rechazar canjes</small></div><span>→</span></button>
                    <button onClick={() => goSection('codes')}><div><strong>Payment codes</strong><small>{pendingCodes.length} pending</small></div><span>→</span></button>
                    <button onClick={() => goSection('payments')}><div><strong>Recargas</strong><small>{pendingCount} pending</small></div><span>→</span></button>
                    <button onClick={() => goSection('refunds')}><div><strong>Refunds</strong><small>{pendingRefunds.length} pending</small></div><span>→</span></button>
                  </>
                )}
                <button onClick={() => goSection('tickets')}><div><strong>Tickets</strong><small>{supportTickets.filter(t => t.status === 'open' || t.status === 'in-progress').length} open</small></div><span>→</span></button>
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
                    const roleLabel = String(p.webRole || '').trim();
                    const showRole = Boolean(roleLabel) && !superAdmin;
                    const showGm = Boolean(p.isGM || p.webGm) && roleLabel.toLowerCase() !== 'gm';
                    return (
                      <tr key={p.id} className="pl-row" onClick={() => setPlayerId(p.id)}>
                        <td>
                          <div className="pl-player">
                            <img src={rankIcon({ exp: p.Exp, UserType: p.UserType, rankMark: p.rankMark })} alt="" onError={(e) => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                            <div>
                              <b>{p.isGM ? `[GM]${p.NickName || p.username}` : (p.rankMark === 'FM' ? `[FM]${p.NickName || p.username}` : (p.NickName || p.username))}</b>
                              <small>{p.username}_ #{p.id}</small>
                            </div>
                          </div>
                        </td>
                        <td className="pl-mail">{p.email || '—'}</td>
                        <td>
                          <div className="pl-roles">
                            {superAdmin && <span className="pl-pill pl-pill-super">SUPERADMIN</span>}
                            {showRole && <span className="pl-pill pl-pill-admin">{roleLabel.toUpperCase()}</span>}
                            {showGm && <span className="pl-pill pl-pill-gm">GM</span>}
                            {p.rankMark === 'FM' && <span className="pl-pill pl-pill-fm">FM</span>}
                            {!superAdmin && !showRole && !p.isGM && !p.webGm && <span className="pl-pill pl-pill-player">PLAYER</span>}
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
                          onClick={() => goPlayer(p.id)}
                        >
                          <td>
                            <div className="pl-player">
                              <img src={rankIcon({ exp: p.Exp, UserType: p.UserType, rankMark: p.rankMark })} alt="" onError={(e) => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                              <div>
                                <b>{p.isGM ? `[GM]${p.NickName || p.username}` : (p.rankMark === 'FM' ? `[FM]${p.NickName || p.username}` : (p.NickName || p.username))}</b>
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
            onPlayer={(pid) => goPlayer(pid)}
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
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Store /></div>
              <div>
                <p className="eyebrow">GAME CONTROL / COMBAT ARMS</p>
                <h1>SHOP</h1>
                <p>What the in-game shop shows, badges, prices and buy-one-get-one events. Changes reach the game within about a minute. ({Number(room.inShop || 0).toLocaleString()} products in the shop now)</p>
              </div>
            </div>
            <form className="pl-filters" onSubmit={(e) => { e.preventDefault(); setRoomLoading(true); api.getAdminSection('shop', { q: shopQ || undefined }).then(setRoom).catch(() => setRoom({})).finally(() => setRoomLoading(false)); }}>
              <input value={shopQ} onChange={(e) => setShopQ(e.target.value)} placeholder="Product name or number" />
              <button className="pl-apply" type="submit">Find</button>
            </form>
            {roomLoading ? <Empty text="Leyendo tienda..." /> : (
              <>
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2><Store /> BADGES AND PRICE CHANGES</h2>
                    <span className="pd-chip">Products with HOT, NEW, SALE or a changed price</span>
                  </div>
                  {(room.groups || []).length === 0 ? (
                    <p className="pd-empty">No matching shop products.</p>
                  ) : room.groups.map((g: any) => (
                    <article key={g.itemNo || g.name} className="shop-card">
                      <div className="shop-card-top">
                        {g.image ? (
                          <img src={g.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : null}
                        <span className="inv-thumb">{String(g.name || '?').slice(0, 1)}</span>
                        <div>
                          <b>{g.name}</b>
                          <small>Function item · Item #{g.itemNo || '—'}</small>
                        </div>
                      </div>
                      {(g.variants || []).map((v: any) => (
                        <div key={v.id} className="shop-var">
                          <span className="shop-pill">{v.period}</span>
                          <span>{v.currency} #{v.id}</span>
                          <span className="shop-price">
                            {v.sale ? <><strong>{Number(v.price).toLocaleString()}</strong> <s>{Number(v.base).toLocaleString()}</s></> : <strong>{Number(v.price).toLocaleString()}</strong>}
                          </span>
                          <span className={v.inShop ? 'pl-status' : 'pd-left'}>{v.inShop ? 'IN THE SHOP' : 'HIDDEN'}</span>
                          {v.hot && <span className="shop-tag">HOT</span>}
                          {v.neu && <span className="shop-tag">NEW</span>}
                          {v.sale && <span className="shop-tag">SALE</span>}
                          {v.giftable && <span className="shop-tag">GIFTABLE</span>}
                        </div>
                      ))}
                    </article>
                  ))}
                </section>
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2>SHOP EVENTS</h2>
                    <span className="pd-chip">Buy one, get one</span>
                  </div>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>BUY</th>
                        <th>GET FREE</th>
                        <th>FOR</th>
                        <th>STARTS</th>
                        <th>ENDS</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(room.events || []).length === 0 ? (
                        <tr><td colSpan={6} className="pd-empty">No shop events.</td></tr>
                      ) : room.events.map((e: any, i: number) => (
                        <tr key={`${e.ProductID}-${i}`}>
                          <td>{e.ProductName || e.ProductID} <small>#{e.ProductID}</small></td>
                          <td>{e.GiftName || e.EventProductID} <small>#{e.EventProductID}</small></td>
                          <td>{e.for}</td>
                          <td className="pd-time">{stampSec(e.Start)}</td>
                          <td className="pd-time">{stampSec(e.Ends)}</td>
                          <td><span className={e.status === 'ACTIVE' ? 'pl-status' : 'pd-left'}>{e.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2>PLAYER PURCHASES</h2>
                    <span className="pd-chip">CBT_CharacterBuyProductLog</span>
                  </div>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>WHEN</th>
                        <th>PLAYER</th>
                        <th>PRODUCT</th>
                        <th>PAY</th>
                        <th>PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(room.purchases || []).length === 0 ? (
                        <tr><td colSpan={5} className="pd-empty">No purchases yet.</td></tr>
                      ) : room.purchases.map((p: any, i: number) => (
                        <tr key={i} className="pl-row" onClick={() => goPlayer(p.buyer)}>
                          <td className="pd-time">{stampSec(p.loggedAt)}</td>
                          <td className="login-nick">{p.NickName}</td>
                          <td>
                            <b>{p.ProductName}</b>
                            <small style={{ display: 'block', color: '#888' }}>#{p.productId}{p.ItemNo ? ` · Item ${p.ItemNo}` : ''}</small>
                          </td>
                          <td>{p.currency}</td>
                          <td>{Number(p.price || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
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
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Flag /></div>
              <div>
                <p className="eyebrow">TRACKING / COMBAT ARMS</p>
                <h1>PLAYER REPORTS</h1>
                <p>Reports players send from the game. Open one to see what came with it, act on the player, and mark it handled.</p>
              </div>
            </div>
            <div className="eco-tabs">
              {([
                ['open', `Open (${room.counts?.open ?? 0})`],
                ['handled', 'Handled'],
                ['dismissed', 'Dismissed'],
                ['all', `All (${room.counts?.all ?? 0})`],
              ] as const).map(([id, label]) => (
                <button key={id} className={reportTab === id ? 'on' : ''} onClick={() => { setReportTab(id); setOpenReport(null); }}>{label}</button>
              ))}
            </div>
            {openReport ? (
              <section className="ol-panel">
                <button className="pd-back" onClick={() => setOpenReport(null)}><ArrowLeft /> Reports</button>
                <h2>REPORT #{openReport.SeqNo || openReport.id}</h2>
                <div className="pd-grid" style={{ marginTop: 12 }}>
                  <div><p>WHEN</p><b>{stampSec(openReport.RegDate)}</b></div>
                  <div><p>REPORTER</p><b className="login-nick" style={{ cursor: 'pointer' }} onClick={() => goPlayer(openReport.ReporterOiduser)}>{openReport.reporterName}</b></div>
                  <div><p>REPORTED</p><b className="login-nick" style={{ cursor: 'pointer' }} onClick={() => goPlayer(openReport.TargetOiduser)}>{openReport.reportedName}</b></div>
                  <div><p>CATEGORY</p><b>{openReport.category}</b></div>
                  <div><p>STATUS</p><b>{String(openReport.status || 'open').toUpperCase()}</b></div>
                </div>
                <p className="sub" style={{ marginTop: 16 }}>MESSAGE</p>
                <p className="pd-note">{openReport.Message || '—'}</p>
                {(openReport.chat || []).length > 0 && (
                  <>
                    <p className="sub" style={{ marginTop: 16 }}>CHAT ATTACHED</p>
                    <pre className="rep-chat">{(openReport.chat || []).map((c: any) => c.ChatLog).join('\n')}</pre>
                  </>
                )}
                {openReport.status === 'open' && (
                  <div className="eco-cur" style={{ marginTop: 18, marginBottom: 8 }}>
                    <button className="on" onClick={async () => {
                      await api.reviewAdminReport(openReport.SeqNo || openReport.id, 'handled', profile.username);
                      setOpenReport(null);
                      api.getAdminSection('reports').then(setRoom).catch(() => {});
                    }}>Mark handled</button>
                    <button onClick={async () => {
                      await api.reviewAdminReport(openReport.SeqNo || openReport.id, 'dismissed', profile.username);
                      setOpenReport(null);
                      api.getAdminSection('reports').then(setRoom).catch(() => {});
                    }}>Dismiss</button>
                  </div>
                )}
              </section>
            ) : (
              <section className="ol-panel">
                <div className="pd-card-top">
                  <h2><Flag /> {(room.counts?.[reportTab] ?? 0)} {reportTab === 'all' ? 'REPORTS' : reportTab.toUpperCase()}</h2>
                  <span className="pd-chip">The chat attached to a report is the reporter's own client buffer</span>
                </div>
                {roomLoading ? <Empty text="Leyendo reportes..." /> : (
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>WHEN</th>
                        <th>REPORTER</th>
                        <th>REPORTED</th>
                        <th>CATEGORY</th>
                        <th>MESSAGE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((room.data || []).filter((r: any) => reportTab === 'all' || r.status === reportTab)).length === 0 ? (
                        <tr><td colSpan={6} className="pd-empty">No {reportTab === 'all' ? '' : reportTab + ' '}reports.</td></tr>
                      ) : (room.data || []).filter((r: any) => reportTab === 'all' || r.status === reportTab).map((r: any) => (
                        <tr
                          key={r.id}
                          className="pl-row"
                          onClick={() => {
                            setOpenReport(r);
                            api.getAdminReport(r.id).then((d) => setOpenReport({ ...r, ...d.report, chat: d.chat, match: d.match })).catch(() => {});
                          }}
                        >
                          <td className="pd-time">{stampSec(r.RegDate)}</td>
                          <td className="login-nick">{r.reporterName}</td>
                          <td className="login-nick">{r.reportedName}</td>
                          <td>{r.category}</td>
                          <td>{r.Message || '—'}</td>
                          <td>{String(r.status).toUpperCase()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}
          </>
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
                    <tr key={row.id} className="pl-row" onClick={() => goPlayer(row.oidUser)}>
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
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Megaphone /></div>
              <div>
                <p className="eyebrow">GAME CONTROL / COMBAT ARMS</p>
                <h1>ANNOUNCEMENTS</h1>
                <p>Server-wide messages. A new or edited message goes out within about 10 seconds, after that the game sends one message every 60 seconds, going through the list in order. Game server time now: {stampSec(room.serverNow)}</p>
              </div>
            </div>
            {roomLoading ? <Empty text="Leyendo anuncios..." /> : (
              <>
                {profile?.username === 'villauribe12' && <NoticeComposer onChanged={reloadAnnouncements} />}
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2><Megaphone /> WHERE PLAYERS SEE THEM</h2>
                    <span className="pd-chip">{room.showingNow ? 'Showing now' : 'Nothing is showing right now'}</span>
                  </div>
                  {room.current?.ADMessage ? (
                    <p className="pd-note" style={{ color: '#e6c36a' }}>{room.current.ADMessage}</p>
                  ) : null}
                  <p className="pd-note">In the lobby (channel list, lobby rooms, shop) it scrolls across the banner at the top of the screen for 15 seconds.</p>
                  <p className="pd-note">In a match, this same text scrolls across the top of the screen as a notice.</p>
                  <p className="pd-note">A message that goes out while a player is loading into a match or on the results screen is skipped for them.</p>
                </section>
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2><Megaphone /> MESSAGES</h2>
                    <span className="pd-chip">In the order the game rotates them</span>
                  </div>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>MESSAGE</th>
                        <th>WHEN CLICKED</th>
                        <th>STATUS</th>
                        <th>HASTA</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(room.ticker || []).length === 0 ? (
                        <tr><td colSpan={6} className="pd-empty">No messages yet</td></tr>
                      ) : room.ticker.map((m: any) => (
                        <tr key={m.ADMessageNo}>
                          <td>{m.ADMessageNo}</td>
                          <td>{m.ADMessage}</td>
                          <td>{m.click}</td>
                          <td><span className={m.status === 'ON' ? 'pl-status' : 'pd-left'}>{m.status}</span></td>
                          <td className="pd-time">{m.untilAt ? stampSec(m.untilAt) : '—'}</td>
                          <td className="pd-left">
                            {profile?.username === 'villauribe12' ? (
                              <button type="button" className="pl-apply" onClick={() => removeNotice(m.ADMessageNo)}>Quitar</button>
                            ) : 'Read only'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
                <section className="ol-panel">
                  <div className="pd-card-top">
                    <h2>SCHEDULED</h2>
                    <span className="pd-chip">Applied by the game at the time given</span>
                  </div>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>AT</th>
                        <th>CHANGE</th>
                        <th>MESSAGE</th>
                        <th>WHEN CLICKED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(room.scheduled || []).length === 0 ? (
                        <tr><td colSpan={4} className="pd-empty">No scheduled changes</td></tr>
                      ) : room.scheduled.map((m: any, i: number) => (
                        <tr key={m.MessageSetID || i}>
                          <td className="pd-time">{stampSec(m.ViewDate)}</td>
                          <td>{m.change}</td>
                          <td>{m.Message}</td>
                          <td>{m.click}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        )}

        {section === 'maps' && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Map /></div>
              <div>
                <p className="eyebrow">GAME CONTROL / COMBAT ARMS</p>
                <h1>MAPS & MODES</h1>
                <p>The maps players can pick when they create a room. The star is the map a new room starts on. Changes reach the lobby within about a minute.</p>
              </div>
            </div>
            <div className="eco-tabs">
              {(room.levels || []).map((lv: any) => (
                <button
                  key={lv.id}
                  className={(mapLevel ?? room.levels?.[0]?.id) === lv.id ? 'on' : ''}
                  onClick={() => setMapLevel(lv.id)}
                >
                  {lv.label}
                </button>
              ))}
            </div>
            <p className="pd-note" style={{ marginBottom: 12 }}>
              Each LobbyServer uses the list of its own ClearanceLevel. The live lobby uses the normal lobby list (3) unless its INI says otherwise.
            </p>
            <p className="map-legend">
              <span><Check /> Enabled</span>
              <span className="off"><Check /> Disabled</span>
              <span><Star /> Default map</span>
            </p>
            {roomLoading ? <Empty text="Leyendo mapas..." /> : (
              (room.lobbies?.[String(mapLevel ?? room.levels?.[0]?.id)] || room.lobbies?.[mapLevel ?? room.levels?.[0]?.id] || []).map((mode: any) => (
                <section className="ol-panel" key={mode.modeId}>
                  <div className="pd-card-top">
                    <h2>{String(mode.name || '').toUpperCase()}</h2>
                    <span className="pd-chip">{mode.on} of {mode.total} maps on</span>
                  </div>
                  <div className="map-grid">
                    {mode.maps.map((m: any) => (
                      <span
                        key={m.mapId}
                        className={`map-chip${m.enable ? ' on' : ''}${m.defaultMap ? ' def' : ''}`}
                        title={m.enable ? 'Enabled' : 'Disabled'}
                      >
                        {m.enable ? <Check /> : <span className="map-dot" />}
                        {m.name}
                        <Star className={m.defaultMap ? 'star-on' : 'star-off'} />
                      </span>
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}

        {section === 'events' && <EventsDesk />}
        {section === 'coupons' && <CouponCodesDesk />}
        {section === 'invites' && <InviteRequestsDesk />}

        {section === 'boosts' && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Zap /></div>
              <div>
                <p className="eyebrow">EVENTS / COMBAT ARMS</p>
                <h1>EXP & GP BOOSTS</h1>
                <p>Timed multipliers for match rewards. The lobbies reload them every minute. Game server time now: {stampSec(room.serverNow)}</p>
              </div>
            </div>
            {roomLoading ? <Empty text="Leyendo boosts..." /> : (
              <section className="ol-panel">
                <div className="pd-card-top">
                  <h2><Zap /> BOOSTS</h2>
                  <span className="pd-chip">Several running boosts add up ({room.running || 0} · +{room.expSum || 0} · x{room.gpSum || 0})</span>
                </div>
                <table className="pl-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>NAME</th>
                      <th>EXP</th>
                      <th>GP</th>
                      <th>WHERE</th>
                      <th>STARTS</th>
                      <th>ENDS</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(room.data || []).length === 0 ? (
                      <tr><td colSpan={9} className="pd-empty">No boost events.</td></tr>
                    ) : room.data.map((e: any) => (
                      <tr key={e.EventID}>
                        <td>{e.EventID}</td>
                        <td>{e.name}</td>
                        <td>{e.expLabel}</td>
                        <td>{e.gpLabel}</td>
                        <td>{e.where}</td>
                        <td className="pd-time">{stampSec(e.BeginTime)}</td>
                        <td className="pd-time">{stampSec(e.EndTime)}</td>
                        <td><span className={e.status === 'RUNNING' ? 'pl-status' : 'pd-left'}>{e.status}</span></td>
                        <td className="pd-left">Read only</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
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
            {loading ? <Empty text="Loading..." /> : pendingCodes.length === 0 ? <Empty text="No hay solicitudes pendientes" /> : pendingCodes.map((code) => (
              <div className="admin-row" key={code.id}>
                <div>
                  <b>{code.NickName || code.username}</b>
                  <span>{code.username} · {code.paymentCode} · {Number(code.nxAmount).toLocaleString()} NX · ${Number(code.dollarAmount).toFixed(2)}</span>
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

        {section === 'staff' && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><UserCog /></div>
              <div>
                <p className="eyebrow">OPERATIONS / STAFF</p>
                <h1>ADMINISTRACIÓN</h1>
                <p>{canManageStaff
                  ? 'Asigna roles, abre un staff, quítale el cupo (RESTANTE 0) o ponle / súmale NX para que pueda volver a regalar.'
                  : 'Solo lectura. Abre un staff para ver su etiqueta y su cupo. No puedes cambiar roles ni montos.'}</p>
              </div>
            </div>
            {canManageStaff && (
            <form className="staff-toolbar" onSubmit={createStaffRole}>
              <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Nuevo rol (MOD, GM, HELPER)" />
              <label className="staff-switch"><input type="checkbox" checked={newRoleGm} onChange={(e) => setNewRoleGm(e.target.checked)} /><span /> Marca GM</label>
              <button className="staff-btn staff-btn-gold" type="submit" disabled={staffBusy}>Crear rol</button>
            </form>
            )}
            <form className="staff-toolbar" onSubmit={searchStaffPlayers}>
              <input value={staffQ} onChange={(e) => setStaffQ(e.target.value)} placeholder="Buscar nick, usuario, email o #oid" />
              {canManageStaff && (
              <select value={pickRole} onChange={(e) => setPickRole(e.target.value)}>
                {(staffRoles.length ? staffRoles : [{ name: 'ADMINISTRATOR' }, { name: 'GM' }, { name: 'SUPERADMIN' }]).map((r: any) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
              )}
              <button className="staff-btn staff-btn-gold" type="submit" disabled={staffBusy}>Buscar</button>
            </form>
            {staffHits.length > 0 && (
              <div className="staff-results">
                {staffHits.map((p: any) => (
                  <article key={p.id} className="staff-card">
                    <div className="pl-player">
                      <img src={rankIcon({ exp: p.Exp, UserType: p.UserType, rankMark: p.rankMark })} alt="" onError={(e) => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                      <div>
                        <b>{p.rankMark === 'FM' && !p.isGM ? `[FM]${p.NickName || p.username}` : (p.NickName || p.username)}</b>
                        <small>{p.username} · #{p.id}</small>
                      </div>
                    </div>
                    <div className="pl-roles">
                      {p.webRole ? <span className="pl-pill pl-pill-admin">{String(p.webRole).toUpperCase()}</span> : <span className="pl-pill pl-pill-player">PLAYER</span>}
                    </div>
                    {canManageStaff && (
                      <button className="staff-btn staff-btn-gold" type="button" disabled={staffBusy} onClick={() => assignStaff(p.id, pickRole)}>Asignar {pickRole}</button>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="pl-meta" style={{ marginTop: 10 }}>
              <h2>STAFF ACTIVO</h2>
              <span>Pulsa una ficha para ver cupo NX y regalos</span>
            </div>
            {roomLoading ? <Empty text="Leyendo staff..." /> : (
              <div className="staff-results">
                {staffList.length === 0 ? <Empty text="Aún no hay roles asignados." /> : staffList.map((p: any) => (
                  <button type="button" key={p.userId} className="staff-card staff-card-btn" onClick={() => openStaffDesk(p)}>
                    <div className="pl-player">
                      <div>
                        <b>{p.NickName || p.username}</b>
                        <small>{p.username} · #{p.userId}</small>
                      </div>
                    </div>
                    <div className="pl-roles">
                      <span className={String(p.webRole || '').toLowerCase() === 'superadmin' ? 'pl-pill pl-pill-super' : (p.webGm ? 'pl-pill pl-pill-gm' : 'pl-pill pl-pill-admin')}>
                        {String(p.webRole || 'STAFF').toUpperCase()}
                      </span>
                    </div>
                    <div className="staff-quota-chip">
                      <small>CUPO / RESTANTE</small>
                      <strong>{p.unlimited || String(p.username || '').toLowerCase() === 'john_exe' ? 'ILIMITADO' : <>{nxFmt(p.remaining)} <span>/ {nxFmt(p.monthlyAllotment)}</span></>}</strong>
                    </div>
                    <ChevronRight className="staff-card-go" />
                  </button>
                ))}
              </div>
            )}
            {staffOpen && (
              <div className="staff-drawer-bg" onClick={() => { setStaffOpen(null); setStaffDesk(null); }}>
                <aside className="staff-drawer" onClick={(e) => e.stopPropagation()}>
                  <header>
                    <div>
                      <p className="eyebrow">STAFF DESK</p>
                      <h2>{staffOpen.NickName || staffOpen.username}</h2>
                      <small>{staffOpen.username} · #{staffOpen.userId}</small>
                    </div>
                    <button className="staff-btn staff-btn-ghost" type="button" onClick={() => { setStaffOpen(null); setStaffDesk(null); }}><X /></button>
                  </header>
                  <div className="pl-roles" style={{ margin: '8px 0 16px' }}>
                    <span className={String((staffDesk?.staff || staffOpen).webRole || '').toLowerCase() === 'superadmin' ? 'pl-pill pl-pill-super' : 'pl-pill pl-pill-admin'}>
                      {String((staffDesk?.staff || staffOpen).webRole || 'STAFF').toUpperCase()}
                    </span>
                    {(staffDesk?.staff || staffOpen).webGm && <span className="pl-pill pl-pill-gm">GM</span>}
                  </div>
                  <div className="staff-metrics">
                    <article><p>ASIGNADO / MES</p><strong>{staffDesk?.unlimited || staffDesk?.quota?.unlimited || String((staffDesk?.staff || staffOpen).username || '').toLowerCase() === 'john_exe' ? 'ILIMITADO' : nxFmt(staffDesk?.quota?.monthlyAllotment ?? staffOpen.monthlyAllotment)}</strong></article>
                    <article><p>USADO</p><strong>{nxFmt(staffDesk?.quota?.used ?? staffOpen.used)}</strong></article>
                    <article><p>RESTA</p><strong>{staffDesk?.unlimited || staffDesk?.quota?.unlimited || String((staffDesk?.staff || staffOpen).username || '').toLowerCase() === 'john_exe' ? 'ILIMITADO' : nxFmt(staffDesk?.quota?.remaining ?? staffOpen.remaining)}</strong></article>
                  </div>
                  {canManageStaff && !(staffDesk?.unlimited || staffDesk?.quota?.unlimited || String((staffDesk?.staff || staffOpen).username || '').toLowerCase() === 'john_exe') && (
                    <form className="staff-toolbar staff-quota-actions" onSubmit={(e) => { e.preventDefault(); saveQuota('set'); }}>
                      <input value={quotaInput} onChange={(e) => setQuotaInput(e.target.value)} placeholder="NX que le dejas de cupo" />
                      <button className="staff-btn staff-btn-gold" type="submit" disabled={staffBusy}>Poner cupo</button>
                      <button className="staff-btn staff-btn-gold" type="button" disabled={staffBusy} onClick={() => saveQuota('add')}>Sumar cupo</button>
                      <button className="staff-btn staff-btn-danger staff-btn-danger-sm" type="button" disabled={staffBusy} onClick={() => saveQuota('clear')}>Quitar cupo</button>
                    </form>
                  )}
                  <p className="staff-note">{staffDesk?.unlimited || staffDesk?.quota?.unlimited || String((staffDesk?.staff || staffOpen).username || '').toLowerCase() === 'john_exe'
                    ? 'Este GM no tiene cupo. Puede regalar el NX que quiera a cualquier jugador.'
                    : 'Quitar cupo deja RESTANTE en 0 (ya no puede regalar). Poner cupo le deja exactamente esa cantidad para regalar. Sumar se la agrega al restante actual.'}</p>
                  <h3>REGALOS DE ESTE MES</h3>
                  <div className="staff-gift-list">
                    {(staffDesk?.gifts || []).length === 0 ? <p className="staff-note">Todavía no ha regalado NX.</p> : (staffDesk.gifts || []).map((g: any) => (
                      <div key={g.id} className="staff-gift-row">
                        <div>
                          <b>{g.toNick || g.toUsername}</b>
                          <small>{g.toUsername} · {stamp(g.createdAt)}</small>
                        </div>
                        <strong style={{ color: Number(g.amount) < 0 ? '#e8a0a0' : undefined }}>{nxFmt(g.amount)} NX</strong>
                      </div>
                    ))}
                  </div>
                  {canManageStaff && staffOpen.username !== 'villauribe12' && (
                    <button className="staff-btn staff-btn-danger" type="button" disabled={staffBusy} onClick={() => { removeStaff(staffOpen.userId); setStaffOpen(null); }}>Quitar rol</button>
                  )}
                </aside>
              </div>
            )}
          </>
        )}

        {section === 'gm' && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><Crown /></div>
              <div>
                <p className="eyebrow">OPERATIONS / GM</p>
                <h1>GM</h1>
                <p>{unlimitedGift && !isStaffOwner
                  ? 'Puedes regalar el NX que quieras al jugador que busques. No tienes cupo.'
                  : `Tu etiqueta y el NX que puedes regalar este mes. Busca un jugador: verás cuánto NX tiene y puedes enviarle desde tu cupo.${isStaffOwner ? ' Solo tú puedes quitarle NX.' : ''}`}</p>
              </div>
            </div>
            {roomLoading ? <Empty text="Cargando cupo..." /> : !gmDesk?.me ? <Empty text="No tienes un rol de staff asignado." /> : (
              <>
                <div className="staff-metrics">
                  <article>
                    <p>TU ETIQUETA</p>
                    <strong style={{ fontSize: 22 }}>{String(gmDesk.me.webRole || 'STAFF').toUpperCase()}</strong>
                  </article>
                  <article><p>CUPO DEL MES</p><strong>{unlimitedGift ? 'ILIMITADO' : nxFmt(gmDesk.quota?.monthlyAllotment)}</strong></article>
                  <article><p>YA REGALADO</p><strong>{nxFmt(gmDesk.quota?.used)}</strong></article>
                  <article><p>TE QUEDA</p><strong>{unlimitedGift ? 'ILIMITADO' : nxFmt(gmDesk.quota?.remaining)}</strong></article>
                </div>
                {!unlimitedGift && Number(gmDesk.quota?.remaining || 0) <= 0 && (
                  <p className="staff-alert">No tienes saldo para regalar</p>
                )}
                <form className="staff-toolbar" onSubmit={searchGmPlayers}>
                  <input value={gmQ} onChange={(e) => setGmQ(e.target.value)} placeholder="Jugador nick, usuario o #id" />
                  <button className="staff-btn staff-btn-gold" type="submit" disabled={staffBusy}>Buscar</button>
                </form>
                <div className="staff-amount-bar">
                  <label htmlFor="gm-nx-amount">CANTIDAD NX</label>
                  <input
                    id="gm-nx-amount"
                    className="staff-amount-input"
                    inputMode="numeric"
                    autoComplete="off"
                    value={gmAmount}
                    onChange={(e) => setGmAmount(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="Ej. 50000"
                  />
                </div>
                <div className="staff-results">
                  {gmHits.map((p: any) => (
                    <article key={p.id} className="staff-card">
                      <div className="pl-player">
                        <div>
                          <b>{p.NickName || p.username}</b>
                          <small>{p.username} · #{p.id}</small>
                        </div>
                      </div>
                      <div className="staff-card-nx">
                        <small>NX EN CUENTA</small>
                        <strong>{nxFmt(p.nx)}</strong>
                      </div>
                      <input
                        className="staff-amount-input"
                        inputMode="numeric"
                        autoComplete="off"
                        value={gmAmount}
                        onChange={(e) => setGmAmount(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="Cantidad"
                      />
                      <div className="staff-quota-actions">
                        <button className="staff-btn staff-btn-gold" type="button" disabled={staffBusy || (!unlimitedGift && Number(gmDesk.quota?.remaining || 0) <= 0)} onClick={() => sendGmGift(p.id)}>
                          Regalar {gmAmount || '0'} NX
                        </button>
                        {isStaffOwner && (
                          <button className="staff-btn staff-btn-danger staff-btn-danger-sm" type="button" disabled={staffBusy || Number(p.nx || 0) <= 0} onClick={() => takeGmNx(p.id)}>
                            Quitar {gmAmount || '0'} NX
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="pl-meta" style={{ marginTop: 18 }}>
                  <h2>TUS REGALOS</h2>
                  <span>A quién enviaste NX este periodo</span>
                </div>
                <div className="staff-gift-list">
                  {(gmDesk.gifts || []).length === 0 ? <p className="staff-note">Aún no has regalado NX.</p> : (gmDesk.gifts || []).map((g: any) => (
                    <div key={g.id} className="staff-gift-row">
                      <div>
                        <b>{g.toNick || g.toUsername}</b>
                        <small>{g.toUsername} · {stamp(g.createdAt)}{g.message ? ` · ${g.message}` : ''}</small>
                      </div>
                      <strong style={{ color: Number(g.amount) < 0 ? '#e8a0a0' : undefined }}>{nxFmt(g.amount)} NX</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {section === 'history' && (
          <>
            <div className="pl-hero">
              <div className="pl-hero-ico"><History /></div>
              <div>
                <p className="eyebrow">OPERATIONS / LOG</p>
                <h1>HISTORIAL</h1>
                <p>Todo lo que cada GM o administrador ha regalado: a quién, cuánto y con qué etiqueta.</p>
              </div>
            </div>
            <form className="staff-toolbar" onSubmit={searchHistory}>
              <input value={histQ} onChange={(e) => setHistQ(e.target.value)} placeholder="Filtrar por GM o jugador" />
              <button className="staff-btn staff-btn-gold" type="submit" disabled={staffBusy}>Filtrar</button>
            </form>
            {roomLoading ? <Empty text="Leyendo historial..." /> : (
              <table className="pl-table">
                <thead>
                  <tr>
                    <th>CUÁNDO</th>
                    <th>GM / ADMIN</th>
                    <th>ETIQUETA</th>
                    <th>JUGADOR</th>
                    <th>NX</th>
                    <th>MENSAJE</th>
                  </tr>
                </thead>
                <tbody>
                  {giftHistory.length === 0 ? (
                    <tr><td colSpan={6} style={{ color: '#777', padding: 28 }}>Todavía no hay regalos registrados.</td></tr>
                  ) : giftHistory.map((g: any) => (
                    <tr key={g.id}>
                      <td>{stamp(g.createdAt)}</td>
                      <td>
                        <b>{g.fromNick || g.fromUsername}</b>
                        <div style={{ color: '#888', fontSize: 11 }}>{g.fromUsername}</div>
                      </td>
                      <td><span className="pl-pill pl-pill-admin">{String(g.fromRole || 'STAFF').toUpperCase()}</span></td>
                      <td>
                        <b>{g.toNick || g.toUsername}</b>
                        <div style={{ color: '#888', fontSize: 11 }}>{g.toUsername}</div>
                      </td>
                      <td><strong style={{ color: Number(g.amount) < 0 ? '#e8a0a0' : undefined }}>{nxFmt(g.amount)}</strong></td>
                      <td>{g.message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
