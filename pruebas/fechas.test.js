// 📅 PRUEBAS DE LA FECHA DE LA PERSONA (no la del servidor)
//
// El servidor de Vercel vive en horario universal (UTC). Alguien en México que
// cena a las 8 de la noche ya es "mañana" para el servidor: su cena se guardaba
// en el día equivocado, el total de hoy salía en cero y su racha se rompía sola.
// Esto le pasó a gente de verdad.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fechaLocal } from '../api/_comun.js';

// El desfase es lo que da getTimezoneOffset en el navegador: los minutos que hay
// que SUMARLE a la hora local para llegar a UTC. México (UTC-6) manda 360.
const MEXICO = 360;
const ESPANA = -120;   // UTC+2 en verano
const JAPON = -540;    // UTC+9

describe('La fecha de HOY donde está la persona (fechaLocal)', () => {

  test('🔒 EL CASO REAL: 8 de la noche en México sigue siendo HOY', (t) => {
    // 3 de agosto, 8 pm en México = 4 de agosto, 2 am en UTC.
    // El servidor diría "4 de agosto". Para la persona todavía es el 3.
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-08-04T02:00:00Z') });
    assert.equal(fechaLocal(MEXICO), '2026-08-03',
      'Su cena debe guardarse en el día que ella está viviendo.');
  });

  test('✅ y en España a esa misma hora ya es el día siguiente', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-08-04T02:00:00Z') });
    assert.equal(fechaLocal(ESPANA), '2026-08-04');
  });

  test('✅ Japón, que va por delante de UTC', (t) => {
    // 31 de diciembre 10 pm en UTC ya es 1 de enero en Japón.
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-31T22:00:00Z') });
    assert.equal(fechaLocal(JAPON), '2027-01-01');
  });

  test('🔒 un desfase absurdo no rompe nada: se usa UTC', (t) => {
    // Alguien podría mandarnos cualquier número desde el navegador. Las zonas
    // horarias de verdad van de -14 h a +14 h; fuera de ahí no le creemos.
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-08-04T12:00:00Z') });
    for (const basura of [999999, -999999, 'hola', null, undefined, NaN, Infinity]) {
      assert.equal(fechaLocal(basura), '2026-08-04',
        'Debería caer en UTC con: ' + String(basura));
    }
  });

  test('✅ siempre devuelve el formato AAAA-MM-DD', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-05T12:00:00Z') });
    assert.match(fechaLocal(0), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(fechaLocal(0), '2026-01-05', 'con el cero delante del mes y del día');
  });
});
