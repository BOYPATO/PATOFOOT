const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const requiredSourceCheck = path.join(
  rootDir,
  'public',
  'assets',
  'aistudio',
  'players_data_light-2026_2027_c9e92aeb.csv'
);

if (!fs.existsSync(requiredSourceCheck)) {
  console.log(
    '[prebuild] Source CSV assets not present; using pre-generated src/data/*.ts rosters.'
  );
  process.exit(0);
}

const scripts = [
  'generateEuropeTop5.cjs',
  'generateAllContinentalLeagues.cjs',
  'generateTurkey2026.cjs',
  'generateGreece2026.cjs',
  'generateScotland2026.cjs',
  'generateNorway2026.cjs',
  'generateSwitzerland2026.cjs',
  'generateDenmark2026.cjs',
  'generateSweden2026.cjs',
  'generateSpecialLeagues2026.cjs',
  'generateChampionship2026.cjs',
  'generateLeagueOne2026.cjs',
  'generateLeagueTwo2026.cjs',
];

for (const scriptName of scripts) {
  const scriptPath = path.join(__dirname, scriptName);
  if (fs.existsSync(scriptPath)) {
    execFileSync(process.execPath, [scriptPath], {
      cwd: rootDir,
      stdio: 'inherit',
    });
  }
}
