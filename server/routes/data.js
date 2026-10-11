import { Router } from 'express';
import { query, queryGuildDB, queryVisms, queryWeb, getUserOidByUsername } from '../db.js';

const router = Router();

// Get all tournaments (usar tabla existente)
router.get('/tournaments', async (req, res) => {
  try {
    // Usar tabla CBT_GameMode como referencia de modos/torneos
    const result = await query(
      `SELECT TOP 10 * FROM CBT_GameMode`
    );
    res.json(result.recordset.slice(0, 3) || []);
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.json([]);
  }
});

// Get top players
router.get('/players/top', async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    const result = await query(
      `SELECT TOP (@limit) oidUser as id, strNexonID as username, NickName, KillCnt as kills, DeadCnt as deaths, WinCnt as wins, LoseCnt as losses, Exp as userExp, UserType
       FROM CBT_User
       WHERE DeleteDate IS NULL
       ORDER BY KillCnt DESC`,
      { limit: parseInt(limit) }
    );

    // Obtener información de rangos para cada jugador
    const playersWithRanks = await Promise.all(
      result.recordset.map(async (player) => {
        let rank = 0;
        let rankName = 'TRAINEE';
        let isGM = false;

        if (player.UserType === 1) {
          isGM = true;
          rankName = 'Game Master';
        } else {
          try {
            const gradeResult = await query(
              `SELECT TOP 1 GradeLevel as rank, GradeName as rankName 
               FROM CBT_GradeInfo 
               WHERE @userExp >= MinExp AND @userExp <= MaxExp`,
              { userExp: player.userExp || 0 }
            );
            if (gradeResult.recordset.length > 0) {
              rank = gradeResult.recordset[0].rank || 0;
              rankName = gradeResult.recordset[0].rankName || 'TRAINEE';
            }
          } catch (e) {
            console.warn(`Error getting rank for player ${player.username}:`, e.message);
            rank = 0;
            rankName = 'TRAINEE';
          }
        }

        return {
          ...player,
          rank,
          rankName,
          isGM
        };
      })
    );

    res.json(playersWithRanks);
  } catch (error) {
    console.error('Get top players error:', error);
    res.json([]);
  }
});

// Get all players with pagination
router.get('/players', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT oidUser as id, strNexonID as username, NickName, KillCnt as kills, DeadCnt as deaths, WinCnt as wins, LoseCnt as losses
       FROM CBT_User
       WHERE DeleteDate IS NULL
       ORDER BY KillCnt DESC
       OFFSET @offset ROWS
       FETCH NEXT @limit ROWS ONLY`,
      { offset, limit }
    );

    const countResult = await query('SELECT COUNT(*) as total FROM CBT_User WHERE DeleteDate IS NULL');
    const total = countResult.recordset[0].total;

    res.json({
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get players error:', error);
    res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
  }
});

// Get player by id
router.get('/players/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT oidUser as id, strNexonID as username, NickName, KillCnt as kills, DeadCnt as deaths, WinCnt as wins, LoseCnt as losses
       FROM CBT_User WHERE oidUser = @id`,
      { id: parseInt(req.params.id) }
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({ error: 'Error al obtener jugador' });
  }
});

// Get total players count
router.get('/stats/players-count', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as total FROM CBT_User WHERE DeleteDate IS NULL');
    res.json({ total: result.recordset[0].total });
  } catch (error) {
    console.error('Get players count error:', error);
    res.json({ total: 0 });
  }
});

// Get all clans with leader info
router.get('/clans', async (req, res) => {
  try {
    const search = req.query.search || '';
    
    // Usar la BD NX_GuildMaster que tiene los nombres reales
    let sql = `SELECT TOP 100 oidGuild, strName, strID, dn_strCharacterName_master, oidUser_master
               FROM dbo.gdt_Guild`;
    
    const params = {};
    
    if (search) {
      sql += ` WHERE strName LIKE @search OR strID LIKE @search`;
      params.search = `%${search}%`;
    }
    
    sql += ` ORDER BY oidGuild DESC`;
    
    console.log('Querying clans with:', sql);
    const result = await queryGuildDB(sql, params);
    
    console.log('Found clans from NX_GuildMaster:', result.recordset.length);
    
    // Construir respuesta con conteo real de miembros y líder
    const clansWithInfo = await Promise.all(
      result.recordset.map(async (clan) => {
        // Contar miembros reales
        let memberCount = 0;
        try {
          const countResult = await queryGuildDB(
            `SELECT COUNT(*) as count FROM dbo.gdt_Member WHERE oidGuild = @guildId`,
            { guildId: clan.oidGuild }
          );
          memberCount = countResult.recordset[0]?.count || 0;
        } catch (e) {
          console.log('Error counting members:', e);
        }
        
        // Obtener info del líder desde COMBATARMS
        let leader = null;
        if (clan.oidUser_master) {
          try {
            const leaderResult = await query(
              `SELECT oidUser, strNexonID as username, NickName, KillCnt as kills, DeadCnt as deaths FROM CBT_User WHERE oidUser = @oidUser`,
              { oidUser: clan.oidUser_master }
            );
            if (leaderResult.recordset.length > 0) {
              leader = leaderResult.recordset[0];
            }
          } catch (e) {
            console.log('Error getting leader info:', e);
          }
        }
        
        // Obtener estadísticas del clan desde COMBATARMS
        let stats = {
          totalWins: 0,
          totalLosses: 0,
          totalDraws: 0,
          tdmWins: 0,
          tdmLosses: 0,
          tmmWins: 0,
          tmmLosses: 0,
          ctfWins: 0,
          ctfLosses: 0,
          tsvWins: 0,
          tsvLosses: 0,
          exp: 0,
          points: 0
        };
        
        try {
          const statsResult = await query(
            `SELECT WinCnt, LoseCnt, DrawCnt, TDMWinCnt, TDMLoseCnt, TMMWinCnt, TMMLoseCnt, CTFWinCnt, CTFLoseCnt, TSVWinCnt, TSVLoseCnt, Exp, Point
             FROM CBT_ClanInfo WHERE oiduser_group = @guildId`,
            { guildId: clan.oidGuild }
          );
          
          if (statsResult.recordset.length > 0) {
            const clanStats = statsResult.recordset[0];
            stats = {
              totalWins: clanStats.WinCnt || 0,
              totalLosses: clanStats.LoseCnt || 0,
              totalDraws: clanStats.DrawCnt || 0,
              tdmWins: clanStats.TDMWinCnt || 0,
              tdmLosses: clanStats.TDMLoseCnt || 0,
              tmmWins: clanStats.TMMWinCnt || 0,
              tmmLosses: clanStats.TMMLoseCnt || 0,
              ctfWins: clanStats.CTFWinCnt || 0,
              ctfLosses: clanStats.CTFLoseCnt || 0,
              tsvWins: clanStats.TSVWinCnt || 0,
              tsvLosses: clanStats.TSVLoseCnt || 0,
              exp: clanStats.Exp || 0,
              points: clanStats.Point || 0
            };
          }
        } catch (e) {
          console.log('Error getting clan stats:', e);
        }
        
        return {
          ClanInfoSeqNo: clan.oidGuild,
          GuildID: clan.oidGuild,
          GuildName: clan.strName || `Guild ${clan.oidGuild}`,
          MasterCharName: clan.dn_strCharacterName_master || 'N/A',
          members: memberCount,
          leader,
          stats
        };
      })
    );
    
    res.json(clansWithInfo);
  } catch (error) {
    console.error('Get clans error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get clan details by ID
router.get('/clans/:guildId', async (req, res) => {
  try {
    const guildId = parseInt(req.params.guildId);
    
    const clanResult = await queryGuildDB(
      `SELECT oidGuild, strName, strID, dn_strCharacterName_master, oidUser_master
       FROM dbo.gdt_Guild WHERE oidGuild = @guildId`,
      { guildId }
    );
    
    if (clanResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Clan no encontrado' });
    }
    
    const clan = clanResult.recordset[0];
    
    // Obtener info del líder desde COMBATARMS
    let leader = null;
    if (clan.oidUser_master) {
      try {
        const leaderResult = await query(
          `SELECT oidUser, strNexonID as username, NickName, KillCnt as kills, DeadCnt as deaths FROM CBT_User WHERE oidUser = @oidUser`,
          { oidUser: clan.oidUser_master }
        );
        if (leaderResult.recordset.length > 0) {
          leader = leaderResult.recordset[0];
        }
      } catch (e) {
        console.log('Error getting leader info:', e);
      }
    }
    
    // Obtener miembros del clan
    let members = [];
    try {
      const membersResult = await queryGuildDB(
        `SELECT TOP 50 m.oidUser, m.dn_strCharacterName, m.dateCreated
         FROM dbo.gdt_Member m
         WHERE m.oidGuild = @guildId
         ORDER BY m.dateCreated DESC`,
        { guildId }
      );
      
      // Enriquecer con información del jugador desde COMBATARMS
      members = await Promise.all(
        membersResult.recordset.map(async (member) => {
          try {
            const playerResult = await query(
              `SELECT oidUser, strNexonID as username, NickName, KillCnt as kills, DeadCnt as deaths FROM CBT_User WHERE oidUser = @oidUser`,
              { oidUser: member.oidUser }
            );
            if (playerResult.recordset.length > 0) {
              const player = playerResult.recordset[0];
              return {
                id: member.oidUser,
                username: player.username,
                NickName: player.NickName,
                kills: player.kills,
                deaths: player.deaths
              };
            }
          } catch (e) {
            console.log('Error getting player info:', e);
          }
          return {
            id: member.oidUser,
            username: member.dn_strCharacterName || `User_${member.oidUser}`,
            NickName: member.dn_strCharacterName || `User_${member.oidUser}`,
            kills: 0,
            deaths: 0
          };
        })
      );
    } catch (e) {
      console.log('Error getting members:', e);
    }
    
    // Obtener estadísticas del clan desde COMBATARMS
    let stats = {
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      tdmWins: 0,
      tdmLosses: 0,
      tmmWins: 0,
      tmmLosses: 0,
      ctfWins: 0,
      ctfLosses: 0,
      tsvWins: 0,
      tsvLosses: 0,
      exp: 0,
      points: 0
    };
    
    try {
      const statsResult = await query(
        `SELECT WinCnt, LoseCnt, DrawCnt, TDMWinCnt, TDMLoseCnt, TMMWinCnt, TMMLoseCnt, CTFWinCnt, CTFLoseCnt, TSVWinCnt, TSVLoseCnt, Exp, Point
         FROM CBT_ClanInfo WHERE oiduser_group = @guildId`,
        { guildId }
      );
      
      if (statsResult.recordset.length > 0) {
        const clanStats = statsResult.recordset[0];
        stats = {
          totalWins: clanStats.WinCnt || 0,
          totalLosses: clanStats.LoseCnt || 0,
          totalDraws: clanStats.DrawCnt || 0,
          tdmWins: clanStats.TDMWinCnt || 0,
          tdmLosses: clanStats.TDMLoseCnt || 0,
          tmmWins: clanStats.TMMWinCnt || 0,
          tmmLosses: clanStats.TMMLoseCnt || 0,
          ctfWins: clanStats.CTFWinCnt || 0,
          ctfLosses: clanStats.CTFLoseCnt || 0,
          tsvWins: clanStats.TSVWinCnt || 0,
          tsvLosses: clanStats.TSVLoseCnt || 0,
          exp: clanStats.Exp || 0,
          points: clanStats.Point || 0
        };
      }
    } catch (e) {
      console.log('Error getting clan stats:', e);
    }
    
    res.json({
      ClanInfoSeqNo: clan.oidGuild,
      GuildID: clan.oidGuild,
      GuildName: clan.strName || `Guild ${clan.oidGuild}`,
      MasterCharName: clan.dn_strCharacterName_master || 'N/A',
      members: members.length,
      membersList: members,
      leader,
      stats
    });
  } catch (error) {
    console.error('Get clan details error:', error);
    res.status(500).json({ error: 'Error al obtener detalles del clan' });
  }
});

// Get player equipment/avatar
router.get('/players/:id/equipment', async (req, res) => {
  try {
    const result = await query(
      `SELECT oidUser, AssultItemNo, SubGunItemNo, KnifeItemNo, BombItemNo, 
              HelmetItemNo, FaceItemNo, GoggleItemNo, CamoItemNo, VestItemNo
       FROM CBT_UserEquipItems WHERE oidUser = @id`,
      { id: parseInt(req.params.id) }
    );

    if (result.recordset.length === 0) {
      return res.json({
        AssultItemNo: 1000,
        SubGunItemNo: 1000,
        KnifeItemNo: 3000,
        BombItemNo: 4000,
        HelmetItemNo: 2000,
        FaceItemNo: 3000,
        GoggleItemNo: 5000,
        CamoItemNo: 1000,
        VestItemNo: 5000,
      });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ error: 'Error al obtener equipamiento' });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const result = await query(
      `SELECT TOP 20 * FROM CBT_ProductInfo`
    );
    res.json(result.recordset || []);
  } catch (error) {
    console.error('Get products error:', error);
    res.json([]);
  }
});

// Get purchase history for a user
router.get('/purchase-history/:username', async (req, res) => {
  try {
    const { username } = req.params;

    console.log(`[PURCHASE HISTORY] Buscando compras para usuario: ${username}`);

    // Obtener oidUser - usar función helper que busca en ambas tablas
    const oidUser = await getUserOidByUsername(username);

    console.log(`[PURCHASE HISTORY] oidUser encontrado: ${oidUser}`);

    if (!oidUser) {
      console.log(`[PURCHASE HISTORY] ❌ Usuario no encontrado: ${username}`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener últimas 50 compras desde VISMS_PurchaseLog (está en BD VISMS)
    let purchaseResult;
    try {
      purchaseResult = await queryVisms(
        `SELECT TOP 50 
          pl.SRL,
          pl.ProductNo,
          pl.TotalPrice,
          pl.RegDate,
          pl.strNexonID,
          pl.oid
         FROM VISMS_PurchaseLog pl
         WHERE pl.oid = @oidUser
         ORDER BY pl.RegDate DESC`,
        { oidUser }
      );
      console.log(`[PURCHASE HISTORY] Compras encontradas en VISMS_PurchaseLog: ${purchaseResult.recordset.length}`);
    } catch (e) {
      console.error(`[PURCHASE HISTORY] ❌ Error querying VISMS_PurchaseLog para user ${oidUser}:`, e.message);
      // Retornar lista vacía si no hay histórico
      return res.json([]);
    }

    if (!purchaseResult.recordset || purchaseResult.recordset.length === 0) {
      console.log(`[PURCHASE HISTORY] Sin compras para oidUser ${oidUser}`);
      return res.json([]);
    }

    // Obtener nombres de productos desde COMBATARMS
    const purchases = await Promise.all(
      purchaseResult.recordset.map(async (purchase) => {
        let productName = `Producto ${purchase.ProductNo}`;
        
        try {
          const productResult = await query(
            `SELECT ProductName FROM CBT_ProductInfo WHERE ProductID = @productId`,
            { productId: purchase.ProductNo }
          );
          
          if (productResult.recordset.length > 0) {
            productName = productResult.recordset[0].ProductName;
          }
        } catch (e) {
          console.warn(`Could not get product name for ${purchase.ProductNo}`);
        }

        return {
          id: purchase.SRL,
          productId: purchase.ProductNo,
          productName: productName,
          nxSpent: purchase.TotalPrice || 0,
          purchaseDate: purchase.RegDate,
          formattedDate: new Date(purchase.RegDate).toLocaleString('es-ES'),
        };
      })
    );

    console.log(`[PURCHASE HISTORY] ✓ Retornando ${purchases.length} compras`);
    res.json(purchases);
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({ error: 'Error al obtener historial de compras', details: error.message });
  }
});

// Get available items for selling (purchases that haven't been refunded or sold)
router.get('/available-items/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Obtener oidUser - usar función helper que busca en ambas tablas
    const oidUser = await getUserOidByUsername(username);
    
    if (!oidUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Primero obtener todos los IDs de compras que han sido reembolsadas (pending o approved)
    const refundedPurchasesResult = await query(
      `SELECT DISTINCT purchaseLogId FROM RefundRequests WHERE oidUser = @oidUser AND status IN ('approved', 'pending')`,
      { oidUser }
    );

    const refundedIds = refundedPurchasesResult.recordset.map(r => r.purchaseLogId);
    console.log(`User ${username} has refunded purchases: ${refundedIds.join(', ')}`);

    // Obtener compras desde VISMS
    const purchaseResult = await queryVisms(
      `SELECT TOP 100
        pl.SRL,
        pl.ProductNo,
        pl.TotalPrice,
        pl.RegDate,
        pl.strNexonID
       FROM VISMS_PurchaseLog pl
       WHERE pl.oid = @oidUser
       ORDER BY pl.RegDate DESC`,
      { oidUser }
    );

    console.log(`Found ${purchaseResult.recordset.length} purchases for user ${username}`);

    // Filtrar items que no han sido reembolsados ni vendidos
    const items = await Promise.all(
      purchaseResult.recordset.map(async (purchase) => {
        // Si está en refunded list, skip
        if (refundedIds.includes(purchase.SRL)) {
          console.log(`Purchase ${purchase.SRL} has been refunded, skipping`);
          return null;
        }

        let productName = `Producto ${purchase.ProductNo}`;
        
        try {
          const productResult = await query(
            `SELECT ProductName FROM CBT_ProductInfo WHERE ProductID = @productId`,
            { productId: purchase.ProductNo }
          );
          
          if (productResult.recordset.length > 0) {
            productName = productResult.recordset[0].ProductName;
          }
        } catch (e) {
          console.warn(`Could not get product name for ${purchase.ProductNo}`);
        }

        return {
          purchaseLogId: purchase.SRL,
          productId: purchase.ProductNo,
          productName: productName,
          nxPaid: purchase.TotalPrice || 0,
          purchaseDate: purchase.RegDate,
          formattedDate: new Date(purchase.RegDate).toLocaleString('es-ES'),
        };
      })
    );

    // Filtrar nulos
    const availableItems = items.filter(item => item !== null);
    console.log(`Returning ${availableItems.length} available items for ${username}`);

    res.json(availableItems);
  } catch (error) {
    console.error('Get available items error:', error);
    res.status(500).json({ error: 'Error al obtener items disponibles', details: error.message });
  }
});

/*
// DESHABILITADO: Get marketplace status for a purchase (tabla MarketplaceListings no existe)
router.get('/purchase-marketplace-status/:purchaseLogId', async (req, res) => {
  try {
    const { purchaseLogId } = req.params;

    // DESHABILITADO: MarketplaceListings no existe en la BD
    res.json({
      isForSale: false,
      listing: null,
    });
    return;

    const result = await query(
      `SELECT id, status, createdAt, updatedAt, soldAt, soldTo
       FROM MarketplaceListings
       WHERE purchaseLogId = @purchaseLogId AND status IN ('active', 'sold')`,
      { purchaseLogId: parseInt(purchaseLogId) }
    );

    if (result.recordset.length === 0) {
      return res.json({
        isForSale: false,
        listing: null,
      });
    }

    const listing = result.recordset[0];
    res.json({
      isForSale: true,
      listing: {
        id: listing.id,
        status: listing.status,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        soldAt: listing.soldAt,
        soldTo: listing.soldTo,
      },
    });
  } catch (error) {
    console.error('Get marketplace status error:', error);
    res.status(500).json({ error: 'Error al obtener estado del marketplace' });
  }
});
*/

// ==========================================
// ENDPOINTS PARA RECOMPENSAS DE NIVEL - PERSISTENCIA EN combatarms_web SOLO
// ==========================================

// Obtener recompensas reclamadas del usuario
router.get('/claimed-rewards/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    console.log(`[CLAIMED REWARDS] Obteniendo recompensas reclamadas para: ${username}`);
    
    // Obtener oidUser usando la función helper
    const oidUser = await getUserOidByUsername(username);
    
    if (!oidUser) {
      console.log(`[CLAIMED REWARDS] ❌ Usuario no encontrado: ${username}`);
      return res.json([]);
    }
    
    // Obtener todas las recompensas reclamadas del usuario SOLO de combatarms_web
    const result = await queryWeb(
      `SELECT id, oidUser, username, level, nxAmount, claimedAt 
       FROM ClaimedLevelRewards 
       WHERE oidUser = @oidUser
       ORDER BY level ASC`,
      { oidUser }
    );
    
    console.log(`[CLAIMED REWARDS] ✓ Encontradas ${result.recordset.length} recompensas reclamadas`);
    res.json(result.recordset);
    
  } catch (error) {
    console.error('[CLAIMED REWARDS] Error:', error.message);
    res.json([]); // Devolver array vacío en caso de error
  }
});

// Reclamar recompensa de nivel - SOLO guardar en combatarms_web
router.post('/claim-level-reward', async (req, res) => {
  try {
    const { username, level, nxAmount } = req.body;
    
    console.log(`[CLAIM REWARD] Usuario: ${username}, Nivel: ${level}, NX: ${nxAmount}`);
    
    if (!username || level === undefined || !nxAmount) {
      return res.status(400).json({ error: 'Parámetros incompletos' });
    }
    
    // Obtener oidUser
    const oidUser = await getUserOidByUsername(username);
    
    if (!oidUser) {
      console.log(`[CLAIM REWARD] ❌ Usuario no encontrado: ${username}`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si ya fue reclamado (unique constraint en combatarms_web)
    const existingResult = await queryWeb(
      `SELECT id FROM ClaimedLevelRewards WHERE oidUser = @oidUser AND level = @level`,
      { oidUser, level }
    );
    
    if (existingResult.recordset.length > 0) {
      console.log(`[CLAIM REWARD] ⚠️ Recompensa ya reclamada: oidUser=${oidUser}, level=${level}`);
      return res.status(400).json({ 
        error: 'Esta recompensa ya ha sido reclamada',
        already_claimed: true 
      });
    }
    
    // Guardar SOLO en combatarms_web
    console.log(`[CLAIM REWARD] Guardando en combatarms_web...`);
    await queryWeb(
      `INSERT INTO ClaimedLevelRewards (oidUser, username, level, nxAmount, claimedAt)
       VALUES (@oidUser, @username, @level, @nxAmount, GETDATE())`,
      { oidUser, username, level, nxAmount }
    );
    console.log(`[CLAIM REWARD] ✓ Guardado en combatarms_web`);
    
    res.json({
      success: true,
      message: `+${nxAmount} NX reclamados del Nivel ${level}!`,
      level,
      nxAmount,
      oidUser
    });
    
  } catch (error) {
    console.error('[CLAIM REWARD] Error fatal:', error.message);
    res.status(500).json({ 
      error: 'Error al reclamar recompensa',
      details: error.message 
    });
  }
});

// ==========================================
// ENDPOINTS PARA CUMPLEAÑOS - REGALO ANUAL
// ==========================================

// Obtener info de cumpleaños del usuario
router.get('/birthday/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    console.log(`[BIRTHDAY] Obteniendo info de cumpleaños: ${username}`);
    
    const oidUser = await getUserOidByUsername(username);
    
    if (!oidUser) {
      console.log(`[BIRTHDAY] ❌ Usuario no encontrado: ${username}`);
      return res.json({
        registered: false,
        message: 'Usuario no registrado en cumpleaños'
      });
    }
    
    // Obtener datos de cumpleaños
    const result = await queryWeb(
      `SELECT oidUser, username, birthDate, lastClaimedYear, lastClaimedAt, nxAwarded
       FROM BirthdayRewards
       WHERE oidUser = @oidUser`,
      { oidUser }
    );
    
    if (result.recordset.length === 0) {
      console.log(`[BIRTHDAY] No registrado: ${username}`);
      return res.json({
        registered: false,
        message: 'Usuario no registrado en cumpleaños'
      });
    }
    
    const birthday = result.recordset[0];
    const birthDate = new Date(birthday.birthDate);
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Normalizar fechas (solo mes y día, sin hora)
    const birthMonth = birthDate.getMonth();
    const birthDay = birthDate.getDate();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    // Verificar si es cumpleaños HOY (comparar mes y día)
    const isBirthdayToday = (birthMonth === todayMonth && birthDay === todayDay);
    
    console.log(`[BIRTHDAY] Fecha ingresada: ${birthDate.toLocaleDateString()}`);
    console.log(`[BIRTHDAY] Hoy: ${today.toLocaleDateString()}`);
    console.log(`[BIRTHDAY] Comparación: mes ${birthMonth}==${todayMonth}, día ${birthDay}==${todayDay}`);
    console.log(`[BIRTHDAY] ¿Es cumpleaños hoy? ${isBirthdayToday}`);
    
    // Calcular próximo cumpleaños
    let nextBirthday = new Date(currentYear, birthMonth, birthDay);
    
    // Si el cumpleaños es HOY, el próximo es en 1 año
    if (isBirthdayToday) {
      nextBirthday = new Date(currentYear + 1, birthMonth, birthDay);
      console.log(`[BIRTHDAY] Es hoy, próximo es: ${nextBirthday.toLocaleDateString()}`);
    } 
    // Si ya pasó este año, el próximo es el próximo año
    else if (nextBirthday < today) {
      nextBirthday = new Date(currentYear + 1, birthMonth, birthDay);
      console.log(`[BIRTHDAY] Ya pasó, próximo es: ${nextBirthday.toLocaleDateString()}`);
    }
    
    // Calcular días restantes
    const daysUntilBirthday = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
    
    // Verificar si ya reclamó este año
    const alreadyClaimedThisYear = birthday.lastClaimedYear === currentYear;
    
    console.log(`[BIRTHDAY] ✓ Registro encontrado`);
    console.log(`  - Fecha: ${birthDate.toLocaleDateString()}`);
    console.log(`  - Es hoy: ${isBirthdayToday}`);
    console.log(`  - Ya reclamó: ${alreadyClaimedThisYear}`);
    console.log(`  - Días restantes: ${daysUntilBirthday}`);
    
    res.json({
      registered: true,
      oidUser: birthday.oidUser,
      username: birthday.username,
      birthDate: birthDate.toISOString().split('T')[0],
      birthDateFormatted: birthDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      isBirthdayToday,
      alreadyClaimed: alreadyClaimedThisYear,
      daysUntilBirthday,
      nxReward: birthday.nxAwarded,
      lastClaimedAt: birthday.lastClaimedAt
    });
    
  } catch (error) {
    console.error('[BIRTHDAY] Error:', error.message);
    res.status(500).json({ 
      error: 'Error al obtener datos de cumpleaños',
      details: error.message 
    });
  }
});

// Registrar fecha de cumpleaños
router.post('/birthday/register', async (req, res) => {
  try {
    const { username, birthDate } = req.body;
    
    console.log(`[BIRTHDAY REGISTER] Usuario: ${username}, Fecha: ${birthDate}`);
    
    if (!username || !birthDate) {
      return res.status(400).json({ error: 'Parámetros incompletos' });
    }
    
    const oidUser = await getUserOidByUsername(username);
    
    if (!oidUser) {
      console.log(`[BIRTHDAY REGISTER] ❌ Usuario no encontrado: ${username}`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si ya está registrado
    const existingResult = await queryWeb(
      `SELECT id FROM BirthdayRewards WHERE oidUser = @oidUser`,
      { oidUser }
    );
    
    if (existingResult.recordset.length > 0) {
      console.log(`[BIRTHDAY REGISTER] Actualizando registro existente`);
      // Actualizar
      await queryWeb(
        `UPDATE BirthdayRewards 
         SET birthDate = @birthDate, updatedAt = GETDATE()
         WHERE oidUser = @oidUser`,
        { oidUser, birthDate }
      );
    } else {
      console.log(`[BIRTHDAY REGISTER] Creando nuevo registro`);
      // Insertar
      await queryWeb(
        `INSERT INTO BirthdayRewards (oidUser, username, birthDate, createdAt, updatedAt)
         VALUES (@oidUser, @username, @birthDate, GETDATE(), GETDATE())`,
        { oidUser, username, birthDate }
      );
    }
    
    console.log(`[BIRTHDAY REGISTER] ✓ Registro guardado`);
    res.json({
      success: true,
      message: 'Fecha de cumpleaños registrada exitosamente',
      oidUser,
      birthDate
    });
    
  } catch (error) {
    console.error('[BIRTHDAY REGISTER] Error:', error.message);
    res.status(500).json({ 
      error: 'Error al registrar cumpleaños',
      details: error.message 
    });
  }
});

// Reclamar regalo de cumpleaños
router.post('/birthday/claim', async (req, res) => {
  try {
    const { username } = req.body;
    
    console.log(`[BIRTHDAY CLAIM] Reclamando regalo: ${username}`);
    
    if (!username) {
      return res.status(400).json({ error: 'Username requerido' });
    }
    
    const oidUser = await getUserOidByUsername(username);
    
    if (!oidUser) {
      console.log(`[BIRTHDAY CLAIM] ❌ Usuario no encontrado: ${username}`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Obtener datos de cumpleaños
    const birthdayResult = await queryWeb(
      `SELECT birthDate, lastClaimedYear, nxAwarded
       FROM BirthdayRewards
       WHERE oidUser = @oidUser`,
      { oidUser }
    );
    
    if (birthdayResult.recordset.length === 0) {
      console.log(`[BIRTHDAY CLAIM] ❌ Usuario sin registro de cumpleaños`);
      return res.status(404).json({ error: 'Usuario no registrado en cumpleaños' });
    }
    
    const birthday = birthdayResult.recordset[0];
    const birthDate = new Date(birthday.birthDate);
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Normalizar fechas (solo mes y día)
    const birthMonth = birthDate.getMonth();
    const birthDay = birthDate.getDate();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    // Verificar si es cumpleaños HOY (comparar mes y día)
    const isBirthdayToday = (birthMonth === todayMonth && birthDay === todayDay);
    
    if (!isBirthdayToday) {
      console.log(`[BIRTHDAY CLAIM] ⚠️ No es cumpleaños hoy`);
      return res.status(400).json({ 
        error: 'Aún no es tu cumpleaños',
        isBirthdayToday: false
      });
    }
    
    // Verificar si ya reclamó este año
    if (birthday.lastClaimedYear === currentYear) {
      console.log(`[BIRTHDAY CLAIM] ⚠️ Ya reclamó este año`);
      return res.status(400).json({ 
        error: 'Ya reclamaste tu regalo de cumpleaños este año',
        alreadyClaimed: true
      });
    }
    
    const nxAmount = birthday.nxAwarded || 30000;
    
    // Actualizar BD con fecha de reclamación
    console.log(`[BIRTHDAY CLAIM] Guardando reclamación en combatarms_web...`);
    await queryWeb(
      `UPDATE BirthdayRewards 
       SET lastClaimedYear = @currentYear, lastClaimedAt = GETDATE()
       WHERE oidUser = @oidUser`,
      { oidUser, currentYear }
    );
    console.log(`[BIRTHDAY CLAIM] ✓ Reclamación guardada en combatarms_web`);
    
    // Sumar NX en VISMS
    console.log(`[BIRTHDAY CLAIM] Sumando ${nxAmount} NX a VISMS...`);
    try {
      await queryVisms(
        `UPDATE VISMS_UserList 
         SET RealBalance = RealBalance + @nxAmount 
         WHERE oid = @oidUser`,
        { oidUser, nxAmount }
      );
      console.log(`[BIRTHDAY CLAIM] ✓ NX sumado en VISMS correctamente`);
    } catch (vismsError) {
      console.error(`[BIRTHDAY CLAIM] ❌ Error sumando NX en VISMS:`, vismsError.message);
      // Revertir la reclamación en BD si falla VISMS
      await queryWeb(
        `UPDATE BirthdayRewards 
         SET lastClaimedYear = NULL, lastClaimedAt = NULL
         WHERE oidUser = @oidUser`,
        { oidUser }
      );
      return res.status(500).json({ 
        error: 'Error al sumar NX a tu cuenta. Intenta de nuevo.',
        details: vismsError.message 
      });
    }
    
    res.json({
      success: true,
      message: `¡Feliz cumpleaños! Recibiste ${nxAmount.toLocaleString()} NX`,
      nxAmount,
      oidUser,
      username
    });
    
  } catch (error) {
    console.error('[BIRTHDAY CLAIM] Error:', error.message);
    res.status(500).json({ 
      error: 'Error al reclamar regalo',
      details: error.message 
    });
  }
});

export default router;
