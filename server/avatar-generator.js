import robot from 'robotjs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuración de controles de Test.exe (basado en el screenshot)
// Las coordenadas son aproximadas y pueden necesitar ajuste
const CONTROLS = {
  // Row 0 - campos de entrada
  CAMO_U_INPUT: { x: 181, y: 122 },
  HELMET_U_INPUT: { x: 297, y: 122 },
  FACE_INPUT: { x: 360, y: 122 },
  CAMO_T_INPUT: { x: 439, y: 122 },
  VEST_INPUT: { x: 533, y: 122 },
  HELMET_T_INPUT: { x: 630, y: 122 },
  FACE_GEAR_INPUT: { x: 710, y: 122 },
  WEAPON_INPUT: { x: 855, y: 122 },
  MERC_INPUT: { x: 966, y: 122 },
  
  // Botones
  EXPORT_BUTTON: { x: 674, y: 369 },
  EXPORT_EX_BUTTON: { x: 882, y: 369 },
};

// Llenar un campo de texto
async function fillField(fieldName, value, attempts = 3) {
  if (!value || value <= 0) return;
  
  const coords = CONTROLS[fieldName];
  if (!coords) {
    console.warn(`Campo no encontrado: ${fieldName}`);
    return;
  }
  
  try {
    for (let i = 0; i < attempts; i++) {
      robot.moveMouse(coords.x, coords.y);
      await new Promise(r => setTimeout(r, 100));
      robot.click();
      await new Promise(r => setTimeout(r, 100));
      
      // Triple click para seleccionar todo
      robot.click();
      robot.click();
      robot.click();
      await new Promise(r => setTimeout(r, 100));
      
      // Escribir valor
      robot.typeString(String(value), 50);
      await new Promise(r => setTimeout(r, 200));
      
      // Presionar Tab para confirmar
      robot.keyTap('tab');
      await new Promise(r => setTimeout(r, 150));
      
      console.log(`✓ Campo ${fieldName} = ${value}`);
      return;
    }
  } catch (error) {
    console.error(`Error llenando ${fieldName}:`, error.message);
  }
}

// Hacer click en un botón
async function clickButton(buttonName, wait = 1000) {
  const coords = CONTROLS[buttonName];
  if (!coords) {
    console.warn(`Botón no encontrado: ${buttonName}`);
    return;
  }
  
  try {
    robot.moveMouse(coords.x, coords.y);
    await new Promise(r => setTimeout(r, 150));
    robot.click();
    await new Promise(r => setTimeout(r, wait));
    console.log(`✓ Click en ${buttonName}`);
  } catch (error) {
    console.error(`Error haciendo click en ${buttonName}:`, error.message);
  }
}

export async function generateAvatarImage(equipment, outputPath) {
  try {
    console.log('\n=== GENERANDO AVATAR ===');
    console.log('Equipo:', equipment);
    
    // Lanzar Test.exe
    const testExePath = 'C:\\Users\\USUARIO\\Downloads\\src_18ed106d\\avatar\\Test.exe';
    console.log(`Abriendo: ${testExePath}`);
    const proc = spawn(testExePath);
    
    // Esperar a que se abra y cargue
    console.log('Esperando a que Test.exe se cargue...');
    await new Promise(r => setTimeout(r, 4000));
    
    // Llenar los campos de equipamiento
    console.log('Llenando campos...');
    
    if (equipment.CamoItemNo && equipment.CamoItemNo > 0) {
      await fillField('CAMO_U_INPUT', equipment.CamoItemNo);
    }
    
    if (equipment.HelmetItemNo && equipment.HelmetItemNo > 0) {
      await fillField('HELMET_U_INPUT', equipment.HelmetItemNo);
    }
    
    if (equipment.FaceItemNo && equipment.FaceItemNo > 0) {
      await fillField('FACE_INPUT', equipment.FaceItemNo);
    }
    
    if (equipment.VestItemNo && equipment.VestItemNo > 0) {
      await fillField('VEST_INPUT', equipment.VestItemNo);
    }
    
    if (equipment.AssultItemNo && equipment.AssultItemNo > 0) {
      await fillField('WEAPON_INPUT', equipment.AssultItemNo);
    }
    
    // Esperar a que se renderice
    console.log('Esperando renderizado...');
    await new Promise(r => setTimeout(r, 2000));
    
    // Hacer click en Export EX
    console.log('Exportando imagen...');
    await clickButton('EXPORT_EX_BUTTON', 3000);
    
    // Esperar a que se guarde
    await new Promise(r => setTimeout(r, 2000));
    
    // Cerrar Test.exe
    console.log('Cerrando Test.exe...');
    proc.kill();
    
    console.log('✓ Avatar generado exitosamente\n');
    return true;
  } catch (error) {
    console.error('✗ Error generando avatar:', error);
    return false;
  }
}
