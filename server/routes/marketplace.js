import { Router } from 'express';

const router = Router();

// DESHABILITADO: Sistema de marketplace removido
// La tabla MarketplaceListings no existe en la base de datos
// Todos los endpoints del marketplace han sido deshabilitados por solicitud del usuario

// Los siguientes endpoints están deshabilitados:
// - POST /create-listing
// - GET /listings
// - GET /user/:username
// - GET /listing/:listingId
// - POST /purchase/:listingId
// - GET /transactions/:username
// - DELETE /listing/:listingId
// - GET /stats/:username

// Responder con error 503 si se intenta acceder a cualquier endpoint del marketplace
router.all('/*', (req, res) => {
  res.status(503).json({ error: 'El sistema de marketplace está deshabilitado. La tabla de base de datos no existe.' });
});

export default router;
