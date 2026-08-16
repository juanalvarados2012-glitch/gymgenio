// 🗺️ PRUEBAS DE LOS SEGUROS DE SALUD
//
// Estas son las pruebas más importantes que NO son de dinero.
//
// GymGenio lo usan adolescentes. Si alguien escribe "quiero bajar 10 kg en 2
// semanas", la app JAMÁS debe decirle que sí: eso es medio kilo al día, y darle
// un plan para lograrlo sería empujar a alguien hacia algo peligroso.
//
// La regla: bajar como mucho ~1% del peso por semana (tope 0.9 kg) y subir como
// mucho 0.4 kg. Si la meta no cabe en ese ritmo, la app estira el tiempo o
// recorta la meta — pero nunca acelera.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ritmoMaximo, semanasSeguras, metaAlcanzable } from '../api/plan.js';

// Los decimales en JavaScript (y en cualquier computadora) no son exactos:
// 70 * 0.01 da 0.7000000000000001, no 0.7. No es un error del código, es cómo
// funcionan los números con punto. Por eso comparamos "casi igual".
function casiIgual(real, esperado, mensaje) {
  assert.ok(Math.abs(real - esperado) < 0.0001,
    (mensaje || '') + ' — esperaba ' + esperado + ' y dio ' + real);
}

describe('El ritmo máximo seguro (ritmoMaximo)', () => {

  test('✅ bajando: como mucho el 1% del peso por semana', () => {
    casiIgual(ritmoMaximo(70, 65), 0.7, '70 kg → 0.7 kg por semana');
    casiIgual(ritmoMaximo(60, 55), 0.6, '60 kg → 0.6 kg por semana');
  });

  test('🔒 el tope de 0.9 kg manda, por muy pesada que sea la persona', () => {
    // Sin el tope, alguien de 150 kg recibiría "1.5 kg por semana".
    assert.equal(ritmoMaximo(150, 100), 0.9);
    assert.equal(ritmoMaximo(200, 120), 0.9);
  });

  test('✅ subiendo el ritmo es más lento (0.4 kg), porque ganar músculo tarda', () => {
    assert.equal(ritmoMaximo(60, 70), 0.4);
  });
});

describe('Cuántas semanas hacen falta DE VERDAD (semanasSeguras)', () => {

  test('🔒 EL CASO PELIGROSO: "10 kg en 2 semanas" se convierte en muchas más', () => {
    const semanas = semanasSeguras(70, 60);
    assert.ok(semanas >= 14,
      'Bajar 10 kg desde 70 necesita 15 semanas, no 2. Dio: ' + semanas);
  });

  test('✅ una meta razonable se respeta', () => {
    assert.equal(semanasSeguras(70, 68), 3, '2 kg a 0.7/semana = 3 semanas');
  });

  test('✅ si ya casi estás en tu meta, no hace falta ninguna semana', () => {
    assert.equal(semanasSeguras(70, 69.8), 0);
  });

  test('🔒 sin datos no inventa nada', () => {
    assert.equal(semanasSeguras(0, 60), 0);
    assert.equal(semanasSeguras(70, 0), 0);
    assert.equal(semanasSeguras(null, undefined), 0);
  });

  test('✅ nunca devuelve "media semana": siempre al menos 1', () => {
    assert.equal(semanasSeguras(70, 69.4), 1);
  });
});

describe('Hasta dónde se llega de verdad (metaAlcanzable)', () => {

  test('✅ si la meta cabe en el tiempo, se respeta tal cual', () => {
    assert.equal(metaAlcanzable(70, 68, 8), 68);
  });

  test('🔒 EL CASO PELIGROSO: si no cabe, se recorta la meta (no se acelera)', () => {
    // "Quiero llegar a 60 kg en 2 semanas" desde 70 kg.
    // Lo máximo sano en 2 semanas es 1.4 kg → 68.6, no 60.
    const alcanzable = metaAlcanzable(70, 60, 2);
    assert.equal(alcanzable, 68.6);
    assert.ok(alcanzable > 60, 'NUNCA debe prometer los 60 kg en 2 semanas');
  });

  test('✅ subiendo también se recorta', () => {
    // Desde 60, en 4 semanas, lo máximo sano es +1.6 kg → 61.6
    assert.equal(metaAlcanzable(60, 70, 4), 61.6);
  });

  test('✅ el resultado sale redondito, no con 15 decimales', () => {
    const r = metaAlcanzable(83, 60, 3);
    assert.equal(r, Math.round(r * 10) / 10, 'un solo decimal, para que se lea bien');
  });
});
