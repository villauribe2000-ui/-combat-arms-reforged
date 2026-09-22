import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Users, Shield, Crown, Sword, Target, TrendingUp } from 'lucide-react';

interface Clan {
  ClanInfoSeqNo: number;
  GuildID: number;
  GuildName: string;
  MasterCharName: string;
  members: number;
  leader: {
    id: number;
    username: string;
    NickName: string;
    kills: number;
    deaths: number;
  } | null;
  stats: {
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    tdmWins: number;
    tdmLosses: number;
    tmmWins: number;
    tmmLosses: number;
    ctfWins: number;
    ctfLosses: number;
    tsvWins: number;
    tsvLosses: number;
    exp: number;
    points: number;
  };
}

interface ClanDetails extends Clan {
  membersList: Array<{
    id: number;
    username: string;
    NickName: string;
    kills: number;
    deaths: number;
  }>;
}

export default function ClansPage() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [selectedClan, setSelectedClan] = useState<ClanDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadClans();
  }, []);

  const loadClans = async () => {
    try {
      setLoading(true);
      const data = await api.getClans(searchTerm);
      setClans(data);
    } catch (error) {
      console.error('Error loading clans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    try {
      setLoading(true);
      const data = await api.getClans(term);
      setClans(data);
    } catch (error) {
      console.error('Error searching clans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClanClick = async (clan: Clan) => {
    try {
      const details = await api.getClanDetails(clan.ClanInfoSeqNo);
      setSelectedClan(details as ClanDetails);
      setShowModal(true);
    } catch (error) {
      console.error('Error loading clan details:', error);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-purple-900/40 via-[#0d1320] to-cyan-900/40 p-8">
        <h1 className="text-3xl font-bold mb-2">Clanes</h1>
        <p className="text-slate-400">Forma alianzas y domina la competición</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar clanes..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      {/* Clans Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400" />
              <p className="text-slate-400">Cargando clanes...</p>
            </div>
          </div>
        ) : clans.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-slate-600" />
              <p className="text-slate-400">No se encontraron clanes</p>
            </div>
          </div>
        ) : (
          clans.map((clan) => (
            <button
              key={clan.ClanInfoSeqNo}
              onClick={() => handleClanClick(clan)}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-white/2 p-6 transition hover:border-purple-500/50 hover:bg-white/10 text-left"
            >
              {/* Decorative background */}
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl transition group-hover:bg-purple-500/20" />

              {/* Content */}
              <div className="relative z-10">
                {/* Clan Name and Icon */}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
                      {clan.GuildName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Seq: {clan.ClanInfoSeqNo} | Guild ID: {clan.GuildID}
                    </p>
                  </div>
                  <Shield className="h-6 w-6 text-purple-400 opacity-60 group-hover:opacity-100 transition" />
                </div>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-xs text-slate-400">Miembros</p>
                    <p className="font-bold text-cyan-400">{clan.members || 0}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <p className="text-xs text-slate-400">Wins/Losses</p>
                    <p className="font-bold"><span className="text-emerald-400">{clan.stats?.totalWins || 0}</span><span className="text-slate-400">/</span><span className="text-rose-400">{clan.stats?.totalLosses || 0}</span></p>
                  </div>
                </div>

                {/* Leader Info */}
                {clan.leader ? (
                  <div className="mb-4 rounded-xl bg-white/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">Líder</span>
                    </div>
                    <p className="font-semibold text-white">{clan.leader.NickName}</p>
                    <div className="mt-2 flex gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Sword className="h-3 w-3" /> {clan.leader.kills.toLocaleString()} kills
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" /> {clan.leader.deaths.toLocaleString()} muertes
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Sin líder asignado</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-xs text-slate-400">Haz clic para más detalles</span>
                  <Users className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && selectedClan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0e17] shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/5 bg-gradient-to-r from-purple-900/50 to-cyan-900/50 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Shield className="h-6 w-6 text-purple-400" />
                    {selectedClan.GuildName}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Seq: {selectedClan.ClanInfoSeqNo} | Guild ID: {selectedClan.GuildID}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Estadísticas de Guerra */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Victorias</p>
                  <p className="text-2xl font-bold text-emerald-400">{selectedClan.stats?.totalWins || 0}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Derrotas</p>
                  <p className="text-2xl font-bold text-rose-400">{selectedClan.stats?.totalLosses || 0}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Empates</p>
                  <p className="text-2xl font-bold text-yellow-400">{selectedClan.stats?.totalDraws || 0}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Miembros</p>
                  <p className="text-2xl font-bold text-cyan-400">{selectedClan.membersList?.length || 0}</p>
                </div>
              </div>

              {/* Estadísticas por Modo */}
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Estadísticas por Modo
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                    <p className="text-xs text-slate-400">TDM</p>
                    <p className="font-bold text-white">{selectedClan.stats?.tdmWins || 0}G - {selectedClan.stats?.tdmLosses || 0}P</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                    <p className="text-xs text-slate-400">TMM</p>
                    <p className="font-bold text-white">{selectedClan.stats?.tmmWins || 0}G - {selectedClan.stats?.tmmLosses || 0}P</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                    <p className="text-xs text-slate-400">CTF</p>
                    <p className="font-bold text-white">{selectedClan.stats?.ctfWins || 0}G - {selectedClan.stats?.ctfLosses || 0}P</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                    <p className="text-xs text-slate-400">TSV</p>
                    <p className="font-bold text-white">{selectedClan.stats?.tsvWins || 0}G - {selectedClan.stats?.tsvLosses || 0}P</p>
                  </div>
                </div>
              </div>

              {/* Líder */}
              {selectedClan.leader && (
                <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="h-5 w-5 text-amber-400" />
                    <h3 className="font-bold text-white">Líder del Clan</h3>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-lg">{selectedClan.leader.NickName}</p>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Kills</p>
                        <p className="text-xl font-bold text-emerald-400">{selectedClan.leader.kills.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Muertes</p>
                        <p className="text-xl font-bold text-rose-400">{selectedClan.leader.deaths.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Miembros */}
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Miembros ({Array.isArray(selectedClan.membersList) ? selectedClan.membersList.length : 0})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {!Array.isArray(selectedClan.membersList) || selectedClan.membersList.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No hay miembros cargados</p>
                  ) : (
                    selectedClan.membersList.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg bg-white/5 p-3 hover:bg-white/10 transition border border-white/5"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-white">{member.NickName}</p>
                        </div>
                        <div className="flex gap-4 text-right">
                          <div>
                            <p className="text-xs text-slate-400">K</p>
                            <p className="font-bold text-emerald-400">{member.kills.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">D</p>
                            <p className="font-bold text-rose-400">{member.deaths.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
