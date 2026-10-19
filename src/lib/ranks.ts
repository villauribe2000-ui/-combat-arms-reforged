export const PATENTES = [
  { exp: 0, nivel: 0 },
  { exp: 550, nivel: 1 },
  { exp: 1200, nivel: 2 },
  { exp: 2500, nivel: 3 },
  { exp: 5000, nivel: 4 },
  { exp: 8700, nivel: 5 },
  { exp: 15000, nivel: 6 },
  { exp: 22000, nivel: 7 },
  { exp: 30500, nivel: 8 },
  { exp: 40500, nivel: 9 },
  { exp: 52000, nivel: 10 },
  { exp: 65000, nivel: 11 },
  { exp: 81000, nivel: 12 },
  { exp: 99000, nivel: 13 },
  { exp: 119000, nivel: 14 },
  { exp: 141000, nivel: 15 },
  { exp: 166000, nivel: 16 },
  { exp: 194000, nivel: 17 },
  { exp: 225000, nivel: 18 },
  { exp: 259000, nivel: 19 },
  { exp: 296000, nivel: 20 },
  { exp: 336000, nivel: 21 },
  { exp: 379000, nivel: 22 },
  { exp: 425000, nivel: 23 },
  { exp: 474000, nivel: 24 },
  { exp: 526000, nivel: 25 },
  { exp: 580000, nivel: 26 },
  { exp: 638000, nivel: 27 },
  { exp: 699000, nivel: 28 },
  { exp: 763000, nivel: 29 },
  { exp: 830000, nivel: 30 },
  { exp: 900000, nivel: 31 },
  { exp: 983000, nivel: 32 },
  { exp: 1074000, nivel: 33 },
  { exp: 1173000, nivel: 34 },
  { exp: 1280000, nivel: 35 },
  { exp: 1400000, nivel: 36 },
  { exp: 1533000, nivel: 37 },
  { exp: 1679000, nivel: 38 },
  { exp: 1838000, nivel: 39 },
  { exp: 2010000, nivel: 40 },
  { exp: 2200000, nivel: 41 },
  { exp: 2408000, nivel: 42 },
  { exp: 2634000, nivel: 43 },
  { exp: 2878000, nivel: 44 },
  { exp: 3140000, nivel: 45 },
  { exp: 3420000, nivel: 46 },
  { exp: 3718000, nivel: 47 },
  { exp: 4034000, nivel: 48 },
  { exp: 4368000, nivel: 49 },
  { exp: 4720000, nivel: 50 },
  { exp: 5100000, nivel: 51 },
  { exp: 5500000, nivel: 52 },
  { exp: 6000000, nivel: 53 },
  { exp: 6800000, nivel: 54 },
  { exp: 8000000, nivel: 55 },
  { exp: 9200000, nivel: 56 },
  { exp: 10400000, nivel: 57 },
  { exp: 11600000, nivel: 58 },
  { exp: 12800000, nivel: 59 },
  { exp: 14000000, nivel: 60 },
];

export function rankFromExp(exp: number) {
  const value = Number(exp) || 0;
  if (value < 0 || value >= 89000000) return 60;
  for (let i = PATENTES.length - 1; i >= 0; i--) {
    if (value >= PATENTES[i].exp) return PATENTES[i].nivel;
  }
  return 0;
}

export function rankProgress(exp: number) {
  const current = rankFromExp(exp);
  const cur = PATENTES.find(p => p.nivel === current) || PATENTES[0];
  const next = PATENTES.find(p => p.nivel === current + 1);
  if (!next || current >= 60) {
    return { current, percent: 100, complete: true, nextLevel: 60, nextExp: cur.exp };
  }
  const span = Math.max(1, next.exp - cur.exp);
  const percent = Math.max(0, Math.min(100, ((exp - cur.exp) / span) * 100));
  return { current, percent, complete: false, nextLevel: next.nivel, nextExp: next.exp };
}

const CIC_TITLES: Record<number, string> = {
  56: 'Commander In Chief 1',
  57: 'Commander In Chief 2',
  58: 'Commander In Chief 3',
  59: 'Commander In Chief 4',
  60: 'Commander In Chief 5',
};

export function rankTitle(level: number, apiName?: string | null) {
  const clean = String(apiName || '').trim();
  if (clean && !/^(trainee|soldier|game master)$/i.test(clean)) return clean;
  return CIC_TITLES[level] || `Rank ${level}`;
}

export function rankIcon(opts: { rank?: number | string | null; exp?: number; isGM?: boolean; UserType?: number; rankMark?: string | null }) {
  const gameGm = Number(opts.UserType) === 1 || (opts.isGM === true && opts.UserType == null);
  if (gameGm) return '/ranks/RANK_GM.png';
  if (String(opts.rankMark || '').toUpperCase() === 'FM') return '/ranks/RANK_FM.png';
  const fromApi = Number(opts.rank);
  const n = Number.isFinite(fromApi) && fromApi > 0 ? fromApi : rankFromExp(opts.exp ?? 0);
  const clamped = Math.max(0, Math.min(65, Math.floor(n)));
  return `/ranks/RANK_${clamped}.png`;
}
