/**
 * Routes para COMBATARMS_WEB (Solo lectura)
 * No se modifica la base de datos, solo lectura de datos
 */

import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// ==========================================
// ACTIVIDADES
// ==========================================

// GET /api/combatarms-web/activities - Obtener actividades recientes
router.get('/activities', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const result = await query(`
      SELECT TOP ${limit}
        id,
        userId,
        type,
        createdAt
      FROM COMBATARMS_WEB.dbo.activity
      ORDER BY createdAt DESC
      OFFSET ${offset} ROWS
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/combatarms-web/activities/:userId - Actividades de usuario
router.get('/activities/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const result = await query(`
      SELECT TOP ${limit}
        id,
        userId,
        type,
        createdAt
      FROM COMBATARMS_WEB.dbo.activity
      WHERE userId = ${parseInt(userId)}
      ORDER BY createdAt DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ADMIN USERS
// ==========================================

// GET /api/combatarms-web/admin-users - Listar todos los admins
router.get('/admin-users', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        userId,
        role,
        grantedBy,
        grantedAt
      FROM COMBATARMS_WEB.dbo.admin_users
      ORDER BY grantedAt DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// AUDITORIA
// ==========================================

// GET /api/combatarms-web/audit - Auditoria de admins
router.get('/audit', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    
    const result = await query(`
      SELECT TOP ${limit}
        id,
        actorId,
        actorName,
        action,
        targetId,
        targetName,
        detail,
        ip,
        createdAt
      FROM COMBATARMS_WEB.dbo.admin_audit
      ORDER BY createdAt DESC
      OFFSET ${offset} ROWS
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// CASTIGOS
// ==========================================

// GET /api/combatarms-web/punishments - Listar castigos
router.get('/punishments', async (req, res) => {
  try {
    const { limit = 100, offset = 0, status = 'active' } = req.query;
    
    let whereClause = '';
    if (status === 'active') {
      whereClause = ` WHERE (endsAt IS NULL OR endsAt > GETDATE()) AND liftedAt IS NULL`;
    } else if (status === 'lifted') {
      whereClause = ` WHERE liftedAt IS NOT NULL`;
    }
    
    const result = await query(`
      SELECT TOP ${limit}
        id,
        userId,
        nickname,
        type,
        reason,
        proof,
        issuedBy,
        issuedByName,
        startsAt,
        endsAt,
        liftedAt,
        liftedBy,
        liftedByName,
        liftReason,
        createdAt
      FROM COMBATARMS_WEB.dbo.punishments
      ${whereClause}
      ORDER BY createdAt DESC
      OFFSET ${offset} ROWS
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching punishments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/combatarms-web/punishments/:userId - Castigos de usuario
router.get('/punishments/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await query(`
      SELECT
        id,
        userId,
        nickname,
        type,
        reason,
        proof,
        issuedBy,
        issuedByName,
        startsAt,
        endsAt,
        liftedAt,
        liftedBy,
        liftedByName,
        liftReason,
        createdAt
      FROM COMBATARMS_WEB.dbo.punishments
      WHERE userId = ${parseInt(userId)}
      ORDER BY createdAt DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching user punishments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// SESIONES
// ==========================================

// GET /api/combatarms-web/sessions - Sesiones activas
router.get('/sessions', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const result = await query(`
      SELECT TOP ${limit}
        userId,
        expiresAt,
        mfaVersion,
        'REDACTED' as tokenHash
      FROM COMBATARMS_WEB.dbo.sessions
      WHERE expiresAt > (UNIX_TIMESTAMP(GETDATE())*1000)
      ORDER BY expiresAt DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DESCARGAS
// ==========================================

// GET /api/combatarms-web/downloads/releases - Releases disponibles
router.get('/downloads/releases', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        fileName,
        version,
        sizeBytes,
        publishedAt,
        publishedBy,
        downloadCount
      FROM COMBATARMS_WEB.dbo.download_releases
      ORDER BY publishedAt DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching releases:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/combatarms-web/downloads/stats - Estadisticas de descargas
router.get('/downloads/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT TOP 30
        day,
        releaseId,
        count
      FROM COMBATARMS_WEB.dbo.download_daily
      ORDER BY day DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching download stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// REPORTES
// ==========================================

// GET /api/combatarms-web/reports - Resenas de reportes
router.get('/reports', async (req, res) => {
  try {
    const { limit = 100, status } = req.query;
    
    let whereClause = '';
    if (status) {
      whereClause = ` WHERE status = '${status}'`;
    }
    
    const result = await query(`
      SELECT TOP ${limit}
        reportSeq,
        status,
        note,
        reviewedBy,
        reviewedByName,
        reviewedAt
      FROM COMBATARMS_WEB.dbo.report_reviews
      ${whereClause}
      ORDER BY reviewedAt DESC
    `);
    
    res.json({
      success: true,
      data: result.recordset || [],
      count: (result.recordset || []).length
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ESTADISTICAS GENERALES
// ==========================================

// GET /api/combatarms-web/stats - Estadisticas generales
router.get('/stats', async (req, res) => {
  try {
    const activities = await query(`SELECT COUNT(*) as count FROM COMBATARMS_WEB.dbo.activity`);
    const admins = await query(`SELECT COUNT(*) as count FROM COMBATARMS_WEB.dbo.admin_users`);
    const activePunishments = await query(`
      SELECT COUNT(*) as count FROM COMBATARMS_WEB.dbo.punishments 
      WHERE (endsAt IS NULL OR endsAt > GETDATE()) AND liftedAt IS NULL
    `);
    const activeSessions = await query(`
      SELECT COUNT(*) as count FROM COMBATARMS_WEB.dbo.sessions 
      WHERE expiresAt > (UNIX_TIMESTAMP(GETDATE())*1000)
    `);
    const totalDownloads = await query(`
      SELECT SUM(CAST(downloadCount as BIGINT)) as total FROM COMBATARMS_WEB.dbo.download_releases
    `);
    
    res.json({
      success: true,
      data: {
        totalActivities: activities.recordset?.[0]?.count || 0,
        totalAdmins: admins.recordset?.[0]?.count || 0,
        activePunishments: activePunishments.recordset?.[0]?.count || 0,
        activeSessions: activeSessions.recordset?.[0]?.count || 0,
        totalDownloads: totalDownloads.recordset?.[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
