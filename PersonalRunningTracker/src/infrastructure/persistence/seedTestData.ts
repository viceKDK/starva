/**
 * Seed Test Data Utility
 * 
 * Este archivo proporciona funciones para insertar datos de prueba en la base de datos
 * para facilitar el testing de la aplicación.
 */

import { SQLiteRunRepository } from './SQLiteRunRepository';
import { Run, GPSPoint } from '../../domain/entities';

/**
 * Genera un UUID simple para testing
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Genera puntos GPS simulados para una ruta de prueba
 * Simula una carrera en Madrid, España
 */
function generateTestRoute(
  startLat: number,
  startLng: number,
  distanceKm: number,
  durationMinutes: number
): GPSPoint[] {
  const points: GPSPoint[] = [];
  const totalPoints = Math.floor(durationMinutes * 2); // Un punto cada 30 segundos
  const startTime = new Date('2024-09-25T07:30:00'); // 25 de septiembre 2024
  
  // Calcular incrementos de latitud/longitud para simular movimiento
  // Aproximadamente 0.009 grados = 1km
  const latIncrement = (distanceKm * 0.009) / totalPoints;
  const lngIncrement = (distanceKm * 0.009 * 0.7) / totalPoints; // Movimiento diagonal
  
  for (let i = 0; i < totalPoints; i++) {
    const timestamp = new Date(startTime.getTime() + (i * 30 * 1000)); // Cada 30 segundos
    
    // Añadir algo de variación para hacer la ruta más realista
    const variance = (Math.random() - 0.5) * 0.0001;
    
    points.push({
      latitude: startLat + (latIncrement * i) + variance,
      longitude: startLng + (lngIncrement * i) + variance,
      timestamp,
      altitude: 650 + Math.random() * 20, // Variación de altitud
      accuracy: 5 + Math.random() * 10 // Precisión GPS entre 5-15m
    });
  }
  
  return points;
}

/**
 * Crea un run de prueba con características personalizadas
 */
export function createTestRun(
  name: string,
  distanceKm: number,
  durationMinutes: number,
  date: Date,
  startLat: number = 40.4168, // Centro de Madrid
  startLng: number = -3.7038
): Run {
  const route = generateTestRoute(startLat, startLng, distanceKm, durationMinutes);
  const startTime = date;
  const endTime = new Date(date.getTime() + durationMinutes * 60 * 1000);
  const distance = distanceKm * 1000; // convertir a metros
  const duration = durationMinutes * 60; // convertir a segundos
  const averagePace = duration / distanceKm; // segundos por km
  
  return {
    id: generateUUID(),
    startTime,
    endTime,
    distance,
    duration,
    averagePace,
    route,
    name,
    notes: `Carrera de prueba - ${name}`,
    createdAt: date
  };
}

/**
 * Datos de prueba predefinidos
 */
export const TEST_RUNS = {
  // Carrera del 25 de septiembre de 2024
  septemberRun: createTestRun(
    'Carrera Matinal - Parque del Retiro',
    5.2,
    28,
    new Date('2024-09-25T07:30:00'),
    40.4153, // Parque del Retiro, Madrid
    -3.6844
  ),
  
  // Carrera reciente - 3 de noviembre de 2024
  recentRun: createTestRun(
    'Entrenamiento Intervalos',
    8.5,
    42,
    new Date('2024-11-03T18:00:00'),
    40.4168,
    -3.7038
  ),
  
  // Carrera larga - 1 de noviembre de 2024
  longRun: createTestRun(
    'Carrera Larga - Domingo',
    15.3,
    85,
    new Date('2024-11-01T09:00:00'),
    40.4400,
    -3.6900
  ),
  
  // Carrera corta - 5 de noviembre de 2024 (hoy)
  todayRun: createTestRun(
    'Carrera Rápida 5K',
    5.0,
    24,
    new Date('2024-11-05T07:00:00'),
    40.4168,
    -3.7038
  ),
  
  // Carrera de recuperación
  recoveryRun: createTestRun(
    'Recuperación Suave',
    3.5,
    22,
    new Date('2024-10-28T17:30:00'),
    40.4200,
    -3.7000
  )
};

/**
 * Inserta todos los runs de prueba en la base de datos
 */
export async function seedAllTestRuns(): Promise<void> {
  const repository = new SQLiteRunRepository();
  await repository.initialize();
  
  console.log('🌱 Insertando datos de prueba...');
  
  for (const [key, run] of Object.entries(TEST_RUNS)) {
    try {
      const result = await repository.save(run);
      if (result.success) {
        console.log(`✅ Insertado: ${run.name} (${key})`);
      } else {
        console.error(`❌ Error insertando ${run.name}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Excepción insertando ${run.name}:`, error);
    }
  }
  
  console.log('✨ Datos de prueba insertados correctamente');
}

/**
 * Inserta un solo run de prueba
 */
export async function seedSingleRun(runKey: keyof typeof TEST_RUNS): Promise<void> {
  const repository = new SQLiteRunRepository();
  await repository.initialize();
  
  const run = TEST_RUNS[runKey];
  const result = await repository.save(run);
  
  if (result.success) {
    console.log(`✅ Insertado: ${run.name}`);
  } else {
    console.error(`❌ Error insertando ${run.name}:`, result.error);
  }
}

/**
 * Limpia todos los runs de la base de datos (usar con cuidado!)
 */
export async function clearAllRuns(): Promise<void> {
  const repository = new SQLiteRunRepository();
  await repository.initialize();
  
  const runsResult = await repository.findAll();
  if (runsResult.success && runsResult.data) {
    console.log(`🗑️ Eliminando ${runsResult.data.length} runs...`);
    
    for (const run of runsResult.data) {
      await repository.delete(run.id);
    }
    
    console.log('✨ Todos los runs eliminados');
  }
}
