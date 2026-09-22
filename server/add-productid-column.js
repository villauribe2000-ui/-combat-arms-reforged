import { query } from './db.js';

async function addProductIdColumn() {
  try {
    console.log('[MIGRATION] Agregando columna productId a MarketplaceListings...');
    
    // Verificar si la columna ya existe
    const checkResult = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MarketplaceListings' AND COLUMN_NAME = 'productId'`
    );

    if (checkResult.recordset.length > 0) {
      console.log('[MIGRATION] La columna productId ya existe. Saltando.');
      return;
    }

    // Agregar la columna
    await query(
      `ALTER TABLE MarketplaceListings ADD productId INT NULL`
    );

    console.log('[MIGRATION] ✓ Columna productId agregada exitosamente');

    // Poblar productId para listings existentes
    console.log('[MIGRATION] Poblando productId para publicaciones existentes...');
    
    const listings = await query(
      `SELECT id, purchaseLogId FROM MarketplaceListings WHERE productId IS NULL`
    );

    let updated = 0;
    for (const listing of listings.recordset) {
      try {
        const purchaseResult = await query(
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
        console.warn(`[MIGRATION] No se pudo obtener ProductID para listing ${listing.id}:`, e.message);
      }
    }

    console.log(`[MIGRATION] ✓ ${updated} publicaciones actualizadas con productId`);
    console.log('[MIGRATION] Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('[MIGRATION] Error durante la migración:', error);
    process.exit(1);
  }
}

addProductIdColumn();
