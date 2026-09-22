/*
# Update tournament seed data to Combat Arms Reforged theme

Updates existing tournament names and games to match the Combat Arms Reforged branding.
*/

UPDATE tournaments SET name = 'Combat Arms Championship Season 7', game = 'Combat Arms Reforged' WHERE name = 'FCA Championship Season 7';
UPDATE tournaments SET name = 'Weekly Showdown #42', game = 'Combat Arms Reforged' WHERE name = 'Weekly Showdown #42' AND game = 'League of Legends';
UPDATE tournaments SET name = 'Pro Series Finals', game = 'Combat Arms Reforged' WHERE name = 'Pro Series Finals' AND game = 'Counter-Strike 2';