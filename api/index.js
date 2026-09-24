import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getPoolConnection, disconnect } from '../server/db.js';
import { authMiddleware } from '../server/auth.js';
import authRoutes from '../server/routes/auth.js';
import dataRoutes from '../server/routes/data.js';
import walletRoutes from '../server/routes/wallet.js';
import paymentsRoutes from '../server/routes/payments.js';
import refundRoutes from '../server/routes/refund.js';
import supportRoutes from '../server/routes/support.js';
import marketplaceRoutes from '../server/routes/marketplace.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/refund', refundRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/protected', authMiddleware, dataRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  try {
    await disconnect();
  } catch (e) {
    console.error('Error during shutdown:', e.message);
  }
  process.exit(0);
});

export default app;
