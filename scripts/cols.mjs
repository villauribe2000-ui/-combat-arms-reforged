import { readFileSync } from 'fs';
const s = JSON.parse(readFileSync('scripts/sql-summary.json', 'utf8'));
const want = [
  'CBT_User', 'CBT_UserEx', 'CBT_UserDetailInfo', 'CBT_UserLog', 'CBT_ProductInfo',
  'CBT_ProductInfo_Price', 'CBT_ProductInfo_ShopView', 'CBT_GameMap', 'CBT_MapOpen',
  'CBT_GameMode', 'CBT_Advertise', 'CBT_AdvertiseMessage', 'CBT_AdvertiseMessageInfo',
  'CBT_EventEXPGP', 'CBT___HottimeRegister', 'CBT__UserHottime', 'CBT_UserHottime',
  'DiscordAccounts', 'CBT_PartnerUser', 'CBT_UserLoginLog01', 'CBT_UserGameLog01',
  'CBT_GameRoomLog01', 'gdt_Guild', 'gdt_Member', 'VISMS_UserList', 'VISMS_PurchaseLog',
  'CBT_ClanInfo', 'CBT_ServerCurrentMode', 'CBT_Stat_CU_Ex', 'CBT_UserAuth',
  'CBT_LastLoginMacAddress', 'CBT_BanUserList', 'CBT_LobbyReport', 'CBT_UserReportCommon',
  'activity', 'sessions', 'two_factor', 'punishments', 'report_reviews', 'PaymentCodes',
  'CBT_NXGradeInfo', 'CBT_UserEM'
];
for (const [db, info] of Object.entries(s)) {
  if (!info.interesting) continue;
  for (const t of info.interesting) {
    const short = t.table.split('.')[1];
    if (want.includes(short)) {
      console.log(`\n[${db}] ${t.table}`);
      console.log(t.columns.join(', '));
    }
  }
}
