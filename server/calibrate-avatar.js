import robot from 'robotjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('=== CALIBRACIÓN DE TEST.EXE ===');
  console.log('');
  console.log('1. Abre Test.exe manualmente');
  console.log('2. Responde con la posición de cada campo');
  console.log('');
  console.log('Mueve el mouse a cada ubicación y presiona Enter para capturar la posición');
  console.log('');
  
  const fields = [
    'CAMO_U (row 0)',
    'HELMET_U (row 0)',
    'FACE (row 0)',
    'CAMO_T (row 0)',
    'VEST (row 0)',
    'HELMET_T (row 0)',
    'FACE_GEAR (row 0)',
    'WEAPON (row 0)',
    'MERC (row 0)',
    'EXPORT button',
    'EXPORT EX button',
  ];
  
  const positions = {};
  
  for (const field of fields) {
    await question(`\nPositiona el mouse en: ${field}\nPresiona Enter cuando esté listo...`);
    const pos = robot.getMousePos();
    positions[field] = pos;
    console.log(`  📍 Capturado: x=${pos.x}, y=${pos.y}`);
  }
  
  console.log('\n=== RESULTADO ===\n');
  console.log('const CONTROLS = {');
  for (const [field, pos] of Object.entries(positions)) {
    const key = field
      .replace(/\s+\(.*\)/, '')
      .toUpperCase()
      .replace(/ /g, '_') + '_FIELD';
    console.log(`  ${key}: { x: ${pos.x}, y: ${pos.y} },`);
  }
  console.log('};');
  
  rl.close();
}

main().catch(console.error);
