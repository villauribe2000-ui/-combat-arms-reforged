import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { rankFromExp, rankIcon, rankProgress, rankTitle } from '@/lib/ranks';
import type { PageId } from '@/components/Layout';
import {
  Crosshair, Target, Users, Trophy, ArrowRight, BarChart3,
} from 'lucide-react';

export default function ProfilePage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [expRank, setExpRank] = useState<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);

  const name = game?.NickName || profile?.nickname || profile?.username || 'Player';

  useEffect(() => {
    if (!profile?.username) return;
    (async () => {
      try {
        const dbProfile = await api.getProfile(profile.username);
        setGame({ ...dbProfile, nx: profile.gameCoins, gp: profile.totalBalance, Exp: dbProfile.Exp ?? dbProfile.experience ?? 0 });
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
        setGame({ NickName: name, nx: profile.gameCoins, gp: profile.totalBalance, kills: 0, deaths: 0, wins: 0, losses: 0, level: profile.level || 0 });
      }
    })();
  }, [profile?.username]);

  const kd = game?.deaths > 0 ? (game.kills / game.deaths).toFixed(2) : (game?.kills || 0).toFixed(2);
  const exp = Number(game?.Exp ?? game?.experience ?? profile?.experience ?? 0);
  const rankLevel = Number(game?.rank) > 0 ? Number(game.rank) : rankFromExp(exp);
  const displayRank = rankTitle(rankLevel, game?.rankName);
  const rankSrc = rankIcon({ rank: rankLevel, exp });
  const wins = Number(game?.wins || 0);
  const losses = Number(game?.losses || 0);
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';
  const assists = Number(game?.assists || 0);
  const kda = game?.deaths > 0 ? ((Number(game?.kills || 0) + assists) / game.deaths).toFixed(2) : (Number(game?.kills || 0) + assists).toFixed(2);
  const progress = rankProgress(exp);
  const snapshot = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
      <div className="player-profile">
        <div className="player-profile-hero">
          <img src="/caevo/hero.jpg" alt="" />
          <div className="page-width player-profile-hero-inner">
            <div className="player-crumb">
              <button type="button" onClick={() => onNavigate('home')}>Home</button>
              <span>/</span>
              <button type="button" onClick={() => onNavigate('rankings')}>Players</button>
              <span>/</span>
              <span>{name}</span>
            </div>
            <p className="eyebrow"><span className="tiny-square" /> COMBAT ARMS / THE CLASSIC</p>
            <h1>PLAYER PROFILE.</h1>
          </div>
        </div>
        <div className="page-width player-profile-body">
          <div className="player-identity">
            <img src={rankSrc} alt="" className="player-rank-img" onError={e => { e.currentTarget.src = '/ranks/RANK_0.png'; }} />
            <div className="player-identity-copy">
              <p className="player-identity-label">COMBAT RECORD</p>
              <h2>
                {name}
                <span className="player-level">LEVEL {rankLevel}</span>
              </h2>
              <p>{displayRank}</p>
            </div>
            <button type="button" className="player-all-link" onClick={() => onNavigate('rankings')}>
              All players
            </button>
          </div>
          <div className="player-metrics">
            <article>
              <p>CLAN</p>
              <strong>{game?.clan || 'â€”'}</strong>
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
              <span className="player-kda"><BarChart3 size={16} /> KDA {kda}</span>
            </div>
            <div className="player-record-grid">
              <article className="player-record-card">
                <Crosshair size={18} className="rec-ico" />
                <p>KILLS</p>
                <strong>{Number(game?.kills || 0).toLocaleString()}</strong>
                <small>Eliminations recorded</small>
              </article>
              <article className="player-record-card">
                <Target size={18} className="rec-ico" />
                <p>DEATHS</p>
                <strong>{Number(game?.deaths || 0).toLocaleString()}</strong>
                <small>Deaths recorded</small>
              </article>
              <article className="player-record-card">
                <Users size={18} className="rec-ico" />
                <p>ASSISTS</p>
                <strong>{assists.toLocaleString()}</strong>
                <small>Assists recorded</small>
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
                  <strong>{displayRank}</strong>
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
                <strong>#{expRank ?? 'â€”'}</strong>
                <div>
                  <p>EXP RANKING</p>
                  <small>{exp.toLocaleString()} experience points{playerCount ? ` Â· top ${playerCount}` : ''}</small>
                </div>
              </div>
              <button type="button" className="player-board-link" onClick={() => onNavigate('rankings')}>
                View the leaderboard <ArrowRight size={14} />
              </button>
            </section>
          </div>

          <div className="player-notes">
            <p>KDA = (kills + assists) / deaths. Assists include more match types than kills and deaths.</p>
            <p>Win rate = wins / (wins + losses). Ratios without the required data appear as â€”.</p>
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
