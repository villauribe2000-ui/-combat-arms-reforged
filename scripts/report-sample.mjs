import { queryLog, query, queryWeb, disconnect } from '../server/db.js';
const n = await queryLog(`SELECT COUNT(*) n FROM CBT_UserReportCommon`);
console.log('common', n.recordset);
const cats = await queryLog(`SELECT MainCategory, SubCategory, COUNT(*) c FROM CBT_UserReportCommon GROUP BY MainCategory, SubCategory`);
console.log('cats', cats.recordset);
const rows = await queryLog(`SELECT TOP 8 SeqNo, ReporterOiduser, MainCategory, SubCategory, TargetOiduser, TargetNickName, Message, RegDate FROM CBT_UserReportCommon ORDER BY RegDate DESC`);
console.log(rows.recordset);
const chat = await queryLog(`SELECT COUNT(*) n FROM CBT_UserReportChatLog`);
console.log('chat', chat.recordset);
const ing = await queryLog(`SELECT COUNT(*) n FROM CBT_UserReportInGameLog`);
console.log('ingame', ing.recordset);
try {
  const rev = await queryWeb(`SELECT TOP 5 * FROM report_reviews`);
  console.log('reviews', rev.recordset);
} catch (e) { console.log('reviews', e.message); }
await disconnect();
