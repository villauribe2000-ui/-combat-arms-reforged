import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('scripts/sql-tables.json', 'utf8'));
const want = ['DiscordAccounts','DiscordHistorico','CBT_Advertise','CBT_AdvertiseMessage','CBT_AdvertiseMessageInfo','CBT_UserAdvertise','two_factor','activity','CBT___HottimeRegister','CBT_Stat_CU_Ex'];
for (const [db, info] of Object.entries(data)) {
  if (!info.columns) continue;
  const grouped = {};
  for (const c of info.columns) {
    if (want.includes(c.TABLE_NAME)) {
      (grouped[c.TABLE_NAME] ||= []).push(`${c.COLUMN_NAME}:${c.DATA_TYPE}`);
    }
  }
  for (const [t, cols] of Object.entries(grouped)) {
    console.log(`\n[${db}] ${t}`);
    console.log(cols.join(', '));
  }
}
