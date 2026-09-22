import { query, queryVisms } from './db.js';

async function fixProductIds() {
  try {
    console.log('[FIX] Buscando publicaciones sin productId...');
    
    // Obtener todas las publicaciones sin productId
    const listingsWithoutProductId = await query(
      `SELECT id, purchaseLogId FROM MarketplaceListings WHERE productId IS NULL`
    );

    console.log(`[FIX] Encontradas ${listingsWithoutProductId.recordset.length} publicaciones sin productId`);

    if (listingsWithoutProductId.recordset.length === 0) {
      console.log('[FIX] No hay publicaciones que actualizar');
      process.exit(0);
    }

    let updated = 0;
    for (const listing of listingsWithoutProductId.recordset) {
      try {
        console.log(`[FIX] Obteniendo ProductID para purchaseLogId ${listing.purchaseLogId}...`);
        
        const purchaseResult = await queryVisms(
          `SELECT ProductNo FROM VISMS_PurchaseLog WHERE SRL = @purchaseLogId`,
          { purchaseLogId: listing.purchaseLogId }
        );

        if (purchaseResult.recordset.length > 0) {
          const productId = purchaseResult.recordset[0].ProductNo;
          console.log(`[FIX] Encontrado ProductID ${productId} para listing ${listing.id}`);
          
          await query(
            `UPDATE MarketplaceListings SET productId = @productId WHERE id = @id`,
            { productId, id: listing.id }
          );
          updated++;
        } else {
          console.warn(`[FIX] No se encontró ProductID para purchaseLogId ${listing.purchaseLogId}`);
        }
      } catch (e) {
        console.error(`[FIX] Error procesando listing ${listing.id}:`, e.message);
      }
    }

    console.log(`[FIX] ✓ ${updated} publicaciones actualizadas con productId`);
    process.exit(0);
  } catch (error) {
    console.error('[FIX] Error fatal:', error);
    process.exit(1);
  }
}

fixProductIds();
