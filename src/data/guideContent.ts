export type GuideImage = { src: string; alt: string; width: number; height: number };

const G = '/caevo/guide';
const M = '/caevo/modes';

function img(file: string, alt: string, width: number, height: number): GuideImage {
  return { src: `${G}/${file}`, alt, width, height };
}

export const HUD_NOTES: [string, string][] = [
  ['Kill feed', 'Who made the kill, the weapon used, and the defeated player.'],
  ['Combat awards', 'Kill streaks and standout combat actions.'],
  ['Teams & score', 'Your team and the current match score.'],
  ['Radar & map', 'Your surroundings at a glance.'],
  ['Weapon selection', 'Your equipped weapon and other available equipment.'],
  ['Ammunition', 'Remaining ammunition and the selected fire mode.'],
  ['Health, armor & stamina', 'HP and AP, with sprint stamina shown by the blue bar.'],
  ['Chat', 'The match chat window.'],
  ['Communications', 'Radio messages and player join or leave notices.'],
  ['Reticle', 'The aiming marker in the center of your view.'],
];

export const HUD_IMAGE = img('guide-interface-1.jpg', 'Numbered Combat Arms in-game interface', 960, 768);

export const MOUSE_CONTROLS = [
  ['Aim', 'Move the mouse', 'guide-interface-mouse-control1.png'],
  ['Fire', 'Left mouse button', 'guide-interface-mouse-control2.png'],
  ['Use sights', 'Right mouse button', 'guide-interface-mouse-control3.png'],
] as const;

export const KEYBOARD_GROUPS = [
  {
    title: 'Character movement',
    image: img('guide-interface-key-control1.png', 'Character movement keyboard diagram', 865, 243),
    bindings: [['W', 'Move forward'], ['S', 'Move backward'], ['A', 'Strafe left'], ['D', 'Strafe right'], ['Space', 'Jump'], ['Shift', 'Sprint'], ['Ctrl', 'Crouch'], ['C', 'Switch run / walk']],
  },
  {
    title: 'Combat actions',
    image: img('guide-interface-key-control2.png', 'Combat actions keyboard diagram', 865, 243),
    bindings: [['1–5', 'Weapon / equipment selection'], ['Q', 'Previous weapon'], ['E', 'Interact / pick up / disarm'], ['F', 'Change fire mode'], ['R', 'Reload'], ['M', 'Open map']],
  },
  {
    title: 'Radio messages',
    image: img('guide-interface-key-control3.png', 'Radio messages keyboard diagram', 865, 243),
    bindings: [['V', 'Reply'], ['B', 'Request'], ['N', 'Situation report']],
  },
  {
    title: 'Chat & other controls',
    image: img('guide-interface-key-control4.png', 'Chat & other controls keyboard diagram', 865, 243),
    bindings: [['F1', 'Help'], ['F2', 'All chat'], ['F3', 'Team chat'], ['F4', 'Clan chat'], ['F5', 'Vote kick'], ['F8', 'Voice chat on / off'], ['Tab', 'Scoreboard'], ['Enter', 'Chat input'], ['[ / ]', 'Adjust mouse sensitivity']],
  },
];

function medal(n: number, title: string, requirements: string[], w = 40, h = 73) {
  return { id: `medal-${n}`, title, requirements, image: img(`guide-achieve-medal-${n}.png`, `${title} medal`, w, h) };
}

export const MEDALS = [
  medal(1, 'Clan Hero', ['Required rank: Staff Sergeant I.', 'Complete 100 clan matches and earn 50 clan-match victories.', 'Match participation counts when the game finishes normally.']),
  medal(2, 'Rank 3 Veteran', ['Accumulate 30 hours of play in normally completed games.']),
  medal(3, 'Rank 2 Veteran', ['Requires Rank 3 Veteran.', 'Accumulate 45 hours of play in normally completed games.']),
  medal(4, 'Rank 1 Veteran', ['Requires Rank 2 Veteran.', 'Accumulate 60 hours of play in normally completed games.']),
  medal(5, 'Rank 3 Fireteam Maniac', ['Record 4,000 Fireteam kills in completed Normal missions.'], 39, 72),
  medal(6, 'Rank 2 Fireteam Maniac', ['Requires Rank 3 Fireteam Maniac.', 'Record 6,000 Fireteam kills in completed Hard missions.', 'Finish in the top three six times on Hard difficulty or higher.'], 39, 72),
  medal(7, 'Rank 1 Fireteam Maniac', ['Requires Rank 2 Fireteam Maniac.', 'Record 9,000 Fireteam kills in completed Extreme missions.', 'Finish in the top three eight times on Hard difficulty or higher.'], 39, 72),
  medal(8, 'Rank 3 Annihilator', ['Achieve at least three combos in each of 30 successful Fireteam missions, on any difficulty.'], 38, 75),
  medal(9, 'Rank 2 Annihilator', ['Requires Rank 3 Annihilator.', 'Achieve at least five combos in each of 25 successful Fireteam missions, on any difficulty.', 'Earn 20 Multi Kills in normally completed games.', 'Make four kills without dying in each of 15 games.'], 38, 75),
  medal(10, 'Rank 1 Annihilator', ['Requires Rank 2 Annihilator.', 'Achieve at least ten combos in each of 20 successful Fireteam missions, on any difficulty.', 'Earn five Ultra Kills in normally completed games.', 'Make five kills without dying in each of ten games.'], 38, 75),
  medal(11, 'Rank 3 Head Hunter', ['Record 200 headshot kills outside Fireteam; the game must finish normally.']),
  medal(12, 'Rank 2 Head Hunter', ['Requires Rank 3 Head Hunter.', 'Record 270 headshot kills outside Fireteam; the game must finish normally.']),
  medal(13, 'Rank 1 Head Hunter', ['Requires Rank 2 Head Hunter.', 'Record 360 headshot kills outside Fireteam; the game must finish normally.']),
  medal(14, 'Rank 3 God of War', ['Record 1,800 kills in normally completed games.'], 44, 75),
  medal(15, 'Rank 2 God of War', ['Requires Rank 3 God of War.', 'Record 2,700 kills in normally completed games.'], 44, 75),
  medal(16, 'Rank 1 God of War', ['Requires Rank 2 God of War.', 'Record 3,600 kills in normally completed games.'], 44, 75),
  medal(17, 'Rank 3 All-Round Soldier', ['Explosives: six plants in winning matches, three detonations, and three defusals.', 'Flags: 40 CTF captures in winning matches, 20 recoveries, and ten Seize and Secure flag raises.', 'Spy Hunt: eliminate one Super Spy and transmit intel once as a Super Spy.', 'Quarantine: 40 human victories and 40 infected eliminations.', 'All other listed objectives count when the game finishes normally.'], 39, 72),
  medal(18, 'Rank 2 All-Round Soldier', ['Explosives: eight plants in winning matches, five detonations, and four defusals.', 'Flags: 60 CTF captures in winning matches, 30 recoveries, and 15 Seize and Secure flag raises.', 'Spy Hunt: eliminate two Super Spies and transmit intel twice as a Super Spy.', 'Quarantine: 55 human victories and 55 infected eliminations.', 'All other listed objectives count when the game finishes normally.'], 39, 72),
  medal(19, 'Rank 1 All-Round Soldier', ['Explosives: ten plants in winning matches, seven detonations, and five defusals.', 'Flags: 80 CTF captures in winning matches, 40 recoveries, and 20 Seize and Secure flag raises.', 'Spy Hunt: eliminate three Super Spies and transmit intel three times as a Super Spy.', 'Quarantine: 70 human victories and 70 infected eliminations.', 'All other listed objectives count when the game finishes normally.'], 39, 72),
];

export const EMPORIUM = [
  { id: 'emporium', title: 'The Emporium', summary: 'Manage your equipment through the shop, weapon forging, and customization.', steps: [] as string[], images: [img('guide-emporium-intro.jpg', 'Combat Arms Emporium menu', 961, 629)] },
  { id: 'shop', title: 'Shop', summary: 'Find weapons and equipment using the item search or category filters. Purchases use GP earned in matches or Gcoins.', steps: ['Weapons: browse primary, secondary, melee, and support equipment.', 'Gear: select characters and items for the head, face, uniform, vest, and backpack slots.', 'Cosmetics: change your appearance without adding their own stat bonuses.', 'Special and Premium: find Specialist equipment, abilities, function items, cases, and packages.', 'Modification: browse compatible scopes, suppressors, and magazines. Clan items can require membership or leadership.'], images: [img('guide-emporium-shop.jpg', 'Shop categories and equipment browser', 466, 696)] },
  { id: 'forge', title: 'Forge', summary: 'Combine eligible weapons with Forging Hardware to create the weapon described by a recipe.', steps: ['Choose a recipe and check its required weapon and components.', 'Use a weapon listed in the forging inventory; only eligible weapons appear there.', 'Collect hardware through Roulette or Jobs, then select Forge once you have the materials.'], images: [img('guide-emporium-forge.jpg', 'Forging recipe and materials interface', 466, 608)] },
  { id: 'customize', title: 'Customize', summary: 'Use Customization Parts to alter the stats of supported weapons.', steps: ['Pick an eligible weapon, then choose a customization slot and upgrade level.', 'Review the resulting stats, required parts, and displayed success chance. Higher levels need more parts.', 'GP can improve the success chance. Select Customize to attempt the upgrade.', 'Each attempt consumes parts. A failed attempt leaves the original weapon and customization slot intact.'], images: [img('guide-emporium-custom.jpg', 'Weapon customization slots and success chance', 466, 687)] },
  { id: 'roulette', title: 'Roulette', summary: 'Eligible completed matches can open a reward wheel containing items and weapon materials.', steps: ['Select one of the 12 outer positions within ten seconds; otherwise the game chooses one.', 'When the wheel stops, receive the item beside your chosen position.', 'Forging Hardware creates recipe weapons; Customization Parts modify existing weapons. Materials remain available until used.'], images: [img('guide-emporium-roulette.jpg', 'Post-match Roulette reward wheel', 961, 629)] },
];

const quarantine = [
  { src: `${M}/quarantine-infected-combat.jpg`, alt: 'Quarantine Mode gameplay with infected enemies advancing toward a human player', width: 1024, height: 768 },
  { src: `${M}/quarantine-art.webp`, alt: 'Combat Arms Quarantine artwork with soldiers and infected enemies', width: 500, height: 375 },
  { src: `${M}/quarantine-oil-rig-1.webp`, alt: 'Oil Rig exterior from the Quarantine Regen gallery', width: 1024, height: 768 },
  { src: `${M}/quarantine-oil-rig-2.webp`, alt: 'Players inside Oil Rig from the Quarantine Regen gallery', width: 1024, height: 768 },
];
const fireteam = [
  { src: `${M}/fireteam-desert-thunder-1.webp`, alt: 'Fireteam Extreme gameplay approaching the Desert Thunder temple', width: 1024, height: 768 },
  { src: `${M}/fireteam-desert-thunder-2.webp`, alt: 'Fireteam Extreme hostage rescue inside the Desert Thunder temple', width: 1024, height: 768 },
];

export type Mission = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  images: GuideImage[];
};

const MISSION_ORDER = ['training-grounds', 'elimination', 'one-man-army', 'search-and-destroy', 'capture-the-flag', 'spy-hunt', 'fireteam', 'quarantine-regen', 'elimination-pro', 'last-man-standing', 'bombing-run', 'seize-and-secure', 'snowball-fight', 'hired-guns', 'arms-race', 'vip-escort', 'vip-elimination', 'hunted', 'single-player', 'tag-of-wars', 'race-combat', 'big-head', 'lone-combat', 'lone-combat-infected', 'blood-arena'];

const MISSIONS_RAW: Mission[] = [
  { id: 'hired-guns', title: 'Hired Guns', summary: 'Two teams of up to eight players recruit computer-controlled mercenaries to help secure objectives.', steps: ['Press G to hire mercenaries and H to issue orders.', 'Follow me keeps mercenaries close without attacking. Go Go Go allows attacks while following. Hold Position keeps them defending their location.', 'Blood Money: return gold to your spawn and eliminate opponents to score. Rounds finish when the gold is secured or time expires.'], images: [img('guide-mission-1-left.jpg', 'Gold bars in the Hired Guns Blood Money bank vault', 465, 232), img('guide-mission-1-right.jpg', 'Hired Guns mercenary orders', 465, 232)] },
  { id: 'fireteam', title: 'Fireteam', summary: 'A cooperative squad of up to eight fights computer-controlled enemies. Use pickups and checkpoints to replenish health and ammunition.', steps: ['Fallen teammates return when the surviving squad reaches the next checkpoint.', 'Desert Fox: clear four sectors, recover intelligence, destroy anti-aircraft weapons, and reach helicopter extraction. Capturing the target alive provides additional intel.', 'Black Lung: defeat infected waves while completing and defending objectives. Normal, Hard, and Extreme use six, nine, and 12 rounds respectively.', 'Desert Thunder: recover the infiltration team\'s intelligence and finish every stage before time expires. HUD markers, messages, and timers track your objectives.', 'Desert Thunder sectors: Insertion Route, The Temple, The Road, and The Town.'], images: [...fireteam, img('guide-mission-fireteam1.jpg', 'Operation Desert Fox city viewed from above', 465, 203), img('guide-mission-fireteam2.jpg', 'Operation Desert Fox soldiers in street combat', 465, 203), img('guide-mission-fireteam3.jpg', 'Operation Black Lung infected encounter', 465, 232), img('guide-mission-fireteam4.jpg', 'Operation Black Lung combat', 465, 232), img('guide-mission-fireteam-5.jpg', 'Desert Thunder objective markers and mission HUD', 960, 479), img('guide-mission-thundermap.jpg', 'Desert Thunder map showing all four sectors', 960, 798), img('guide-mission-thundermap-sector1.jpg', 'Desert Thunder sector 1: Insertion Route', 235, 124), img('guide-mission-thundermap-sector2.jpg', 'Desert Thunder sector 2: The Temple', 235, 124), img('guide-mission-thundermap-sector3.jpg', 'Desert Thunder sector 3: The Road', 235, 124), img('guide-mission-thundermap-sector4.jpg', 'Desert Thunder sector 4: The Town', 235, 124)] },
  { id: 'seize-and-secure', title: 'Seize and Secure', summary: 'Raise your team\'s flag at the central pole and defend it for two uninterrupted minutes to win.', steps: ['Holding the flag earns points every second.', 'If time expires first, the team holding the pole receives 50 bonus points; the higher total wins.'], images: [] },
  { id: 'training-grounds', title: 'Training Grounds', summary: 'Practice the basics in an optional introductory mission.', steps: ['You can repeat training, but its completion reward is granted only once.'], images: [] },
  { id: 'bombing-run', title: 'Bombing Run', summary: 'Fight for possession of the bomb, carry it to the objective, and plant it.', steps: ['The defending team can recover the bomb or defuse it after planting.', 'Detonation or defusal decides the round. Reach the configured round-win target to win the match.'], images: [] },
  { id: 'one-man-army', title: 'One Man Army', summary: 'Every player competes alone. Each elimination adds one point toward the match\'s kill target.', steps: ['Last Man Standing: each player gets one life per round. The sole survivor earns a point, and the highest score wins the match.'], images: [] },
  { id: 'quarantine-regen', title: 'Quarantine Regen', summary: 'Players are randomly chosen as infected at the start; everyone else must survive.', steps: ['Humans win by surviving until time expires or eliminating every infected player.', 'Infected players convert humans with melee attacks and win by infecting everyone.'], images: quarantine },
  { id: 'spy-hunt', title: 'Spy Hunt', summary: 'Collect intel cases to become a Spy, then gather the complete set to become the Super Spy.', steps: ['Intel Hunt: carrying intel makes you a target. Defeated Spies drop their cases and respawn as Mercenaries.', 'Sudden Death: respawns stop. The Super Spy must transmit the intel while the other players work together to stop the upload.', 'The Super Spy receives special armor and weapons. Eliminate that player, prevent the transmission until time expires, or complete the upload to resolve the mission.'], images: [img('guide-mission-intel-1.jpg', 'Spy Hunt intel collection phase', 465, 232), img('guide-mission-sudden-1.jpg', 'Spy Hunt sudden-death transmitter objective', 465, 232)] },
  { id: 'capture-the-flag', title: 'Capture the Flag', summary: 'Steal the opposing flag and carry it to your own flag to score. Your flag must be at home for the capture to count.', steps: ['Defeat a flag carrier to make the flag drop. Touch your dropped flag to return it to base.', 'Reach the capture target first, or hold the higher capture score when time expires.'], images: [img('guide-mission-capture-1.jpg', 'Capture the Flag gameplay and flag location', 960, 479)] },
  { id: 'elimination', title: 'Elimination', summary: 'Alpha and Bravo compete to reach the team kill target; each opposing player eliminated adds one point.', steps: ['Elimination Pro: players have one life each round. Eliminate the opposing team to earn a round victory.'], images: [] },
  { id: 'search-and-destroy', title: 'Search and Destroy', summary: 'Attackers plant and detonate a bomb while defenders protect the sites or defuse the planted device.', steps: ['At a target site, use E to plant. Defenders use E beside the planted bomb to defuse it.', 'Detonation, defusal, or eliminating the opposing team can decide a round. Reach the round-win target to take the match.'], images: [img('guide-mission-search-1.jpg', 'Search & Destroy bomb planting objective', 465, 232), img('guide-mission-search-2.jpg', 'Search & Destroy bomb defusal objective', 465, 232)] },
  { id: 'elimination-pro', title: 'Elimination Pro', summary: 'Fight team battles with a single life each round. Clear the opposing squad to earn a round victory.', steps: ['Eliminated players wait for the next round to return.', 'Work with surviving teammates and reach the match\'s round-win target.'], images: [] },
  { id: 'last-man-standing', title: 'Last Man Standing', summary: 'Compete alone against every other player and survive to be the final player alive.', steps: ['You have one life each round, with no respawn until the following round.', 'Win rounds to build your score and finish ahead of the other survivors.'], images: [] },
  { id: 'snowball-fight', title: 'Snowball Fight', summary: 'An Elimination-style team battle using snow weapons that freeze opponents.', steps: ['Freeze an enemy with snow weapons, then use the shovel to finish them with an Ice Crush.', 'Help thaw frozen teammates so they can return to the fight.'], images: [] },
  { id: 'arms-race', title: 'Arms Race', summary: 'Earn kills to advance through a changing arsenal in a free-for-all weapon challenge.', steps: ['Fight with the weapons assigned at your current stage.', 'Progress through the weapon families and complete the final stage before your opponents.'], images: [] },
  { id: 'vip-escort', title: 'VIP Escort', summary: 'One team rescues and escorts a VIP to helicopter extraction while the other tries to stop the escape.', steps: ['The escort team opens the VIP\'s confinement and protects the route to the helicopter.', 'The opposing team wins by eliminating the VIP or preventing extraction before time expires.', 'Players have one life per round, so coordinate your rescue or ambush.'], images: [] },
  { id: 'vip-elimination', title: 'VIP Elimination', summary: 'Team deathmatch where eliminating an opposing VIP earns more points than an ordinary kill.', steps: ['Leading players can receive Bronze, Silver, or Gold VIP status.', 'Protect your valuable teammates while targeting enemy VIPs to reach the score goal first.', 'Eliminated players respawn and rejoin the match.'], images: [] },
  { id: 'hunted', title: 'Hunted', summary: 'Start unarmed, scavenge equipment, and outlast the other players as rising toxic water closes off the low ground.', steps: ['Search the map for weapons, ammunition, and useful supplies.', 'Move uphill as the flood rises; each round gives you a single life.', 'Activating the hill\'s scanner reveals every player\'s position, including your own.'], images: [] },
  { id: 'single-player', title: 'Single Player', summary: 'Take on computer-controlled opponents alone in bot matches or Fireteam-style survival scenarios.', steps: ['On PvP maps, eliminate bots until you reach the match\'s kill target.', 'On PvE maps, fight the infected and stay alive; death ends the attempt.', 'The selected difficulty changes the challenge posed by the bots.'], images: [] },
  { id: 'tag-of-wars', title: 'Tag of Wars', summary: 'Defeat enemy players and collect their dropped dog tags to score for your team.', steps: ['Recover a fallen ally\'s tag to deny the opposing team that point.', 'Reach the tag collection target before the other team. Players respawn throughout the match.'], images: [] },
  { id: 'race-combat', title: 'Race Combat', summary: 'Race through connected cube rooms and activate checkpoints ahead of your opponents.', steps: ['Hold E at a room\'s lever to activate its checkpoint and score.', 'Eliminating opponents earns additional points.', 'Room settings determine whether players compete individually or as Alpha and Bravo teams.'], images: [] },
  { id: 'big-head', title: 'Big Head', summary: 'Compete for the kill target while successful streaks make your character\'s head grow larger.', steps: ['Each successive kill increases your head size until it reaches its maximum.', 'Being eliminated resets your head to its normal size.'], images: [] },
  { id: 'lone-combat', title: 'Lone Combat', summary: 'Scavenge weapons and supplies in a solo survival match while toxic gas gradually makes areas unsafe.', steps: ['Begin unarmed and search Noxious Damnation for equipment.', 'Use connections between areas to escape the spreading gas.', 'You have one life per round. Outlast the other players to win.'], images: [] },
  { id: 'lone-combat-infected', title: 'Lone Combat Infected', summary: 'Survival scavenging with an infection twist: compete to become the last uninfected human.', steps: ['Find weapons and supplies while escaping areas filled with toxic gas.', 'Infected players remain active and can hunt the surviving humans.', 'The round continues until only one human remains.'], images: [] },
  { id: 'blood-arena', title: 'Blood Arena', summary: 'A cooperative Fireteam mission that takes your squad through NEMEXIS Lab Underground.', steps: ['Fight through the compound and defeat the minions blocking your escape.', 'Work together to defeat the final boss and complete the mission.'], images: [] },
];

export const MISSIONS = [...MISSIONS_RAW].sort((a, b) => MISSION_ORDER.indexOf(a.id) - MISSION_ORDER.indexOf(b.id));

export const MODE_ICONS: Record<string, string> = {
  'training-grounds': `${G}/modes/btn_treinamento.png`,
  elimination: `${G}/modes/btn_eliminacao.png`,
  'one-man-army': `${G}/modes/btn_exercitosolo.png`,
  'search-and-destroy': `${G}/modes/btn_buscaredestruir.png`,
  'capture-the-flag': `${G}/modes/btn_capturarabandeira.png`,
  'spy-hunt': `${G}/modes/btn_cacaespioes.png`,
  fireteam: `${G}/modes/btn_equipearmada.png`,
  'quarantine-regen': `${G}/modes/btn_quarentena.png`,
  'bombing-run': `${G}/modes/btn_bombingrun.png`,
  'seize-and-secure': `${G}/modes/btn_seizensecure.png`,
  'snowball-fight': `${G}/modes/btn_snow.png`,
  'hired-guns': `${G}/modes/btn_hiredguns.png`,
  'arms-race': `${G}/modes/btn_armsrace.png`,
  'vip-escort': `${G}/modes/btn_escoltavip.png`,
  'vip-elimination': `${G}/modes/btn_eliminacaovip.png`,
  hunted: `${G}/modes/btn_hunted.png`,
  'tag-of-wars': `${G}/modes/btn_capturarabandeira.png`,
  'race-combat': `${G}/modes/btn_death.png`,
  'lone-combat': `${G}/modes/btn_bloodmoney.png`,
  'lone-combat-infected': `${G}/modes/btn_quarentena.png`,
};

function rank(name: string, abbreviation: string, folder: string, id: string, n = 1) {
  const images = Array.from({ length: n }, (_, s) =>
    img(`guide-rank-${folder}-${id}${n > 1 ? s + 1 : ''}.png`, `${name}${n > 1 ? ` ${s + 1}` : ''} insignia`, n > 1 ? (s === 0 ? 28 : 31) : 20, 21),
  );
  return { name, abbreviation, images };
}

export const RANK_GROUPS = [
  { title: 'Grunts', ranks: [rank('Training / Recruit', 'TRN / RCT', 'grunts', 'trn'), rank('Private', 'PVT', 'grunts', 'pvt'), rank('Private First Class', 'PFC', 'grunts', 'pfc'), rank('Corporal', 'CPL', 'grunts', 'cpl'), rank('Sergeant', 'SGT', 'grunts', 'sgt')] },
  { title: 'Field Officers', ranks: [rank('Staff Sergeant', 'SSG', 'field', 'ssg', 3), rank('Sergeant First Class', 'SFC', 'field', 'sfc', 3), rank('Master Sergeant', 'MSG', 'field', 'msg', 4), rank('Command Sergeant Major', 'CSM', 'field', 'csm', 5)] },
  { title: 'Command Officers', ranks: [rank('Second Lieutenant', '2LT', 'command', '2lt', 5), rank('First Lieutenant', '1LT', 'command', '1lt', 5), rank('Captain', 'CPT', 'command', 'cpt', 5)] },
  { title: 'Commissioned Officers', ranks: [rank('Major', 'MAJ', 'commission', 'maj', 5), rank('Lieutenant Colonel', 'LTC', 'commission', 'ltc', 5), rank('Colonel', 'COL', 'commission', 'col', 5)] },
  { title: 'Generals', ranks: [rank('Brigadier General', 'BG', 'general', 'bg'), rank('Major General', 'MG', 'general', 'mg'), rank('Lieutenant General', 'LTG', 'general', 'ltg'), rank('General', 'GEN', 'general', 'gen'), rank('General of the Army', 'GOA', 'general', 'goa')] },
  {
    title: 'Commander in Chief',
    ranks: (['I', 'II', 'III', 'IV', 'V'] as const).map((roman, i) => ({
      name: `Commander in Chief ${roman}`,
      abbreviation: `CIC${i + 1}`,
      images: [img(`guide-rank-commander-cic${i + 1}.webp`, `Commander in Chief ${roman} insignia`, 20, 21)],
    })),
  },
];
