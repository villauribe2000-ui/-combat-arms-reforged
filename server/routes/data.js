import { Router } from 'express';
import { query, queryGuildDB, queryVisms } from '../db.js';

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

    console.log('Raw players from DB:', result.recordset.map(p => ({
      username: p.username,
      userExp: p.userExp,
      kills: p.kills,
      UserType: p.UserType
    })));

    // Obtener información de rangos para cada jugador
    // Primero traemos todos los rangos disponibles
    let gradeInfo = [];
    try {
      const gradeResult = await query(`SELECT GradeLevel, GradeName, MinExp, MaxExp FROM CBT_GradeInfo ORDER BY GradeLevel`);
      gradeInfo = gradeResult.recordset;
      console.log('Available grades:', gradeInfo);
    } catch (e) {
      console.warn('Could not fetch grade info:', e.message);
    }

    const playersWithRanks = result.recordset.map((player) => {
      let rank = 0;
      let rankName = 'TRAINEE';
      let isGM = false;

      if (player.UserType === 1) {
        isGM = true;
        rankName = 'Game Master';
        rank = 'GM';
      } else {
        // Si tenemos info de grades, usarla
        if (gradeInfo.length > 0) {
          const matchingGrade = gradeInfo.find(g => 
            player.userExp >= (g.MinExp || 0) && player.userExp <= (g.MaxExp || 999999999)
          );
          if (matchingGrade) {
            rank = matchingGrade.GradeLevel || 0;
            rankName = matchingGrade.GradeName || 'TRAINEE';
          } else {
            // Si no encaja en ninguno, asignar basado en XP relativo
            rank = Math.min(Math.floor(player.userExp / 500000), 10) || 0;
            rankName = 'UNKNOWN';
          }
        } else {
          // Fallback si no hay grades
          rank = Math.min(Math.floor((player.userExp || 0) / 500000), 10) || 0;
          rankName = 'TRAINEE';
        }
      }

      console.log(`Player ${player.username}: exp=${player.userExp}, rank=${rank}, rankName=${rankName}`);

      return {
        ...player,
        rank: rank,
        rankName: rankName,
        isGM: isGM
      };
    });

    console.log('Players with ranks:', playersWithRanks.map(p => ({
      username: p.username,
      rank: p.rank,
      rankName: p.rankName
    })));

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

    // Obtener oidUser del username desde COMBATARMS
    const userResult = await query(
      `SELECT oidUser FROM CBT_User WHERE strNexonID = @username`,
      { username }
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const oidUser = userResult.recordset[0].oidUser;

    // Obtener últimas 50 compras desde VISMS_PurchaseLog (está en BD VISMS)
    const purchaseResult = await queryVisms(
      `SELECT TOP 50 
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

    res.json(purchases);
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({ error: 'Error al obtener historial de compras' });
  }
});

// Get available items for selling (purchases that haven't been refunded or sold)
router.get('/available-items/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Obtener oidUser del username
    const userResult = await query(
      `SELECT oidUser FROM CBT_User WHERE strNexonID = @username`,
      { username }
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const oidUser = userResult.recordset[0].oidUser;

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

// Get marketplace status for a purchase (es el item está en venta)
router.get('/purchase-marketplace-status/:purchaseLogId', async (req, res) => {
  try {
    const { purchaseLogId } = req.params;

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

export default router;
