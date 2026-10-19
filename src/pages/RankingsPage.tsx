import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { rankIcon } from '@/lib/ranks';
import {
  Award, ChevronLeft, ChevronRight, Crown, RefreshCw, Search, Shield, Sword, Target, Trophy, X,
} from 'lucide-react';

type TabId = 'exp' | 'clans' | 'kda' | 'kills' | 'wins';

interface Player {
  id: number;
  username: string;
  NickName?: string;
  nickname?: string;
  kills: number;
  deaths: number;
  wins: number;
  losses: number;
  experience?: number;
  exp?: number;
  level?: number;
  rank?: number;
  rankName?: string;
  isGM?: boolean;
  UserType?: number;
  rankMark?: string | null;
}

interface Clan {
  GuildID: number;
  GuildName: string;
  MasterCharName: string;
  members: number;
  stats: {
    totalWins: number;
    totalLosses: number;
    exp: number;
    points: number;
  };
}

const PAGE_SIZE = 10;

const TABS: { id: TabId; label: string; icon: typeof Award }[] = [
  { id: 'exp', label: 'Player EXP', icon: Award },
  { id: 'clans', label: 'Clans', icon: Shield },
  { id: 'kda', label: 'KDA', icon: Target },
  { id: 'kills', label: 'Kills', icon: Sword },
  { id: 'wins', label: 'Wins', icon: Trophy },
];

function playerName(p: Player) {
  const base = p.NickName || p.nickname || p.username;
  if (p.rankMark === 'FM' && Number(p.UserType) !== 1 && !p.isGM) return `[FM]${base}`;
  return base;
}

function playerExp(p: Player) {
  const value = Number(p.experience ?? p.exp ?? (p as any).userExp ?? (p as any).Exp ?? 0);
  if (value > 0) return value;
  return (p.wins || 0) * 100 + (p.kills || 0);
}

function playerRankSrc(p: Player) {
  return rankIcon({ rank: p.rank, exp: playerExp(p), isGM: p.isGM, UserType: p.UserType, rankMark: p.rankMark });
}

function playerKd(p: Player) {
  return p.deaths > 0 ? p.kills / p.deaths : p.kills;
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function scoreFor(tab: TabId, p: Player) {
  if (tab === 'kda') return playerKd(p);
  if (tab === 'kills') return p.kills || 0;
  if (tab === 'wins') return p.wins || 0;
  return playerExp(p);
}

function scoreLabel(tab: TabId) {
  if (tab === 'kda') return 'KDA';
  if (tab === 'kills') return 'KILLS';
  if (tab === 'wins') return 'WINS';
  if (tab === 'clans') return 'CLAN EXP';
  return 'EXP';
}

export default function RankingsPage() {
  const [tab, setTab] = useState<TabId>('exp');
  const [players, setPlayers] = useState<Player[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Player | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [top, clanList] = await Promise.all([
        api.getTopPlayers(100),
        api.getClans().catch(() => []),
      ]);
      setPlayers(Array.isArray(top) ? top : []);
      setClans(Array.isArray(clanList) ? clanList : []);
    } catch (error) {
      console.error('Error fetching rankings:', error);
      if (!silent) {
        setPlayers([]);
        setClans([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const rankedPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = players
      .filter(p => !q || playerName(p).toLowerCase().includes(q) || p.username.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => scoreFor(tab === 'clans' ? 'exp' : tab, b) - scoreFor(tab === 'clans' ? 'exp' : tab, a));
    return list;
  }, [players, search, tab]);

  const rankedClans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clans
      .filter(c => !q || c.GuildName.toLowerCase().includes(q) || (c.MasterCharName || '').toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (b.stats?.exp || 0) - (a.stats?.exp || 0) || (b.stats?.points || 0) - (a.stats?.points || 0));
  }, [clans, search]);

  const isClans = tab === 'clans';
  const total = isClans ? rankedClans.length : rankedPlayers.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(page, pages);
  const sliceStart = (pageSafe - 1) * PAGE_SIZE;
  const pagePlayers = rankedPlayers.slice(sliceStart, sliceStart + PAGE_SIZE);
  const pageClans = rankedClans.slice(sliceStart, sliceStart + PAGE_SIZE);
  const leaders = isClans ? rankedClans.slice(0, 3) : rankedPlayers.slice(0, 3);

  const boardTitle = isClans ? 'CLAN LEADERBOARD' : 'PLAYER LEADERBOARD';
  const liveNote = isClans
    ? 'Clans ranked by EXP from live server data.'
    : tab === 'exp'
      ? 'Players ranked by EXP. Live data refreshes every 30 seconds.'
      : `Players ranked by ${scoreLabel(tab)}. Live data refreshes every 30 seconds.`;

  return (
    <main className="inner-page page-width ranking-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow"><span className="tiny-square" />THE PROVING GROUND</p>
          <h1>EARN YOUR PLACE.</h1>
          <p className="page-heading-description">
            Every match counts. Explore the soldiers and squads at the top of the leaderboard.
          </p>
        </div>
        <div className="page-heading-aside">
          <span className="ranking-live-badge">
            <Trophy className="h-[15px] w-[15px]" /> Live rankings
          </span>
        </div>
      </header>

      <div className="ranking-tabs" role="tablist" aria-label="Ranking category">
        {TABS.map(item => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`ranking-tab${active ? ' ranking-tab-active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="ranking-loading ranking-empty">
          <RefreshCw className="mx-auto h-8 w-8" />
          <h3>LOADING RANKS</h3>
          <p>Pulling live Combat Arms data.</p>
        </div>
      ) : (
        <>
          {leaders.length > 0 && !search && (
            <div className="ranking-leaders">
              {leaders.map((entry, i) => {
                const place = i + 1;
                if (isClans) {
                  const clan = entry as Clan;
                  return (
                    <article key={clan.GuildID} className={`ranking-leader${place === 1 ? ' ranking-leader-1' : ''}`}>
                      <div className="ranking-leader-top">
                        <div className="ranking-place">
                          {place} <span>PLACE</span>
                        </div>
                        {place === 1 ? <Crown size={18} /> : <Shield size={16} />}
                      </div>
                      <div className="ranking-leader-identity">
                        <div className="ranking-emblem"><span>CLN</span></div>
                        <div>
                          <h2>{clan.GuildName}</h2>
                          <p>{clan.MasterCharName || 'CLAN'}</p>
                        </div>
                      </div>
                      <div className="ranking-leader-score">
                        <strong>{fmt(clan.stats?.exp || 0)}</strong>
                        <span>CLAN EXP</span>
                      </div>
                    </article>
                  );
                }
                const player = entry as Player;
                return (
                  <article
                    key={player.id}
                    className={`ranking-leader${place === 1 ? ' ranking-leader-1' : ''}`}
                    onClick={() => setSelected(player)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="ranking-leader-top">
                      <div className="ranking-place">
                        {place} <span>PLACE</span>
                      </div>
                      {place === 1 ? <Crown size={18} /> : <Award size={16} />}
                    </div>
                    <div className="ranking-leader-identity">
                      <div className="ranking-emblem">
                        <img src={playerRankSrc(player)} alt="" className="ranking-rank-icon" onError={e => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                      </div>
                      <div>
                        <h2>{playerName(player)}</h2>
                        <p>{player.isGM ? 'GAME MASTER' : player.rankName || 'SOLDIER'}</p>
                      </div>
                    </div>
                    <div className="ranking-leader-score">
                      <strong>{tab === 'kda' ? fmt(playerKd(player), 2) : fmt(scoreFor(tab, player))}</strong>
                      <span>{scoreLabel(tab)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="ranking-board">
            <div className="ranking-toolbar">
              <div className="ranking-board-title">
                {isClans ? <Shield size={20} /> : <Trophy size={20} />}
                <h2>{boardTitle}</h2>
                <span>LIVE</span>
              </div>
              <div className="ranking-controls">
                <label className="ranking-search">
                  <Search size={14} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={isClans ? 'Search clan...' : 'Search player...'}
                  />
                  {search && (
                    <button type="button" className="ranking-clear-search" onClick={() => setSearch('')}>
                      <X size={14} />
                    </button>
                  )}
                </label>
                <button type="button" className="ranking-refresh" onClick={() => load()}>
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>

            <div className="ranking-table-scroll">
              {isClans ? (
                pageClans.length === 0 ? (
                  <div className="ranking-empty">
                    <Shield className="mx-auto h-8 w-8" />
                    <h3>NO CLANS YET</h3>
                    <p>No clans match this search.</p>
                  </div>
                ) : (
                  <table className="ranking-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>CLAN</th>
                        <th>MASTER</th>
                        <th>MEMBERS</th>
                        <th className="ranking-active-column">EXP</th>
                        <th>WINS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageClans.map((clan, i) => {
                        const rank = sliceStart + i + 1;
                        return (
                          <tr key={clan.GuildID}>
                            <td>
                              <span className={`ranking-row-position${rank <= 3 ? ' ranking-row-top' : ''}`}>
                                {rank <= 3 && <Crown size={12} />}
                                {rank}
                              </span>
                            </td>
                            <td>
                              <div className="ranking-row-identity">
                                <span className="ranking-row-avatar ranking-player-emblem"><Shield size={16} /></span>
                                <div className="ranking-row-name">
                                  {clan.GuildName}
                                  <small>CLAN</small>
                                </div>
                              </div>
                            </td>
                            <td>{clan.MasterCharName || '—'}</td>
                            <td>{clan.members ?? 0}</td>
                            <td className="ranking-active-column">{fmt(clan.stats?.exp || 0)}</td>
                            <td>{fmt(clan.stats?.totalWins || 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : pagePlayers.length === 0 ? (
                <div className="ranking-empty">
                  <Trophy className="mx-auto h-8 w-8" />
                  <h3>NO PLAYERS YET</h3>
                  <p>No soldiers match this search.</p>
                </div>
              ) : (
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>PLAYER</th>
                      <th className={tab === 'exp' ? 'ranking-active-column' : ''}>EXP</th>
                      <th className={tab === 'kills' ? 'ranking-active-column' : ''}>KILLS</th>
                      <th>DEATHS</th>
                      <th className={tab === 'kda' ? 'ranking-active-column' : ''}>KDA</th>
                      <th className={tab === 'wins' ? 'ranking-active-column' : ''}>WINS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagePlayers.map((player, i) => {
                      const rank = sliceStart + i + 1;
                      return (
                        <tr key={player.id} onClick={() => setSelected(player)} style={{ cursor: 'pointer' }}>
                          <td>
                            <span className={`ranking-row-position${rank <= 3 ? ' ranking-row-top' : ''}`}>
                              {rank <= 3 && <Crown size={12} />}
                              {rank}
                            </span>
                          </td>
                          <td>
                            <div className="ranking-row-identity">
                              <span className="ranking-row-avatar ranking-player-emblem">
                                <img src={playerRankSrc(player)} alt="" className="ranking-rank-icon" onError={e => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
                              </span>
                              <div className="ranking-row-name">
                                {playerName(player)}
                                <small>{player.isGM ? 'GAME MASTER' : player.rankName || 'SOLDIER'}</small>
                              </div>
                            </div>
                          </td>
                          <td className={tab === 'exp' ? 'ranking-active-column' : ''}>{fmt(playerExp(player))}</td>
                          <td className={tab === 'kills' ? 'ranking-active-column' : ''}>{fmt(player.kills || 0)}</td>
                          <td>{fmt(player.deaths || 0)}</td>
                          <td className={tab === 'kda' ? 'ranking-active-column' : ''}>{fmt(playerKd(player), 2)}</td>
                          <td className={tab === 'wins' ? 'ranking-active-column' : ''}>{fmt(player.wins || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="ranking-board-footer">
              <p>
                Showing <strong>{total === 0 ? 0 : sliceStart + 1}–{Math.min(sliceStart + PAGE_SIZE, total)}</strong> of <strong>{total}</strong>
              </p>
              <div className="ranking-pagination">
                <button type="button" disabled={pageSafe <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="Previous">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).slice(0, 8).map(n => (
                  <button
                    key={n}
                    type="button"
                    aria-current={n === pageSafe ? 'page' : undefined}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" disabled={pageSafe >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))} aria-label="Next">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </section>

          <div className="ranking-notes">
            <p><span>NOTE</span>{liveNote}</p>
            <p>Rankings use Combat Arms Reforged live stats.</p>
          </div>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelected(null)}>
          <div className="ranking-leader ranking-leader-1 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="ranking-leader-top">
              <div className="ranking-place">{playerName(selected)} <span>SOLDIER</span></div>
              <button type="button" className="ranking-clear-search" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="ranking-leader-score">
              <strong>{fmt(playerExp(selected))}</strong><span>EXP</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#b8b8b8]">
              <p>Kills <strong className="block text-white">{fmt(selected.kills || 0)}</strong></p>
              <p>Deaths <strong className="block text-white">{fmt(selected.deaths || 0)}</strong></p>
              <p>KDA <strong className="block text-white">{fmt(playerKd(selected), 2)}</strong></p>
              <p>Wins <strong className="block text-white">{fmt(selected.wins || 0)}</strong></p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
