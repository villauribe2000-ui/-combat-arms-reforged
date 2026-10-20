import 'dotenv/config';
// Force rebuild - 2026-10-10 17:05:00Z
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPoolConnection, disconnect, query, queryVisms } from './db.js';
import { authMiddleware } from './auth.js';
import authRoutes from './routes/auth.js';
import authCombatarmsRoutes, { ensureRegistrationTable } from './routes/auth-combatarms.js';
import { ensureRankMarkTable } from './rank-mark.js';
import dataRoutes from './routes/data.js';
import walletRoutes from './routes/wallet.js';
import paymentsRoutes from './routes/payments.js';
import refundRoutes from './routes/refund.js';
import supportRoutes from './routes/support.js';
import marketplaceRoutes from './routes/marketplace.js';
import combatarmsWebRoutes from './routes/combatarms-web.js';
import adminReadRoutes from './routes/admin-read.js';
import eventsAdminRoutes from './routes/events-admin.js';
import noticesAdminRoutes from './routes/notices-admin.js';
import referralRoutes, { ensureReferralTables } from './routes/referral.js';
import promoRoutes, { ensurePromoTables } from './routes/promo.js';
// import birthdayRoutes from './routes/birthdays.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check (debe estar ANTES del catch-all)
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.json({ status: 'ok', version: '1.0.2' });
});

// Version endpoint (debe estar ANTES del catch-all)
app.get('/api/version', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  console.log('[VERSION] Endpoint /api/version llamado');
  res.json({ 
    version: '1.0.2', 
    buildTimestamp: '2026-10-10T17:15:00Z', 
    deployed: true,
    frontendBuild: 'check-index.html',
    note: 'Frontend files served from dist/'
  });
});

if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(express.static(path.join(__dirname, '../dist')));
  app.use('/assets', express.static(path.join(__dirname, '../dist/assets')));
  app.use('/src/assets', express.static(path.join(__dirname, '../src/assets')));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth-combatarms', authCombatarmsRoutes);
app.use('/api/admin', noticesAdminRoutes);
app.use('/api/admin', eventsAdminRoutes);
app.use('/api/admin', adminReadRoutes);
app.use('/api', dataRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/refund', refundRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/combatarms-web', combatarmsWebRoutes);
app.use('/api/referral', authMiddleware, referralRoutes);
app.use('/api/promo', authMiddleware, promoRoutes);
app.use('/api/protected', authMiddleware, dataRoutes);

if (!process.env.VERCEL) {
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Ejecutar migraciones
// DESHABILITADO: Las migraciones de MarketplaceListings han sido comentadas
// La tabla MarketplaceListings no existe en la base de datos actual
async function runMigrations() {
  try {
    console.log('[MIGRATION] ✓ Migraciones deshabilitadas - ejecutar init-db.js manualmente si es necesario');
    // await initializeTables();
  } catch (error) {
    console.error('[MIGRATION] Error durante migraciones:', error.message);
  }
}

/*
// CÓDIGO DE MIGRACIÓN ORIGINAL - DESHABILITADO
async function runMigrationsOriginal() {
  try {
    console.log('[MIGRATION] Verificando si es necesaria migración de productId...');
    
    // Verificar si la columna productId existe
    const checkResult = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MarketplaceListings' AND COLUMN_NAME = 'productId'`
    );

    if (checkResult.recordset.length === 0) {
      console.log('[MIGRATION] Agregando columna productId a MarketplaceListings...');
      
      try {
        await query(
          `ALTER TABLE MarketplaceListings ADD productId INT NULL`
        );
        console.log('[MIGRATION] ✓ Columna productId agregada');
      } catch (e) {
        console.warn('[MIGRATION] No se pudo agregar columna (puede ya existir):', e.message);
      }
    } else {
      console.log('[MIGRATION] ✓ La columna productId ya existe');
    }

    // Poblar productId para listings existentes
    try {
      const listingsWithoutProductId = await query(
        `SELECT id, purchaseLogId FROM MarketplaceListings WHERE productId IS NULL`
      );

      if (listingsWithoutProductId.recordset.length > 0) {
        console.log(`[MIGRATION] Poblando productId para ${listingsWithoutProductId.recordset.length} publicaciones...`);
        
        let updated = 0;
        for (const listing of listingsWithoutProductId.recordset) {
          try {
            const purchaseResult = await queryVisms(
              `SELECT ProductNo FROM VISMS_PurchaseLog WHERE SRL = @purchaseLogId`,
              { purchaseLogId: listing.purchaseLogId }
            );

            if (purchaseResult.recordset.length > 0) {
              const productId = purchaseResult.recordset[0].ProductNo;
              await query(
                `UPDATE MarketplaceListings SET productId = @productId WHERE id = @id`,
                { productId, id: listing.id }
              );
              updated++;
            }
          } catch (e) {
            console.warn(`[MIGRATION] No se pudo obtener ProductID para listing ${listing.id}`);
          }
        }
        console.log(`[MIGRATION] ✓ ${updated} publicaciones actualizadas`);
      }
    } catch (e) {
      console.warn('[MIGRATION] No se pudo poblar productId:', e.message);
    }

    console.log('[MIGRATION] ✓ Migraciones completadas');
  } catch (error) {
    console.error('[MIGRATION] Error durante migraciones:', error.message);
  }
}
*/

// Start server
async function start() {
  try {
    // Intentar verificar conexión a SQL Server (pero no es crítico)
    try {
      await getPoolConnection();
      console.log('✓ Base de datos conectada');
      
      // Ejecutar migraciones solo si BD está disponible
      await runMigrations();
      try {
        await ensureReferralTables();
        console.log('[REFERRAL] Tablas listas');
      } catch (referralError) {
        console.warn('[REFERRAL] No se pudieron preparar las tablas:', referralError.message);
      }
      try {
        await ensurePromoTables();
        console.log('[PROMO] Tablas listas');
      } catch (promoError) {
        console.warn('[PROMO] No se pudieron preparar las tablas:', promoError.message);
      }
      try {
        await ensureRegistrationTable();
        console.log('[REGISTER] Límite de cuentas listo');
      } catch (registrationError) {
        console.warn('[REGISTER] No se pudo preparar el límite de cuentas:', registrationError.message);
      }
      try {
        await ensureRankMarkTable();
        console.log('[RANK MARK] Logo FM listo');
      } catch (rankMarkError) {
        console.warn('[RANK MARK] No se pudo preparar el logo FM:', rankMarkError.message);
      }
    } catch (dbError) {
      console.warn('⚠️ Advertencia: No se pudo conectar a la BD');
      console.warn('El servidor iniciará sin BD, pero algunas funciones no funcionarán');
    }

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Frontend: http://localhost:${PORT}`);
      console.log(`✓ API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Error crítico al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await disconnect();
  process.exit(0);
});

export default app;

if (!process.env.VERCEL) {
  start();
}
