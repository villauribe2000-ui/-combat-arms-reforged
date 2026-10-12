import { query, queryLog, queryVisms, disconnect } from '../server/db.js';

async function tryq(label, fn, sql) {
  try {
    const r = await fn(sql);
    console.log(label, r.recordset);
  } catch (e) {
    console.log(label, 'ERR', e.message);
  }
}

await tryq('buy curr', queryLog, `SELECT TOP 20 currency, COUNT(*) n, SUM(CAST(price AS BIGINT)) s FROM CBT_CharacterBuyProductLog GROUP BY currency`);
await tryq('buy sample', queryLog, `SELECT TOP 5 loggedAt, buyer, productId, currency, price FROM CBT_CharacterBuyProductLog ORDER BY loggedAt DESC`);
await tryq('prodlog', query, `SELECT COUNT(*) n, SUM(CAST(Price AS BIGINT)) gp, MIN(CreateDate) a, MAX(CreateDate) b FROM CBT_ProductLog`);
await tryq('prodlog d', query, `SELECT CONVERT(varchar(10), CreateDate, 120) d, COUNT(*) n, SUM(CAST(Price AS BIGINT)) gp FROM CBT_ProductLog WHERE CreateDate >= DATEADD(day,-30,GETDATE()) GROUP BY CONVERT(varchar(10), CreateDate, 120) ORDER BY d`);
await tryq('visms', queryVisms, `SELECT COUNT(*) n, SUM(CAST(TotalPrice AS BIGINT)) nx, SUM(CASE WHEN IsGift=1 THEN 1 ELSE 0 END) gifts FROM VISMS_PurchaseLog`);
await tryq('visms d', queryVisms, `SELECT CONVERT(varchar(10), RegDate, 120) d, COUNT(*) n, SUM(CAST(TotalPrice AS BIGINT)) nx FROM VISMS_PurchaseLog WHERE RegDate >= DATEADD(day,-30,GETDATE()) GROUP BY CONVERT(varchar(10), RegDate, 120) ORDER BY d`);
await tryq('held nx', queryVisms, `SELECT SUM(CAST(TotalBalance AS BIGINT)) nx, COUNT(*) accounts, SUM(CASE WHEN TotalBalance>0 THEN 1 ELSE 0 END) withNx FROM VISMS_UserList`);
await tryq('held gp', query, `SELECT SUM(CAST(Money AS BIGINT)) gp FROM CBT_User WHERE DeleteDate IS NULL`);
await tryq('buy ca', query, `SELECT TOP 3 * FROM CBT_CharacterBuyProductLog`);
await tryq('itemlog', queryLog, `SELECT TOP 3 * FROM CBT_ItemPurchaseLog`);
await disconnect();
