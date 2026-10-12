import { query, queryVisms, disconnect } from '../server/db.js';
const id = 1;
const stats = await query(`
  SELECT COUNT(*) as total,
    SUM(CASE WHEN EndDate IS NULL OR EndDate > GETDATE() THEN 1 ELSE 0 END) as active
  FROM CBT_UserInventory WHERE oidUser = @id`, { id });
const inv = await query(`
  SELECT TOP 3 i.ItemNo, inf.Name, i.StartDate, i.EndDate, i.remaincount
  FROM CBT_UserInventory i LEFT JOIN CBT_ItemInfo inf ON inf.ItemNo = i.ItemNo
  WHERE i.oidUser = @id ORDER BY i.StartDate DESC`, { id });
const empty = await query(`SELECT COUNT(*) as n FROM CBT_UserInventory WHERE oidUser = 1034`);
const store = await query(`SELECT COUNT(*) as n FROM CBT_UserStore WHERE OidUser = @id`, { id });
const buy = await queryVisms(`SELECT COUNT(*) as n FROM VISMS_PurchaseLog WHERE oid = @id`, { id });
console.log({ stats: stats.recordset[0], inv: inv.recordset, empty1034: empty.recordset[0], store: store.recordset[0], buy: buy.recordset[0] });
await disconnect();
