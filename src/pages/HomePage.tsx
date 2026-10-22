import { useState } from 'react';
import type { PageId } from '@/components/Layout';
import EvolutionGuard from '@/components/EvolutionGuard';

export default function HomePage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const [guardOpen, setGuardOpen] = useState(false);

  return (
    <div className="bg-[#0a0a0a] pb-12">
      <section className="relative isolate flex min-h-[646px] items-center overflow-hidden bg-[#222]">
        <img
          src="/caevo/hero.jpg"
          alt=""
          className="absolute inset-0 z-[-1] h-full w-full object-cover opacity-95"
          style={{ objectPosition: '65% center', filter: 'saturate(0.65)' }}
        />
        <div
          className="absolute inset-0 z-[-1]"
          style={{
            background:
              'linear-gradient(90deg, rgba(12,12,12,0.98), rgba(12,12,12,0.91) 22%, rgba(12,12,12,0.44) 48%, rgba(12,12,12,0.02) 78%), linear-gradient(0deg, rgba(16,16,16,0.93), transparent 24%, transparent 80%, rgba(21,21,21,0.13))',
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-16 lg:pb-24">
          <h1 className="max-w-4xl text-[clamp(56px,7.85vw,124px)] font-extrabold uppercase leading-[0.93] tracking-[-1.5px] text-white">
            COMBAT ARMS
            <br />
            <span className="text-[#df8104]">EVOLUTION.</span>
          </h1>
          <p className="mt-7 max-w-[550px] text-[14px] leading-[1.9] text-[#c4c4c4]">
            Combat Arms Evolution (CA Evo) is a free-to-play online first-person
            shooter for PC. Play classic maps, explore PvP and co-op modes, and find
            your squad in the Caevo community.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <button type="button" onClick={() => setGuardOpen(true)} className="btn-evo btn-evo-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              START GAME
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M7 7h10v10" /></svg>
            </button>
            <button type="button" onClick={() => onNavigate('download')} className="btn-evo btn-evo-outline">
              Download client
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
            </button>
            <button type="button" onClick={() => onNavigate('guide')} className="btn-evo btn-evo-outline">
              Explore the game
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs font-semibold tracking-wide text-[#a0a0a0]">
            AVAILABLE ON PC
            <span className="mx-1 inline-block h-3 w-px bg-[#606060]" />
            FREE TO PLAY. READY WHEN YOU ARE.
          </p>
        </div>

        <div className="absolute bottom-6 left-16 hidden items-center gap-4 text-xs tracking-[1.7px] text-[#a5a5a5] md:flex">
          <span className="text-sm text-[#df8104]">01</span>
          <span className="inline-block h-px w-[60px] bg-[#93612b]" />
          RETURN TO COMBAT
        </div>
        <a href="#modos" className="absolute bottom-6 right-16 hidden items-center gap-3 text-xs tracking-[1.7px] md:flex">
          EXPLORE
          <svg className="h-4 w-4 text-[#df8104]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </a>
      </section>

      <div className="border-y border-[#3c3c3c] bg-[#1b1b1b]">
        <div className="mx-auto flex min-h-[100px] max-w-[1440px] flex-wrap items-center justify-between gap-6 px-6 py-5 lg:px-16">
          <div className="flex items-center gap-4">
            <svg className="h-6 w-6 text-[#df8104]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            <span className="flex flex-col text-[12px] tracking-wide text-[#a9a9a9]">
              CLASSIC COMBAT.
              <b className="font-bold text-[#e8e8e8]">UNCOMPROMISING ACTION.</b>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <svg className="h-6 w-6 text-[#df8104]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="10" cy="7" r="4" /></svg>
            <span className="flex flex-col text-[12px] tracking-wide text-[#a9a9a9]">
              FIND YOUR SQUAD.
              <b className="font-bold text-[#e8e8e8]">OWN THE BATTLEFIELD.</b>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <svg className="h-6 w-6 text-[#df8104]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span className="flex flex-col text-[12px] tracking-wide text-[#a9a9a9]">
              YOUR LOADOUT.
              <b className="font-bold text-[#e8e8e8]">YOUR WAY TO PLAY.</b>
            </span>
          </div>
          <span className="hidden text-[34px] italic tracking-[-5px] text-[#93612b] md:block" style={{ transform: 'skew(-12deg)' }}>//</span>
        </div>
      </div>

      <section id="modos" className="mx-auto max-w-[1440px] px-6 py-[67px] lg:px-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-[1.7px] text-[#df8104]">
              <span className="inline-block h-1.5 w-1.5 bg-[#df8104]" /> CHOOSE YOUR BATTLE
            </p>
            <h2 className="text-[clamp(32px,4vw,48px)] font-extrabold uppercase leading-none tracking-tight">
              Same instinct.<br />Different battleground.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-[#c4c4c4]">
            Go head-to-head. Survive the outbreak.<br />Or bring the whole squad.
          </p>
        </div>
        <div className="grid gap-[22px] md:grid-cols-3">
          {[
            { img: '/caevo/elimination.jpg', tag: 'TEAM DEATHMATCH', num: '01', title: 'ELIMINATION', desc: 'Two teams. One objective. Make every shot count.' },
            { img: '/caevo/modes/quarantine-infected-combat.jpg', tag: 'SURVIVAL', num: '02', title: 'QUARANTINE REGEN', desc: 'Hold your ground. The infected are closing in.' },
            { img: '/caevo/modes/fireteam-desert-thunder-1.webp', tag: 'CO-OP OPERATIONS', num: '03', title: 'FIRETEAM', desc: 'Squad up. Take on the mission. Come back together.' },
          ].map(mode => (
            <article key={mode.title} className="overflow-hidden bg-[#191919] text-left">
              <div className="relative h-[230px]">
                <img src={mode.img} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#191919] via-transparent to-black/20" />
                <span className="absolute left-3 top-3 flex items-center gap-1.5 bg-[rgba(17,17,17,0.86)] px-2.5 py-1.5 text-[12px] font-bold tracking-wide">
                  {mode.tag}
                </span>
                <span className="absolute bottom-2 right-3 text-[43px] font-extrabold leading-none text-white/30" style={{ fontFamily: "'Barlow Condensed', Impact, sans-serif" }}>
                  {mode.num}
                </span>
              </div>
              <div className="px-[23px] pb-[23px] pt-[21px]">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[22px] font-extrabold uppercase leading-none">{mode.title}</h3>
                  <svg className="h-[23px] w-[23px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10M7 17L17 7" /></svg>
                </div>
                <p className="mt-3 min-h-[48px] text-sm text-[#a0a0a0]">{mode.desc}</p>
                <span className="mt-5 inline-flex items-center gap-2.5 text-[14px] font-extrabold text-[#df8104]">
                  EXPLORE MODE
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                </span>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => onNavigate('guide')}
            className="btn-evo btn-evo-outline min-h-[50px] px-6 text-[13px]"
          >
            View all game modes
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1440px] flex-col items-start gap-8 px-6 py-12 md:flex-row md:items-center lg:px-16">
        <div className="flex h-[92px] w-[92px] shrink-0 flex-col items-center justify-center gap-1 border border-[#df8104]/40 text-[#df8104]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
          </svg>
          <span className="text-[11px] font-bold tracking-widest">CA / 08</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-extrabold tracking-[1.7px] text-[#df8104]">THE NEXT MATCH IS BETTER TOGETHER</p>
          <h2 className="mt-2 text-[clamp(28px,3.5vw,42px)] font-extrabold uppercase leading-none">
            Old friends. New rivals.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#c4c4c4]">
            Some games stay with you. So do the people you play them with.
            Reconnect with the Combat Arms Evolution community — also known as CA Evo or CA Evolution.
          </p>
        </div>
        <a
          href="https://discord.gg/5EpJwAh2r6"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[50px] shrink-0 items-center gap-2 bg-[#5865F2] px-6 text-[14px] font-extrabold uppercase tracking-wide text-white"
          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
        >
          <img src="/caevo/discord-mark-white.svg" alt="" className="h-[18px] w-6" />
          Join Discord
          <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10M7 17L17 7" /></svg>
        </a>
      </section>

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
            <button onClick={() => onNavigate('signin')} className="hover:text-white">Sign in</button>
            <button onClick={() => onNavigate('signup')} className="hover:text-white">Sign up</button>
          </nav>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-[#333] pt-4 text-[12px] text-[#777] md:flex-row md:justify-between">
          <p>An independent fan concept. Combat Arms and its artwork belong to their respective owners.</p>
          <span>COMBAT ARMS EVOLUTION / CA EVO</span>
        </div>
      </footer>

      <EvolutionGuard open={guardOpen} onClose={() => setGuardOpen(false)} />
    </div>
  );
}


