import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

interface AdminStats {
  totalActivities: number;
  totalAdmins: number;
  activePunishments: number;
  activeSessions: number;
  totalDownloads: number;
}

interface AdminUser {
  userId: number;
  role: string;
  grantedBy: number | null;
  grantedAt: string;
}

interface Activity {
  id: number;
  userId: number;
  type: string;
  createdAt: string;
}

interface Punishment {
  id: number;
  userId: number;
  nickname: string | null;
  type: string;
  reason: string;
  issuedBy: number | null;
  issuedByName: string | null;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}

const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener estadisticas
      const statsRes = await fetch('/api/combatarms-web/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      // Obtener admins
      const adminsRes = await fetch('/api/combatarms-web/admin-users');
      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.data);
      }

      // Obtener actividades
      const activitiesRes = await fetch('/api/combatarms-web/activities?limit=20');
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData.data);
      }

      // Obtener castigos activos
      const punishmentsRes = await fetch('/api/combatarms-web/punishments?status=active&limit=20');
      if (punishmentsRes.ok) {
        const punishmentsData = await punishmentsRes.json();
        setPunishments(punishmentsData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-panel loading">Cargando datos...</div>;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Panel de Administracion</h1>
        <button className="refresh-btn" onClick={fetchData}>Actualizar</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Estadisticas
        </button>
        <button
          className={`tab-btn ${activeTab === 'admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Administradores ({admins.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          Actividades
        </button>
        <button
          className={`tab-btn ${activeTab === 'punishments' ? 'active' : ''}`}
          onClick={() => setActiveTab('punishments')}
        >
          Castigos ({punishments.length})
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'stats' && stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Actividades Totales</h3>
              <p className="stat-value">{stats.totalActivities.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>Administradores</h3>
              <p className="stat-value">{stats.totalAdmins}</p>
            </div>
            <div className="stat-card">
              <h3>Castigos Activos</h3>
              <p className="stat-value">{stats.activePunishments}</p>
            </div>
            <div className="stat-card">
              <h3>Sesiones Activas</h3>
              <p className="stat-value">{stats.activeSessions}</p>
            </div>
            <div className="stat-card">
              <h3>Descargas Totales</h3>
              <p className="stat-value">{stats.totalDownloads.toLocaleString()}</p>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Rol</th>
                  <th>Asignado por</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.userId}>
                    <td>{admin.userId}</td>
                    <td><span className="role-badge">{admin.role}</span></td>
                    <td>{admin.grantedBy || 'Sistema'}</td>
                    <td>{new Date(admin.grantedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {admins.length === 0 && <p className="empty-message">No hay administradores</p>}
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID Actividad</th>
                  <th>User ID</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{activity.id}</td>
                    <td>{activity.userId}</td>
                    <td><span className="activity-type">{activity.type}</span></td>
                    <td>{new Date(activity.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activities.length === 0 && <p className="empty-message">No hay actividades</p>}
          </div>
        )}

        {activeTab === 'punishments' && (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Jugador</th>
                  <th>Tipo</th>
                  <th>Razon</th>
                  <th>Empieza</th>
                  <th>Termina</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {punishments.map((punishment) => (
                  <tr key={punishment.id} className={`punishment-row punishment-${punishment.type}`}>
                    <td>{punishment.id}</td>
                    <td>{punishment.nickname || `User ${punishment.userId}`}</td>
                    <td><span className="punishment-badge">{punishment.type}</span></td>
                    <td>{punishment.reason}</td>
                    <td>{new Date(punishment.startsAt).toLocaleDateString()}</td>
                    <td>{punishment.endsAt ? new Date(punishment.endsAt).toLocaleDateString() : 'Permanente'}</td>
                    <td>{punishment.issuedByName || 'Sistema'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {punishments.length === 0 && <p className="empty-message">No hay castigos activos</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
