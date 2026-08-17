// ☁️ PRUEBAS DE LA NUBE
//
// Qué cuidan: que sincronizar entre dos dispositivos NO borre nada.
//
// Este es un error de los que no se ven en pantalla. Nadie recibe un mensaje de
// "se perdieron tus entrenos": simplemente un día la racha aparece más corta y
// la persona cree que se equivocó ella. Para cuando alguien se da cuenta, el
// dato ya no está en ningún lado. Por eso se prueba antes de escribirlo.
//
// Cada prueba de aquí se comprobó rompiendo nube.js a propósito.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fusionar, normalizar, mismoPlan, hayAlgoQueGuardar } from '../nube.js';

// Un plan de mentira, con la forma que usa la app de verdad.
const planDe = (creado, titulo = 'Mi plan', dias = 3) => ({
  plan: { titulo, dias: Array.from({ length: dias }, () => ({ ejercicios: [] })) },
  esPro: false,
  datos: { objetivo: 'bajar' },
  creado
});

// ─────────────────────────────────────────────────────────────
// El caso que motivó todo esto
// ─────────────────────────────────────────────────────────────

test('dos dispositivos con entrenos distintos: NO se pierde ninguno', () => {
  const telefono = {
    ts: 2000,
    plan: planDe('2026-08-01'),
    prog: { ej: {}, dias: {}, sesiones: ['2026-08-05', '2026-08-07'] },
    pesos: []
  };
  const tablet = {
    ts: 1000,
    plan: planDe('2026-08-01'),
    prog: { ej: {}, dias: {}, sesiones: ['2026-08-06'] },
    pesos: []
  };

  const r = fusionar(telefono, tablet);

  assert.deepEqual(r.prog.sesiones, ['2026-08-05', '2026-08-06', '2026-08-07']);
});

test('el dispositivo más nuevo no borra la racha del más viejo', () => {
  // El teléfono lleva una semana sin abrirse y no sabe nada de lo reciente.
  const servidor = {
    ts: 5000,
    plan: planDe('2026-08-01'),
    prog: { ej: {}, dias: {}, sesiones: ['2026-08-01', '2026-08-03', '2026-08-05'] },
    pesos: []
  };
  const telefonoViejo = {
    ts: 9000,                                  // más nuevo, pero con MENOS historia
    plan: planDe('2026-08-01'),
    prog: { ej: {}, dias: {}, sesiones: ['2026-08-01'] },
    pesos: []
  };

  const r = fusionar(servidor, telefonoViejo);

  assert.equal(r.prog.sesiones.length, 3, 'el más nuevo pisó la racha del otro');
});

test('el peso anotado en un dispositivo sobrevive al otro', () => {
  const a = { ts: 1, plan: planDe('2026-08-01'), pesos: [{ f: '2026-08-01', kg: 80 }] };
  const b = { ts: 2, plan: planDe('2026-08-01'), pesos: [{ f: '2026-08-08', kg: 79 }] };

  const r = fusionar(a, b);

  assert.deepEqual(r.pesos, [
    { f: '2026-08-01', kg: 80 },
    { f: '2026-08-08', kg: 79 }
  ]);
});

test('si los dos anotaron peso el mismo día, gana el más reciente', () => {
  const viejo = { ts: 1, plan: planDe('2026-08-01'), pesos: [{ f: '2026-08-01', kg: 80 }] };
  const nuevo = { ts: 2, plan: planDe('2026-08-01'), pesos: [{ f: '2026-08-01', kg: 78 }] };

  assert.equal(fusionar(viejo, nuevo).pesos[0].kg, 78);
  assert.equal(fusionar(nuevo, viejo).pesos[0].kg, 78, 'el orden cambió el resultado');
});

// ─────────────────────────────────────────────────────────────
// Entrar por primera vez en un dispositivo nuevo
// ─────────────────────────────────────────────────────────────

test('un dispositivo recién estrenado NO borra lo que hay en el servidor', () => {
  // Este es el peor error posible: instalas la app en una tablet, entras con tu
  // cuenta, y al sincronizar tu tablet vacía le gana al servidor y borra todo.
  const servidor = {
    ts: 100,
    plan: planDe('2026-08-01'),
    prog: { ej: { '0-0': true }, dias: { 0: '2026-08-02' }, sesiones: ['2026-08-02'] },
    pesos: [{ f: '2026-08-02', kg: 77 }]
  };
  const tabletNueva = { ts: 999999, plan: null, prog: { ej: {}, dias: {}, sesiones: [] }, pesos: [] };

  const r = fusionar(servidor, tabletNueva);

  assert.ok(r.plan, 'la tablet vacía borró el plan del servidor');
  assert.deepEqual(r.prog.sesiones, ['2026-08-02']);
  assert.equal(r.pesos.length, 1);
});

test('cuenta nueva sin nada en ningún lado: no explota', () => {
  const r = fusionar(null, undefined);
  assert.equal(r.plan, null);
  assert.deepEqual(r.prog.sesiones, []);
  assert.deepEqual(r.pesos, []);
});

// ─────────────────────────────────────────────────────────────
// Las marcas de ejercicios son del plan, no de la persona
// ─────────────────────────────────────────────────────────────

test('mismo plan: las marcas de los dos dispositivos se juntan', () => {
  const a = { ts: 2, plan: planDe('2026-08-01'), prog: { ej: { '0-0': true }, dias: {}, sesiones: [] } };
  const b = { ts: 1, plan: planDe('2026-08-01'), prog: { ej: { '0-1': true }, dias: {}, sesiones: [] } };

  const r = fusionar(a, b);

  assert.equal(r.prog.ej['0-0'], true);
  assert.equal(r.prog.ej['0-1'], true);
});

test('plan distinto: las marcas viejas NO se arrastran al plan nuevo', () => {
  // Si se arrastraran, el plan nuevo aparecería con ejercicios ya marcados que
  // la persona nunca hizo, y la app le diría que va adelantada cuando no lo está.
  const planNuevo = { ts: 2, plan: planDe('2026-08-20'), prog: { ej: {}, dias: {}, sesiones: [] } };
  const planViejo = { ts: 1, plan: planDe('2026-08-01'), prog: { ej: { '0-0': true, '1-2': true }, dias: { 0: '2026-08-02' }, sesiones: [] } };

  const r = fusionar(planNuevo, planViejo);

  assert.deepEqual(r.prog.ej, {}, 'se arrastraron marcas de un plan viejo');
  assert.deepEqual(r.prog.dias, {});
});

test('plan distinto: la racha y los pesos SÍ sobreviven al cambio de plan', () => {
  // Cambiar de plan no borra que entrenaste ni cuánto pesabas.
  const planNuevo = { ts: 2, plan: planDe('2026-08-20'), prog: { ej: {}, dias: {}, sesiones: ['2026-08-20'] }, pesos: [] };
  const planViejo = { ts: 1, plan: planDe('2026-08-01'), prog: { ej: {}, dias: {}, sesiones: ['2026-08-02'] }, pesos: [{ f: '2026-08-02', kg: 80 }] };

  const r = fusionar(planNuevo, planViejo);

  assert.deepEqual(r.prog.sesiones, ['2026-08-02', '2026-08-20']);
  assert.equal(r.pesos.length, 1);
});

test('mismoPlan distingue planes de verdad', () => {
  assert.equal(mismoPlan(planDe('2026-08-01'), planDe('2026-08-01')), true);
  assert.equal(mismoPlan(planDe('2026-08-01'), planDe('2026-08-02')), false, 'fecha distinta');
  assert.equal(mismoPlan(planDe('2026-08-01', 'A'), planDe('2026-08-01', 'B')), false, 'título distinto');
  assert.equal(mismoPlan(planDe('2026-08-01', 'A', 3), planDe('2026-08-01', 'A', 5)), false, 'días distintos');
  assert.equal(mismoPlan(null, planDe('2026-08-01')), false);
});

// ─────────────────────────────────────────────────────────────
// Lo que llega del servidor viene por internet: no se confía
// ─────────────────────────────────────────────────────────────

test('basura del servidor no rompe la app ni se cuela a la pantalla', () => {
  const basura = {
    ts: 'muchísimo',
    plan: 'no soy un objeto',
    prog: { ej: ['esto debería ser objeto'], dias: null, sesiones: ['2026-08-01', 'ayer', 42, null] },
    pesos: [{ f: '2026-08-01', kg: 'pesado' }, { f: 'nunca', kg: 70 }, null, { f: '2026-08-02', kg: 70 }]
  };

  const r = normalizar(basura);

  assert.equal(r.ts, 0);
  assert.equal(r.plan, null);
  assert.deepEqual(r.prog.ej, {});
  assert.deepEqual(r.prog.dias, {});
  assert.deepEqual(r.prog.sesiones, ['2026-08-01'], 'se coló una fecha inventada');
  assert.deepEqual(r.pesos, [{ f: '2026-08-02', kg: 70 }], 'se coló un peso que no es número');
});

test('un peso de texto que parece número se guarda como número', () => {
  const r = normalizar({ pesos: [{ f: '2026-08-01', kg: '78.5' }] });
  assert.strictEqual(r.pesos[0].kg, 78.5);
});

// ─────────────────────────────────────────────────────────────
// No escribir en el servidor por nada
// ─────────────────────────────────────────────────────────────

test('no se sube nada si no hay nada que subir', () => {
  assert.equal(hayAlgoQueGuardar(null), false);
  assert.equal(hayAlgoQueGuardar({ prog: { ej: {}, dias: {}, sesiones: [] }, pesos: [] }), false);
  assert.equal(hayAlgoQueGuardar({ plan: planDe('2026-08-01').plan ? planDe('2026-08-01') : null }), true);
  assert.equal(hayAlgoQueGuardar({ pesos: [{ f: '2026-08-01', kg: 70 }] }), true);
  assert.equal(hayAlgoQueGuardar({ prog: { sesiones: ['2026-08-01'] } }), true);
});

// ─────────────────────────────────────────────────────────────
// Da igual quién llame primero
// ─────────────────────────────────────────────────────────────

test('fusionar(a,b) y fusionar(b,a) dan lo mismo', () => {
  const a = {
    ts: 500,
    plan: planDe('2026-08-01'),
    prog: { ej: { '0-0': true }, dias: { 0: '2026-08-02' }, sesiones: ['2026-08-02'] },
    pesos: [{ f: '2026-08-02', kg: 80 }]
  };
  const b = {
    ts: 300,
    plan: planDe('2026-08-01'),
    prog: { ej: { '0-1': true }, dias: {}, sesiones: ['2026-08-04'] },
    pesos: [{ f: '2026-08-04', kg: 79 }]
  };

  assert.deepEqual(fusionar(a, b), fusionar(b, a));
});
