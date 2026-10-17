import { Router } from 'express';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { getPoolConnection } from '../db.js';

const router = Router();
const SECRETS = [...new Set([process.env.JWT_SECRET, 'your-secret-key-change-this'].filter(Boolean))];

function stamp(value) {
  if (!value) return null;
  return String(value).slice(0, 19);
}

function asDay(value) {
  const day = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('La fecha no es válida');
  return day;
}

function asDateTime(value) {
  const text = String(value || '').trim().replace('T', ' ');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(text)) throw new Error('La fecha y la hora no son válidas');
  return text.length === 16 ? `${text}:00` : text;
}

function addDays(day, count) {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + count));
  return next.toISOString().slice(0, 10);
}

function ints(list, label) {
  const values = (Array.isArray(list) ? list : []).map((value) => Number(value));
  if (!values.length || values.some((value) => !Number.isInteger(value) || value <= 0)) {
    throw new Error(`Elige un ítem válido en ${label}`);
  }
  return values;
}

async function requireAdmin(req, res) {
  const header = String(req.headers.authorization || req.headers['x-access-token'] || '');
  const token = header.replace(/^Bearer\s+/i, '').trim();
  let decoded = null;
  for (const secret of SECRETS) {
    try {
      decoded = jwt.verify(token, secret, { clockTolerance: 1e12 });
      break;
    } catch {
      /* try the next secret */
    }
  }
  const username = String(decoded?.username || '');
  if (!username) {
    res.status(401).json({ error: 'Inicia sesión de administrador' });
    return null;
  }
  if (username !== 'villauribe12') {
    res.status(403).json({ error: 'Solo el dueño puede cambiar eventos' });
    return null;
  }
  return { username };
}

async function withTx(work) {
  const pool = await getPoolConnection();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try { await tx.rollback(); } catch { /* already closed */ }
    throw error;
  }
}

function ask(tx) {
  return new sql.Request(tx);
}

async function one(tx, text, params = {}) {
  const request = ask(tx);
  Object.entries(params).forEach(([key, value]) => request.input(key, value));
  const result = await request.query(text);
  return result.recordset || [];
}

async function productsOf(tx, ids) {
  const clean = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!clean.length) return new Map();
  const request = ask(tx);
  clean.forEach((id, index) => request.input(`p${index}`, sql.Int, id));
  const result = await request.query(`
    SELECT ProductID, ProductName
    FROM CBT_ProductInfo
    WHERE ProductID IN (${clean.map((_, index) => `@p${index}`).join(',')})
  `);
  return new Map(result.recordset.map((row) => [row.ProductID, row.ProductName]));
}

async function assertProducts(tx, ids, label) {
  const values = ints(ids, label);
  const names = await productsOf(tx, values);
  const missing = values.filter((id) => !names.has(id));
  if (missing.length) throw new Error(`Ese ítem no existe: ${missing.join(', ')}`);
  return values;
}

async function serverNow(tx) {
  const rows = await one(tx, `SELECT CONVERT(varchar(19), GETDATE(), 120) AS now`);
  return rows[0]?.now || '';
}

async function loadAttendance(tx) {
  const events = await one(tx, `
    SELECT EventID, CONVERT(varchar(19), [Start], 120) AS startAt, CONVERT(varchar(19), [End], 120) AS endAt,
           EventType, [Option] AS optionDays, RewardID, InfoMsg, RewardDuration
    FROM CBT_DailyAttendance_Event
    WHERE [End] >= DATEADD(day, -1, GETDATE())
    ORDER BY EventType, EventID
  `);
  const info = await one(tx, `SELECT TOP 1 InfoMsg FROM CBT_DailyAttendance_Info`);
  const rewards = await one(tx, `
    SELECT RewardID, ProductID FROM CBT_DailyAttendance_Reward ORDER BY RewardID, ProductID
  `);
  const byReward = new Map();
  rewards.forEach((row) => {
    if (!byReward.has(row.RewardID)) byReward.set(row.RewardID, []);
    if (row.ProductID) byReward.get(row.RewardID).push(row.ProductID);
  });
  const campaign = events.filter((row) => row.EventType === 2).sort((a, b) => String(b.endAt).localeCompare(String(a.endAt)))[0] || null;
  const slots = events.filter((row) => row.EventType === 5).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
  const ids = [
    ...(campaign ? byReward.get(campaign.RewardID) || [] : []),
    ...slots.flatMap((slot) => byReward.get(slot.RewardID) || []),
  ];
  const names = await productsOf(tx, ids);
  const pack = (row) => row && ({
    eventId: row.EventID,
    startAt: stamp(row.startAt),
    endAt: stamp(row.endAt),
    optionDays: row.optionDays,
    rewardId: row.RewardID,
    rewardDuration: row.RewardDuration,
    products: (byReward.get(row.RewardID) || []).map((id) => ({ id, name: names.get(id) || `Producto ${id}` })),
  });
  const now = await serverNow(tx);
  const endAt = campaign?.endAt || slots[slots.length - 1]?.endAt || null;
  return {
    now,
    infoMsg: info[0]?.InfoMsg || campaign?.InfoMsg || '',
    active: Boolean(endAt && now < endAt),
    from: campaign?.startAt || slots[0]?.startAt || null,
    to: endAt,
    campaign: pack(campaign),
    slots: slots.map(pack),
  };
}

async function loadBingo(tx) {
  const rows = await one(tx, `
    SELECT EventID, RewardID, CONVERT(varchar(19), BeginTime, 120) AS startAt,
           CONVERT(varchar(19), EndTime, 120) AS endAt, UIEnable, Enable
    FROM CBT___BingoInfo
    ORDER BY EndTime DESC
  `);
  const now = await serverNow(tx);
  const current = rows.find((row) => row.Enable === 1 && row.startAt <= now && now < row.endAt) || rows[0] || null;
  const rewards = current
    ? await one(tx, `
        SELECT CompletionType, CompletionOrderID, NeededCollectCount, ProductID
        FROM CBT___BingoReward WHERE RewardID = @id
        ORDER BY CompletionType, CompletionOrderID
      `, { id: current.RewardID })
    : [];
  const names = await productsOf(tx, rewards.map((row) => row.ProductID));
  return {
    now,
    active: Boolean(current && current.Enable === 1 && current.startAt <= now && now < current.endAt),
    from: current?.startAt || null,
    to: current?.endAt || null,
    event: current && {
      eventId: current.EventID,
      rewardId: current.RewardID,
      startAt: stamp(current.startAt),
      endAt: stamp(current.endAt),
      enable: current.Enable === 1,
      uiEnable: current.UIEnable === 1,
      rewards: rewards.map((row) => ({
        completionType: row.CompletionType,
        completionOrderId: row.CompletionOrderID,
        needed: row.NeededCollectCount,
        productId: row.ProductID,
        productName: names.get(row.ProductID) || `Producto ${row.ProductID}`,
      })),
    },
  };
}

async function loadMarble(tx) {
  const rows = await one(tx, `
    SELECT EventID, CONVERT(varchar(19), StartDate, 120) AS startAt, CONVERT(varchar(19), EndDate, 120) AS endAt,
           CharID, SoundID, t_00,t_01,t_02,t_03,t_04,t_05,t_06,t_07,t_08,t_09,
           t_10,t_11,t_12,t_13,t_14,t_15,t_16,t_17,t_18,t_19,t_20,t_21
    FROM CBT_Marble_Info
    ORDER BY EndDate DESC
  `);
  const now = await serverNow(tx);
  const current = rows.find((row) => row.startAt <= now && now <= row.endAt) || rows[0] || null;
  if (!current) return { now, active: false, from: null, to: null, event: null };
  const tileIds = Array.from({ length: 22 }, (_, index) => current[`t_${String(index).padStart(2, '0')}`]);
  const request = ask(tx);
  tileIds.forEach((id, index) => request.input(`t${index}`, sql.Int, id));
  const tiles = await request.query(`
    SELECT TileID, TileType, Chance, ProductID, ProductCnt, ProductPeriod
    FROM CBT_Marble_Tile
    WHERE TileID IN (${tileIds.map((_, index) => `@t${index}`).join(',')})
  `);
  const mileage = await one(tx, `
    SELECT NeedMileage, ProductID, ProductPeriod
    FROM CBT_Marble_MileageReward WHERE EventID = @id ORDER BY NeedMileage
  `, { id: current.EventID });
  const names = await productsOf(tx, [
    ...tiles.recordset.map((row) => row.ProductID),
    ...mileage.map((row) => row.ProductID),
  ]);
  const byTile = new Map(tiles.recordset.map((row) => [row.TileID, row]));
  return {
    now,
    active: current.startAt <= now && now <= current.endAt,
    from: current.startAt,
    to: current.endAt,
    event: {
      eventId: current.EventID,
      startAt: stamp(current.startAt),
      endAt: stamp(current.endAt),
      tiles: tileIds.map((tileId, index) => {
        const tile = byTile.get(tileId) || {};
        return {
          index,
          tileId,
          tileType: tile.TileType ?? 0,
          chance: tile.Chance ?? 0,
          productId: tile.ProductID ?? -1,
          productName: names.get(tile.ProductID) || (tile.ProductID > 0 ? `Producto ${tile.ProductID}` : 'Vacío'),
          productCnt: tile.ProductCnt ?? 0,
          productPeriod: tile.ProductPeriod ?? 0,
        };
      }),
      mileage: mileage.map((row) => ({
        needMileage: row.NeedMileage,
        productId: row.ProductID,
        productName: names.get(row.ProductID) || `Producto ${row.ProductID}`,
        productPeriod: row.ProductPeriod,
      })),
    },
  };
}

async function loadPlaytime(tx) {
  const active = await one(tx, `
    SELECT TOP 1 RewardID
    FROM CBT_DT_Event
    WHERE Enable = 1 AND BeginTime <= GETDATE() AND GETDATE() < EndTime
    ORDER BY EventID DESC
  `);
  const upcoming = active.length ? active : await one(tx, `
    SELECT TOP 1 RewardID
    FROM CBT_DT_Event
    WHERE Enable = 1 AND EndTime >= GETDATE()
    ORDER BY BeginTime, EventID
  `);
  const rewardHint = upcoming[0]?.RewardID || 0;
  const rows = rewardHint
    ? await one(tx, `
        SELECT EventID, RewardID, CONVERT(varchar(19), BeginTime, 120) AS startAt,
               CONVERT(varchar(19), EndTime, 120) AS endAt, Enable, EventType
        FROM CBT_DT_Event
        WHERE Enable = 1 AND RewardID = @rewardId AND EndTime >= DATEADD(day, -1, GETDATE())
        ORDER BY BeginTime, EventID
      `, { rewardId: rewardHint })
    : [];
  const now = await serverNow(tx);
  const rewardId = rows[0]?.RewardID || 0;
  const ladder = rewardId
    ? await one(tx, `
        SELECT Level, Minute, ProductID, Duration
        FROM CBT_DT_Reward WHERE RewardID = @id ORDER BY Level, Minute
      `, { id: rewardId })
    : [];
  const names = await productsOf(tx, ladder.map((row) => row.ProductID));
  return {
    now,
    active: rows.some((row) => row.startAt <= now && now < row.endAt),
    from: rows[0]?.startAt || null,
    to: rows[rows.length - 1]?.endAt || null,
    rewardId,
    days: rows.map((row) => ({ eventId: row.EventID, startAt: stamp(row.startAt), endAt: stamp(row.endAt) })),
    ladder: ladder.map((row) => ({
      level: row.Level,
      minute: row.Minute,
      productId: row.ProductID,
      productName: names.get(row.ProductID) || `Producto ${row.ProductID}`,
      duration: row.Duration ?? 1,
    })),
  };
}

async function loadHottime(tx) {
  const rows = await one(tx, `
    SELECT SeqNo, EventID, RewardID, CONVERT(varchar(19), BeginTime, 120) AS startAt,
           CONVERT(varchar(19), EndTime, 120) AS endAt, Enable, DurationHour, Description, PcCafeOnly
    FROM CBT___HottimeRegister
    ORDER BY EndTime DESC
  `);
  const now = await serverNow(tx);
  const current = rows.find((row) => row.Enable === 1 && row.startAt <= now && now < row.endAt) || rows[0] || null;
  const rewards = current
    ? await one(tx, `SELECT ProductID FROM CBT___HottimeReward WHERE RewardID = @id`, { id: current.RewardID })
    : [];
  const names = await productsOf(tx, rewards.map((row) => row.ProductID));
  return {
    now,
    active: Boolean(current && current.Enable === 1 && current.startAt <= now && now < current.endAt),
    from: current?.startAt || null,
    to: current?.endAt || null,
    event: current && {
      seqNo: current.SeqNo,
      eventId: current.EventID,
      rewardId: current.RewardID,
      startAt: stamp(current.startAt),
      endAt: stamp(current.endAt),
      enable: current.Enable === 1,
      durationHour: current.DurationHour,
      pcCafeOnly: current.PcCafeOnly === 1,
      description: current.Description || '',
      products: rewards.map((row) => ({ id: row.ProductID, name: names.get(row.ProductID) || `Producto ${row.ProductID}` })),
    },
  };
}

async function loadRecommend(tx) {
  const rows = await one(tx, `
    SELECT EventID, CONVERT(varchar(19), StartDate, 120) AS startAt, CONVERT(varchar(19), EndDate, 120) AS endAt,
           ReturnDay, MaxRecommendedCount
    FROM CBT_RecommendEvent
    ORDER BY EndDate DESC
  `);
  const now = await serverNow(tx);
  const current = rows.find((row) => row.startAt <= now && now <= row.endAt) || rows[0] || null;
  const rewards = await one(tx, `
    SELECT RewardType, ProductID, InboxDuration FROM CBT_RecommendEventReward ORDER BY RewardType
  `);
  const names = await productsOf(tx, rewards.map((row) => row.ProductID));
  return {
    now,
    active: Boolean(current && current.startAt <= now && now <= current.endAt),
    from: current?.startAt || null,
    to: current?.endAt || null,
    event: current && {
      eventId: current.EventID,
      startAt: stamp(current.startAt),
      endAt: stamp(current.endAt),
      returnDay: current.ReturnDay,
      maxCount: current.MaxRecommendedCount,
      rewards: rewards.map((row) => ({
        rewardType: row.RewardType,
        productId: row.ProductID,
        productName: names.get(row.ProductID) || `Producto ${row.ProductID}`,
        inboxDuration: row.InboxDuration,
      })),
    },
  };
}

async function loadExpgp(tx) {
  const rows = await one(tx, `
    SELECT TOP 12 EventID, LobbyServerID, ModeID, MapID, EXPRate, GPRate,
           CONVERT(varchar(19), BeginTime, 120) AS startAt, CONVERT(varchar(19), EndTime, 120) AS endAt,
           Enable, [Desc] AS description
    FROM CBT_EventEXPGP
    ORDER BY EndTime DESC
  `);
  const now = await serverNow(tx);
  return {
    now,
    active: rows.some((row) => row.Enable === 1 && row.startAt <= now && now < row.endAt),
    from: rows.find((row) => row.Enable === 1 && row.endAt > now)?.startAt || null,
    to: rows.find((row) => row.Enable === 1 && row.endAt > now)?.endAt || null,
    rows: rows.map((row) => ({
      eventId: row.EventID,
      lobbyServerId: row.LobbyServerID,
      modeId: row.ModeID,
      mapId: row.MapID,
      expRate: Number(row.EXPRate),
      gpRate: Number(row.GPRate),
      startAt: stamp(row.startAt),
      endAt: stamp(row.endAt),
      enable: row.Enable === 1,
      description: row.description || '',
      running: row.Enable === 1 && row.startAt <= now && now < row.endAt,
    })),
  };
}

const LOADERS = {
  attendance: loadAttendance,
  bingo: loadBingo,
  marble: loadMarble,
  playtime: loadPlaytime,
  hottime: loadHottime,
  recommend: loadRecommend,
  expgp: loadExpgp,
};

const CARDS = [
  ['attendance', 'Inicio diario', 'Un premio por cada día y un premio largo al completar la racha.'],
  ['bingo', 'Bingo', 'Cartón activo. Solo puede haber uno encendido a la vez.'],
  ['marble', 'Combat Marble', 'Tablero de dados. Solo puede haber uno encendido a la vez.'],
  ['playtime', 'Tiempo jugado', 'Premio por minutos dentro de la partida, un día a la vez.'],
  ['hottime', 'Hot Time', 'Premio por estar en el juego durante la ventana.'],
  ['recommend', 'Recomendar', 'Premio por traer a otro jugador.'],
  ['expgp', 'EXP y GP', 'Multiplicador de experiencia y GP por fechas.'],
];

async function saveAttendance(tx, body) {
  const start = asDay(body.start);
  const span = Number(body.span);
  if (!Number.isInteger(span) || span < 1 || span > 28) throw new Error('Los días tienen que estar entre 1 y 28');
  const current = await loadAttendance(tx);
  if (!current.campaign) throw new Error('No hay una campaña de inicio diario para actualizar');
  const optionDays = Number(body.optionDays ?? current.campaign.optionDays);
  const rewardDuration = Number(body.rewardDuration ?? current.campaign.rewardDuration);
  if (!Number.isInteger(optionDays) || optionDays < 1 || optionDays > 60) throw new Error('Los días del premio largo no son válidos');
  if (!Number.isInteger(rewardDuration) || rewardDuration < 1 || rewardDuration > 3650) throw new Error('La duración del premio no es válida');
  const infoMsg = String(body.infoMsg || current.infoMsg || 'Check in every day to claim your rewards!').slice(0, 100);
  const slots = Array.isArray(body.slots) ? body.slots : [];
  if (slots.length !== span) throw new Error('Falta el premio de algún día');
  const longProducts = await assertProducts(tx, body.longProducts, 'el premio largo');
  const slotProducts = [];
  for (let index = 0; index < span; index += 1) {
    slotProducts.push(await assertProducts(tx, slots[index]?.products, `el día ${index + 1}`));
  }
  const end = addDays(start, span - 1);
  const campaignId = current.campaign.eventId;
  await one(tx, `
    UPDATE CBT_DailyAttendance_Event
    SET [Start] = @start, [End] = @end, [Option] = @optionDays, RewardDuration = @duration, InfoMsg = @msg
    WHERE EventID = @id
  `, { start: `${start} 00:00:00`, end: `${end} 23:59:59`, optionDays, duration: rewardDuration, msg: infoMsg, id: campaignId });
  await one(tx, `UPDATE CBT_DailyAttendance_Info SET InfoMsg = @msg`, { msg: infoMsg });
  await one(tx, `
    UPDATE CBT_DailyAttendance_Event
    SET [End] = '2000-01-01 00:00:00'
    WHERE EventType = 2 AND EventID <> @id AND [End] >= GETDATE()
  `, { id: campaignId });

  const maxRewardRow = await one(tx, `SELECT ISNULL(MAX(RewardID), 0) AS n FROM CBT_DailyAttendance_Reward`);
  let nextReward = Number(maxRewardRow[0]?.n || 0);
  const existing = current.slots;
  const rewardPlan = [];
  const seen = new Map();
  for (let index = 0; index < span; index += 1) {
    const signature = slotProducts[index].join(',');
    let rewardId = existing[index]?.rewardId || 0;
    if (!rewardId || rewardId === current.campaign.rewardId || (seen.has(rewardId) && seen.get(rewardId) !== signature)) {
      nextReward += 1;
      rewardId = nextReward;
    }
    seen.set(rewardId, signature);
    rewardPlan.push(rewardId);
  }
  const base = await one(tx, `SELECT TOP 1 InboxMsg FROM CBT_DailyAttendance_Event WHERE EventID = @id`, { id: existing[0]?.eventId || campaignId });
  const inbox = base[0]?.InboxMsg || '';
  for (let index = 0; index < span; index += 1) {
    const day = addDays(start, index);
    const rewardId = rewardPlan[index];
    if (existing[index]) {
      await one(tx, `
        UPDATE CBT_DailyAttendance_Event
        SET [Start] = @start, [End] = @end, RewardID = @rewardId, RewardDuration = @duration, InfoMsg = @msg, EventType = 5, [Option] = 1
        WHERE EventID = @id
      `, {
        start: `${day} 00:00:00`, end: `${day} 23:59:59`, rewardId, duration: rewardDuration, msg: infoMsg, id: existing[index].eventId,
      });
    } else {
      await one(tx, `
        INSERT INTO CBT_DailyAttendance_Event ([Start], [End], EventType, [Option], RewardID, InfoMsg, RewardDuration, InboxMsg)
        VALUES (@start, @end, 5, 1, @rewardId, @msg, @duration, @inbox)
      `, { start: `${day} 00:00:00`, end: `${day} 23:59:59`, rewardId, msg: infoMsg, duration: rewardDuration, inbox });
    }
  }
  for (const extra of existing.slice(span)) {
    await one(tx, `UPDATE CBT_DailyAttendance_Event SET [End] = '2000-01-01 00:00:00' WHERE EventID = @id`, { id: extra.eventId });
  }
  const written = new Set();
  const writeReward = async (rewardId, products) => {
    if (written.has(rewardId)) return;
    written.add(rewardId);
    await one(tx, `DELETE FROM CBT_DailyAttendance_Reward WHERE RewardID = @id`, { id: rewardId });
    for (const productId of products) {
      await one(tx, `INSERT INTO CBT_DailyAttendance_Reward (RewardID, ProductID) VALUES (@id, @productId)`, { id: rewardId, productId });
    }
  };
  await writeReward(current.campaign.rewardId, longProducts);
  for (let index = 0; index < span; index += 1) await writeReward(rewardPlan[index], slotProducts[index]);
  return `Inicio diario del ${start} al ${end}, ${span} días.`;
}

async function saveBingo(tx, body) {
  const eventId = Number(body.eventId);
  const start = asDateTime(body.start);
  const end = asDateTime(body.end);
  if (start >= end) throw new Error('La fecha final tiene que ser después de la inicial');
  const enable = body.enable ? 1 : 0;
  const uiEnable = body.uiEnable ? 1 : 0;
  const rewards = Array.isArray(body.rewards) ? body.rewards : [];
  if (!rewards.length) throw new Error('El bingo necesita al menos un premio');
  const clean = [];
  for (const reward of rewards) {
    const productId = (await assertProducts(tx, [reward.productId], 'el bingo'))[0];
    const completionType = Number(reward.completionType);
    const completionOrderId = Number(reward.completionOrderId);
    const needed = Number(reward.needed);
    if (![completionType, completionOrderId, needed].every((value) => Number.isInteger(value) && value >= 0)) {
      throw new Error('Los datos de una línea del bingo no son válidos');
    }
    clean.push({ completionType, completionOrderId, needed, productId });
  }
  const current = await one(tx, `SELECT RewardID FROM CBT___BingoInfo WHERE EventID = @id`, { id: eventId });
  if (!current.length) throw new Error('Ese bingo no existe');
  if (enable) {
    await one(tx, `
      UPDATE CBT___BingoInfo SET Enable = 0, UIEnable = 0
      WHERE EventID <> @id AND BeginTime < @end AND EndTime > @start
    `, { id: eventId, start, end });
  }
  await one(tx, `
    UPDATE CBT___BingoInfo
    SET BeginTime = @start, EndTime = @end, Enable = @enable, UIEnable = @uiEnable
    WHERE EventID = @id
  `, { start, end, enable, uiEnable, id: eventId });
  const rewardId = current[0].RewardID;
  await one(tx, `DELETE FROM CBT___BingoReward WHERE RewardID = @id`, { id: rewardId });
  for (const reward of clean) {
    await one(tx, `
      INSERT INTO CBT___BingoReward (RewardID, CompletionType, CompletionOrderID, NeededCollectCount, ProductID)
      VALUES (@id, @completionType, @completionOrderId, @needed, @productId)
    `, { id: rewardId, ...reward });
  }
  return `Bingo ${eventId} actualizado.`;
}

async function saveMarble(tx, body) {
  const eventId = Number(body.eventId);
  const start = `${asDay(body.start)} 00:00:00`;
  const end = `${asDay(body.end)} 23:59:59`;
  if (start >= end) throw new Error('La fecha final tiene que ser después de la inicial');
  const exists = await one(tx, `SELECT EventID FROM CBT_Marble_Info WHERE EventID = @id`, { id: eventId });
  if (!exists.length) throw new Error('Ese tablero no existe');
  await one(tx, `
    UPDATE CBT_Marble_Info SET EndDate = DATEADD(second, -1, StartDate)
    WHERE EventID <> @id AND StartDate < @end AND EndDate > @start
  `, { id: eventId, start, end });
  await one(tx, `UPDATE CBT_Marble_Info SET StartDate = @start, EndDate = @end WHERE EventID = @id`, { start, end, id: eventId });
  const tiles = Array.isArray(body.tiles) ? body.tiles : [];
  for (const tile of tiles) {
    const tileId = Number(tile.tileId);
    const productId = Number(tile.productId);
    if (!Number.isInteger(tileId)) continue;
    if (productId > 0) await assertProducts(tx, [productId], 'una casilla');
    await one(tx, `
      UPDATE CBT_Marble_Tile
      SET ProductID = @productId, Chance = @chance, ProductCnt = @productCnt, ProductPeriod = @productPeriod
      WHERE TileID = @tileId
    `, {
      tileId,
      productId: Number.isInteger(productId) ? productId : -1,
      chance: Number(tile.chance) || 0,
      productCnt: Number(tile.productCnt) || 0,
      productPeriod: Number(tile.productPeriod) || 0,
    });
  }
  const mileage = Array.isArray(body.mileage) ? body.mileage : [];
  await one(tx, `DELETE FROM CBT_Marble_MileageReward WHERE EventID = @id`, { id: eventId });
  for (const row of mileage) {
    const productId = (await assertProducts(tx, [row.productId], 'el millaje'))[0];
    const needMileage = Number(row.needMileage);
    if (!Number.isInteger(needMileage) || needMileage < 1) throw new Error('El millaje tiene que ser mayor que 0');
    await one(tx, `
      INSERT INTO CBT_Marble_MileageReward (EventID, NeedMileage, ProductID, ProductPeriod)
      VALUES (@id, @needMileage, @productId, @productPeriod)
    `, { id: eventId, needMileage, productId, productPeriod: Number(row.productPeriod) || 0 });
  }
  return `Combat Marble del ${start.slice(0, 10)} al ${end.slice(0, 10)}.`;
}

async function savePlaytime(tx, body) {
  const start = asDay(body.start);
  const span = Number(body.span);
  if (!Number.isInteger(span) || span < 1 || span > 400) throw new Error('Los días tienen que estar entre 1 y 400');
  const current = await loadPlaytime(tx);
  if (!current.rewardId) throw new Error('No hay un evento de tiempo jugado para actualizar');
  const ladder = Array.isArray(body.ladder) ? body.ladder : [];
  if (!ladder.length) throw new Error('Agrega al menos un premio por minutos');
  const clean = [];
  for (const step of ladder) {
    const minute = Number(step.minute);
    const level = Number(step.level);
    const duration = Number(step.duration || 1);
    if (!Number.isInteger(minute) || minute < 1 || minute > 1440) throw new Error('Los minutos no son válidos');
    if (!Number.isInteger(level) || level < 1) throw new Error('El nivel del premio no es válido');
    const productId = (await assertProducts(tx, [step.productId], 'tiempo jugado'))[0];
    clean.push({ level, minute, productId, duration: Number.isInteger(duration) && duration > 0 ? duration : 1 });
  }
  const existing = current.days;
  const keep = existing.slice(0, span);
  const drop = existing.slice(span);
  if (drop.length) {
    const request = ask(tx);
    drop.forEach((row, index) => request.input(`d${index}`, sql.Int, row.eventId));
    await request.query(`UPDATE CBT_DT_Event SET Enable = 0 WHERE EventID IN (${drop.map((_, index) => `@d${index}`).join(',')})`);
  }
  if (keep.length) {
    const values = keep.map((row, index) => `(${Number(row.eventId)}, ${index})`).join(',');
    await one(tx, `
      UPDATE e
      SET BeginTime = DATEADD(day, v.n, CONVERT(datetime, @start, 120)),
          EndTime = DATEADD(second, -1, DATEADD(day, v.n + 1, CONVERT(datetime, @start, 120))),
          EventType = 0
      FROM CBT_DT_Event e
      INNER JOIN (VALUES ${values}) v(id, n) ON e.EventID = v.id
    `, { start: `${start} 00:00:00` });
  }
  for (let index = keep.length; index < span; index += 1) {
    const maxRow = await one(tx, `SELECT ISNULL(MAX(EventID), 0) AS n FROM CBT_DT_Event`);
    const eventId = Number(maxRow[0].n) + 1;
    const day = addDays(start, index);
    await one(tx, `
      INSERT INTO CBT_DT_Event (EventID, RewardID, BeginTime, EndTime, Enable, EventType)
      VALUES (@eventId, @rewardId, @start, @end, 1, 0)
    `, { eventId, rewardId: current.rewardId, start: `${day} 00:00:00`, end: `${day} 23:59:59` });
  }
  await one(tx, `DELETE FROM CBT_DT_Reward WHERE RewardID = @id`, { id: current.rewardId });
  for (const step of clean) {
    await one(tx, `
      INSERT INTO CBT_DT_Reward (RewardID, Level, Minute, ProductID, Duration)
      VALUES (@id, @level, @minute, @productId, @duration)
    `, { id: current.rewardId, ...step });
  }
  return `Tiempo jugado del ${start} al ${addDays(start, span - 1)}.`;
}

async function saveHottime(tx, body) {
  const seqNo = Number(body.seqNo);
  const start = asDateTime(body.start);
  const end = asDateTime(body.end);
  if (start >= end) throw new Error('La fecha final tiene que ser después de la inicial');
  const durationHour = Number(body.durationHour);
  if (!Number.isInteger(durationHour) || durationHour < 1 || durationHour > 1000) throw new Error('Las horas no son válidas');
  const products = await assertProducts(tx, body.products, 'Hot Time');
  const current = await one(tx, `SELECT RewardID FROM CBT___HottimeRegister WHERE SeqNo = @id`, { id: seqNo });
  if (!current.length) throw new Error('Ese Hot Time no existe');
  await one(tx, `
    UPDATE CBT___HottimeRegister
    SET BeginTime = @start, EndTime = @end, Enable = @enable, DurationHour = @durationHour,
        PcCafeOnly = @pcCafe, Description = @description
    WHERE SeqNo = @id
  `, {
    start, end, enable: body.enable ? 1 : 0, durationHour, pcCafe: body.pcCafeOnly ? 1 : 0,
    description: String(body.description || '').slice(0, 300), id: seqNo,
  });
  const rewardId = current[0].RewardID;
  await one(tx, `DELETE FROM CBT___HottimeReward WHERE RewardID = @id`, { id: rewardId });
  for (const productId of products) {
    await one(tx, `INSERT INTO CBT___HottimeReward (RewardID, ProductID) VALUES (@id, @productId)`, { id: rewardId, productId });
  }
  return 'Hot Time actualizado.';
}

async function saveRecommend(tx, body) {
  const eventId = Number(body.eventId);
  const start = `${asDay(body.start)} 00:00:00`;
  const end = `${asDay(body.end)} 23:59:59`;
  if (start >= end) throw new Error('La fecha final tiene que ser después de la inicial');
  const maxCount = Number(body.maxCount);
  const returnDay = Number(body.returnDay);
  if (!Number.isInteger(maxCount) || maxCount < 1 || maxCount > 100) throw new Error('El máximo de recomendados no es válido');
  if (!Number.isInteger(returnDay) || returnDay < -1 || returnDay > 3650) throw new Error('Los días de regreso no son válidos');
  const rewards = Array.isArray(body.rewards) ? body.rewards : [];
  if (!rewards.length) throw new Error('Falta el premio');
  const exists = await one(tx, `SELECT EventID FROM CBT_RecommendEvent WHERE EventID = @id`, { id: eventId });
  if (!exists.length) throw new Error('Ese evento no existe');
  await one(tx, `
    UPDATE CBT_RecommendEvent SET EndDate = DATEADD(second, -1, StartDate)
    WHERE EventID <> @id AND StartDate < @end AND EndDate > @start
  `, { id: eventId, start, end });
  await one(tx, `
    UPDATE CBT_RecommendEvent
    SET StartDate = @start, EndDate = @end, ReturnDay = @returnDay, MaxRecommendedCount = @maxCount
    WHERE EventID = @id
  `, { start, end, returnDay, maxCount, id: eventId });
  for (const reward of rewards) {
    const productId = (await assertProducts(tx, [reward.productId], 'recomendar'))[0];
    await one(tx, `
      UPDATE CBT_RecommendEventReward
      SET ProductID = @productId, InboxDuration = @inboxDuration
      WHERE RewardType = @rewardType
    `, {
      productId,
      inboxDuration: Number(reward.inboxDuration) || 24,
      rewardType: Number(reward.rewardType),
    });
  }
  return `Recomendar del ${start.slice(0, 10)} al ${end.slice(0, 10)}.`;
}

async function saveExpgp(tx, body) {
  const start = asDateTime(body.start);
  const end = asDateTime(body.end);
  if (start >= end) throw new Error('La fecha final tiene que ser después de la inicial');
  const expRate = Number(body.expRate);
  const gpRate = Number(body.gpRate);
  if (!Number.isFinite(expRate) || !Number.isFinite(gpRate) || expRate < 1 || gpRate < 1 || expRate > 10 || gpRate > 10) {
    throw new Error('La tasa tiene que estar entre 1 y 10');
  }
  const fields = {
    lobby: Number(body.lobbyServerId) || 0,
    mode: Number(body.modeId) || 0,
    map: Number(body.mapId) || 0,
    expRate, gpRate, start, end,
    enable: body.enable ? 1 : 0,
    description: String(body.description || '').slice(0, 300),
  };
  let eventId = Number(body.eventId) || 0;
  if (eventId) {
    const exists = await one(tx, `SELECT EventID FROM CBT_EventEXPGP WHERE EventID = @id`, { id: eventId });
    if (!exists.length) throw new Error('Ese boost no existe');
    await one(tx, `
      UPDATE CBT_EventEXPGP
      SET LobbyServerID = @lobby, ModeID = @mode, MapID = @map, EXPRate = @expRate, GPRate = @gpRate,
          BeginTime = @start, EndTime = @end, Enable = @enable, [Desc] = @description
      WHERE EventID = @id
    `, { ...fields, id: eventId });
  } else {
    const maxRow = await one(tx, `SELECT ISNULL(MAX(EventID), 0) AS n FROM CBT_EventEXPGP`);
    eventId = Number(maxRow[0].n) + 1;
    await one(tx, `
      INSERT INTO CBT_EventEXPGP (EventID, LobbyServerID, ModeID, MapID, EXPRate, GPRate, BeginTime, EndTime, Enable, [Desc])
      VALUES (@id, @lobby, @mode, @map, @expRate, @gpRate, @start, @end, @enable, @description)
    `, { ...fields, id: eventId });
  }
  return `EXP x${expRate} y GP x${gpRate} guardados.`;
}

const SAVERS = {
  attendance: saveAttendance,
  bingo: saveBingo,
  marble: saveMarble,
  playtime: savePlaytime,
  hottime: saveHottime,
  recommend: saveRecommend,
  expgp: saveExpgp,
};

router.get('/events', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  try {
    const pool = await getPoolConnection();
    const result = await pool.request().query(`
      SELECT CONVERT(varchar(19), GETDATE(), 120) AS now;
      SELECT TOP 1 CONVERT(varchar(19), [Start], 120) AS startAt, CONVERT(varchar(19), [End], 120) AS endAt
        FROM CBT_DailyAttendance_Event WHERE EventType = 2 ORDER BY [End] DESC;
      SELECT TOP 1 CONVERT(varchar(19), BeginTime, 120) AS startAt, CONVERT(varchar(19), EndTime, 120) AS endAt, Enable
        FROM CBT___BingoInfo WHERE Enable = 1 ORDER BY EndTime DESC;
      SELECT TOP 1 CONVERT(varchar(19), StartDate, 120) AS startAt, CONVERT(varchar(19), EndDate, 120) AS endAt
        FROM CBT_Marble_Info ORDER BY EndDate DESC;
      SELECT CONVERT(varchar(19), MIN(BeginTime), 120) AS startAt, CONVERT(varchar(19), MAX(EndTime), 120) AS endAt
        FROM CBT_DT_Event
        WHERE Enable = 1 AND RewardID = (
          SELECT TOP 1 RewardID FROM CBT_DT_Event
          WHERE Enable = 1 AND BeginTime <= GETDATE() AND GETDATE() < EndTime
          ORDER BY EventID DESC
        );
      SELECT TOP 1 CONVERT(varchar(19), BeginTime, 120) AS startAt, CONVERT(varchar(19), EndTime, 120) AS endAt, Enable
        FROM CBT___HottimeRegister ORDER BY EndTime DESC;
      SELECT TOP 1 CONVERT(varchar(19), StartDate, 120) AS startAt, CONVERT(varchar(19), EndDate, 120) AS endAt
        FROM CBT_RecommendEvent ORDER BY EndDate DESC;
      SELECT TOP 1 CONVERT(varchar(19), BeginTime, 120) AS startAt, CONVERT(varchar(19), EndTime, 120) AS endAt, Enable
        FROM CBT_EventEXPGP WHERE Enable = 1 ORDER BY EndTime DESC;
    `);
    const sets = result.recordsets;
    const now = sets[0][0]?.now || '';
    const pick = (index) => sets[index][0] || null;
    const open = (row) => Boolean(row?.startAt && row.startAt <= now && now < (row.endAt || row.startAt));
    const rows = [pick(1), pick(2), pick(3), pick(4), pick(5), pick(6), pick(7)];
    const events = CARDS.map(([key, name, blurb], index) => {
      const row = rows[index];
      const active = key === 'bingo' || key === 'hottime' || key === 'expgp'
        ? Boolean(row && row.Enable === 1 && open(row))
        : open(row);
      return { key, name, blurb, active, from: row?.startAt || null, to: row?.endAt || null };
    });
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message || 'No se pudieron leer los eventos' });
  }
});

router.get('/events/products', async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const q = String(req.query.q || '').trim().slice(0, 40);
  if (q.length < 1) return res.json({ products: [] });
  try {
    const pool = await getPoolConnection();
    const request = pool.request();
    request.input('q', sql.NVarChar(80), `%${q.replace(/[%_[\]]/g, '')}%`);
    request.input('exact', sql.VarChar(12), q);
    const result = await request.query(`
      SELECT TOP 12 ProductID, ProductName
      FROM CBT_ProductInfo
      WHERE ProductName LIKE @q OR CONVERT(varchar(12), ProductID) = @exact
      ORDER BY CASE WHEN CONVERT(varchar(12), ProductID) = @exact THEN 0 ELSE 1 END, ProductName
    `);
    res.json({ products: result.recordset.map((row) => ({ id: row.ProductID, name: row.ProductName })) });
  } catch (error) {
    res.status(500).json({ error: error.message || 'No se pudo buscar' });
  }
});

router.get('/events/:key', async (req, res) => {
  const loader = LOADERS[req.params.key];
  if (!loader) return res.status(404).json({ error: 'Ese evento no existe' });
  if (!await requireAdmin(req, res)) return;
  try {
    const data = await withTx(loader);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'No se pudo leer el evento' });
  }
});

router.post('/events/:key', async (req, res) => {
  const saver = SAVERS[req.params.key];
  if (!saver) return res.status(404).json({ error: 'Ese evento no existe' });
  const actor = await requireAdmin(req, res);
  if (!actor) return;
  try {
    const message = await withTx((tx) => saver(tx, req.body || {}));
    console.log(`[EVENTS] ${actor.username} ${req.params.key}: ${message}`);
    const data = await withTx(LOADERS[req.params.key]);
    res.json({ ok: true, message: `${message} Reinicia el lobby para que lo tome.`, data });
  } catch (error) {
    res.status(400).json({ error: error.message || 'No se pudo guardar' });
  }
});

export default router;
