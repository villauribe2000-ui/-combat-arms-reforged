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

// Endpoint para obtener listados - retorna lista vacía
router.get('/listings', (req, res) => {
  res.json({
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    }
  });
});

// Responder con error 503 si se intenta crear, comprar o modificar
router.all('/*', (req, res) => {
  if (req.method === 'GET') {
    // Para GET, retorna datos vacíos
    res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
  } else {
    // Para POST, PUT, DELETE - retorna error de mantenimiento
    res.status(503).json({ error: 'El sistema de marketplace está en mantenimiento.' });
  }
});

export default router;
