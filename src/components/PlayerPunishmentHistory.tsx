import React, { useState } from 'react';
import './PlayerPunishmentHistory.css';

interface Punishment {
  id: number;
  userId: number;
  nickname: string | null;
  type: string;
  reason: string;
  proof: string | null;
  issuedBy: number | null;
  issuedByName: string | null;
  startsAt: string;
  endsAt: string | null;
  liftedAt: string | null;
  liftedBy: number | null;
  liftedByName: string | null;
  liftReason: string | null;
  createdAt: string;
}

const PlayerPunishmentHistory: React.FC = () => {
  const [searchUserId, setSearchUserId] = useState('');
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchPunishments = async () => {
    if (!searchUserId.trim()) {
      setError('Por favor ingresa un ID de usuario');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/combatarms-web/punishments/${searchUserId}`);
      if (!res.ok) throw new Error('No se encontraron castigos');

      const data = await res.json();
      setPunishments(data.data || []);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar castigos');
      setPunishments([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchPunishments();
    }
  };

  const isPunishmentActive = (punishment: Punishment) => {
    if (punishment.liftedAt) return false;
    if (!punishment.endsAt) return true; // Permanente
    return new Date(punishment.endsAt) > new Date();
  };

  const getRemainingTime = (endsAt: string | null) => {
    if (!endsAt) return 'Permanente';
    
    const end = new Date(endsAt);
    const now = new Date();
    
    if (end <= now) return 'Expirado';
    
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <div className="player-punishment-history">
      <div className="search-section">
        <h2>Historial de Castigos de Jugador</h2>
        <div className="search-box">
          <input
            type="number"
            placeholder="Ingresa el ID del usuario"
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
          <button
            onClick={searchPunishments}
            disabled={loading}
            className="search-btn"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {hasSearched && !error && punishments.length === 0 && (
        <div className="no-results">
          <p>No hay antecedentes de castigos para este usuario</p>
        </div>
      )}

      {punishments.length > 0 && (
        <div className="punishments-container">
          <h3>
            Total de castigos: <span className="count">{punishments.length}</span>
          </h3>

          <div className="filters-info">
            <span className="active-count">
              Activos: {punishments.filter(isPunishmentActive).length}
            </span>
            <span className="lifted-count">
              Levantados: {punishments.filter((p) => p.liftedAt).length}
            </span>
          </div>

          <div className="punishments-list">
            {punishments.map((punishment) => {
              const isActive = isPunishmentActive(punishment);
              return (
                <div
                  key={punishment.id}
                  className={`punishment-card punishment-${punishment.type.toLowerCase()} ${
                    isActive ? 'active' : 'inactive'
                  }`}
                >
                  <div className="card-header">
                    <div className="punishment-info">
                      <span className="punishment-type-badge">{punishment.type}</span>
                      <span className="punishment-id">ID: {punishment.id}</span>
                    </div>
                    <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                      {isActive ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <span className="label">Razon:</span>
                      <span className="value">{punishment.reason}</span>
                    </div>

                    {punishment.proof && (
                      <div className="info-row">
                        <span className="label">Evidencia:</span>
                        <span className="value proof">{punishment.proof}</span>
                      </div>
                    )}

                    <div className="info-row">
                      <span className="label">Empieza:</span>
                      <span className="value">
                        {new Date(punishment.startsAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="label">Termina:</span>
                      <span className="value">
                        {punishment.endsAt
                          ? new Date(punishment.endsAt).toLocaleString()
                          : 'Permanente'}
                        {isActive && punishment.endsAt && (
                          <span className="remaining">
                            ({getRemainingTime(punishment.endsAt)})
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="label">Asignado por:</span>
                      <span className="value">
                        {punishment.issuedByName || `Admin ${punishment.issuedBy}`}
                      </span>
                    </div>

                    <div className="info-row">
                      <span className="label">Fecha de asignacion:</span>
                      <span className="value">
                        {new Date(punishment.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {punishment.liftedAt && (
                      <>
                        <div className="divider" />
                        <div className="lifted-info">
                          <h4>Castigo Levantado</h4>
                          <div className="info-row">
                            <span className="label">Levantado por:</span>
                            <span className="value">
                              {punishment.liftedByName || `Admin ${punishment.liftedBy}`}
                            </span>
                          </div>
                          <div className="info-row">
                            <span className="label">Fecha:</span>
                            <span className="value">
                              {new Date(punishment.liftedAt).toLocaleString()}
                            </span>
                          </div>
                          {punishment.liftReason && (
                            <div className="info-row">
                              <span className="label">Razon:</span>
                              <span className="value">{punishment.liftReason}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerPunishmentHistory;
