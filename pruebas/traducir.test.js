// 🌐 PRUEBAS DE LA TRADUCCIÓN DEL PLAN
//
// Qué cuidan: que traducir NO le cambie el entrenamiento a nadie.
//
// El progreso se guarda por posición ("día 2, ejercicio 3"). Si la traducción
// se salta un ejercicio, todas las marcas de esa persona pasan a señalar el
// ejercicio equivocado — y la app se ve perfecta mientras lo hace. Y si el
// modelo "redondea" un 3x12 a un 3x10 de paso, le cambió el entrenamiento a
// alguien sin decírselo.
//
// Las dos cosas son silenciosas. Por eso están probadas.
//
// Cada prueba se comprobó rompiendo api/traducir.js a propósito.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import traducir, { mismaForma, mismosNumeros, numerosDe, planRecortado } from '../api/traducir.js';
import { fingirInternet } from './ayuda.js';

/* Un plan de mentira con la forma que usa la app. */
function plan(dias) {
  return {
    titulo: 'Tu plan',
    resumen: 'Un resumen',
    dias: dias.map((ejercicios, i) => ({
      nombre: 'Día ' + (i + 1),
      duracion: '30 min',
      ejercicios
    })),
    ruta: [], comidas: [], consejos: [], nota: ''
  };
}
const ej = (nombre, series) => ({ nombre, series, nota: '' });

// ─────────────────────────────────────────────────────────────
describe('la forma del plan se respeta', () => {

  test('un plan traducido bien tiene la misma forma', () => {
    const es = plan([[ej('Sentadilla', '3 x 12'), ej('Plancha', '3 x 30 s')]]);
    const en = plan([[ej('Squat', '3 x 12'), ej('Plank', '3 x 30 s')]]);
    assert.equal(mismaForma(es, en), true);
  });

  test('🔒 si la traducción PIERDE un ejercicio, se rechaza', () => {
    // Este es el fallo que corrompe el progreso: el ✓ del ejercicio 2 pasaría
    // a señalar al 3, y nadie se enteraría.
    const es = plan([[ej('Sentadilla', '3 x 12'), ej('Plancha', '3 x 30 s'), ej('Zancada', '3 x 10')]]);
    const en = plan([[ej('Squat', '3 x 12'), ej('Plank', '3 x 30 s')]]);
    assert.equal(mismaForma(es, en), false);
  });

  test('🔒 si la traducción AÑADE un ejercicio, se rechaza', () => {
    const es = plan([[ej('Sentadilla', '3 x 12')]]);
    const en = plan([[ej('Squat', '3 x 12'), ej('Push up', '3 x 10')]]);
    assert.equal(mismaForma(es, en), false);
  });

  test('🔒 si la traducción pierde un DÍA entero, se rechaza', () => {
    const es = plan([[ej('Sentadilla', '3 x 12')], [ej('Remo', '3 x 10')]]);
    const en = plan([[ej('Squat', '3 x 12')]]);
    assert.equal(mismaForma(es, en), false);
  });

  test('🔒 si la traducción AÑADE un día entero, se rechaza', () => {
    // El caso al revés, y el más fácil de dejarse: recorrer solo los días del
    // original y dar por bueno un plan traducido que trae uno de más.
    const es = plan([[ej('Sentadilla', '3 x 12')]]);
    const en = plan([[ej('Squat', '3 x 12')], [ej('Row', '3 x 10')]]);
    assert.equal(mismaForma(es, en), false);
  });

  test('un plan vacío o roto nunca pasa por bueno', () => {
    assert.equal(mismaForma(null, plan([[ej('a', '1')]])), false);
    assert.equal(mismaForma(plan([[ej('a', '1')]]), null), false);
    assert.equal(mismaForma({ dias: [] }, { dias: [] }), false);
    assert.equal(mismaForma({}, {}), false);
    assert.equal(mismaForma({ dias: 'no es lista' }, { dias: 'no es lista' }), false);
  });
});

// ─────────────────────────────────────────────────────────────
describe('las series y repeticiones no cambian', () => {

  test('los números de un texto salen en orden', () => {
    assert.deepEqual(numerosDe('3 x 12'), ['3', '12']);
    assert.deepEqual(numerosDe('3 series de 12 repeticiones'), ['3', '12']);
    assert.deepEqual(numerosDe('3 x 30 s'), ['3', '30']);
    assert.deepEqual(numerosDe('Al fallo'), []);
    assert.deepEqual(numerosDe(null), []);
    assert.deepEqual(numerosDe(2.5), ['2.5']);
  });

  test('traducir las palabras sin tocar los números está bien', () => {
    const es = plan([[ej('Sentadilla', '3 series de 12')]]);
    const en = plan([[ej('Squat', '3 sets of 12')]]);
    assert.equal(mismosNumeros(es, en), true);
  });

  test('🔒 si el modelo "redondea" un 3x12 a un 3x10, se rechaza', () => {
    // Traducir no es rediseñar. Este cambio es invisible en pantalla: la
    // persona entrenaría menos de lo que su plan decía y nunca lo sabría.
    const es = plan([[ej('Sentadilla', '3 x 12')]]);
    const en = plan([[ej('Squat', '3 x 10')]]);
    assert.equal(mismosNumeros(es, en), false);
  });

  test('🔒 si el modelo añade un número que no estaba, se rechaza', () => {
    const es = plan([[ej('Plancha', 'Al fallo')]]);
    const en = plan([[ej('Plank', '3 x 30 s')]]);
    assert.equal(mismosNumeros(es, en), false);
  });

  test('🔒 si el modelo se come un número, se rechaza', () => {
    const es = plan([[ej('Plancha', '3 x 30 s')]]);
    const en = plan([[ej('Plank', 'To failure')]]);
    assert.equal(mismosNumeros(es, en), false);
  });

  test('los números tienen que estar en el mismo orden', () => {
    // "3 x 12" y "12 x 3" son entrenamientos muy distintos.
    const es = plan([[ej('Sentadilla', '3 x 12')]]);
    const en = plan([[ej('Squat', '12 x 3')]]);
    assert.equal(mismosNumeros(es, en), false);
  });

  test('un cambio en el día 2 también se detecta, no solo en el primero', () => {
    const es = plan([[ej('Sentadilla', '3 x 12')], [ej('Remo', '4 x 10')]]);
    const en = plan([[ej('Squat', '3 x 12')], [ej('Row', '4 x 8')]]);
    assert.equal(mismosNumeros(es, en), false);
  });

  test('si la forma ya no calza, los números ni se miran', () => {
    const es = plan([[ej('Sentadilla', '3 x 12')]]);
    const en = plan([[ej('Squat', '3 x 12'), ej('Extra', '3 x 12')]]);
    assert.equal(mismosNumeros(es, en), false);
  });
});

// ─────────────────────────────────────────────────────────────
describe('lo que manda el teléfono no se cree a ciegas', () => {

  test('🔒 un plan gigante se recorta antes de mandarlo a la IA', () => {
    // El plan viene del teléfono: alguien podría mandar uno enorme y hacernos
    // pagar una factura enorme de IA.
    const muchos = Array.from({ length: 60 }, (_, i) => ej('Ejercicio ' + i, '3 x 12'));
    const enorme = plan(Array.from({ length: 40 }, () => muchos));
    const corto = planRecortado(enorme);
    assert.ok(corto.dias.length <= 14, 'no se recortaron los días: ' + corto.dias.length);
    corto.dias.forEach(d =>
      assert.ok(d.ejercicios.length <= 20, 'no se recortaron los ejercicios: ' + d.ejercicios.length));
  });

  test('🔒 un texto larguísimo dentro del plan se corta', () => {
    const bomba = plan([[ej('x'.repeat(5000), '3 x 12')]]);
    const corto = planRecortado(bomba);
    assert.ok(corto.dias[0].ejercicios[0].nombre.length <= 120);
  });

  test('basura en vez de un plan devuelve null, no revienta', () => {
    assert.equal(planRecortado(null), null);
    assert.equal(planRecortado('un plan'), null);
    assert.equal(planRecortado({}), null);
    assert.equal(planRecortado({ dias: [] }), null);
    assert.equal(planRecortado({ dias: [{ nombre: 'Día 1' }] }), null, 'un día sin ejercicios no es un plan');
  });

  test('un plan normal sobrevive al recorte tal cual', () => {
    const bueno = plan([[ej('Sentadilla', '3 x 12'), ej('Plancha', '3 x 30 s')]]);
    const corto = planRecortado(bueno);
    assert.equal(corto.dias.length, 1);
    assert.equal(corto.dias[0].ejercicios.length, 2);
    assert.equal(corto.dias[0].ejercicios[0].nombre, 'Sentadilla');
    assert.equal(corto.dias[0].ejercicios[0].series, '3 x 12');
  });
});

// ─────────────────────────────────────────────────────────────
// La puerta entera, con un genio de mentira
// ─────────────────────────────────────────────────────────────
//
// Las pruebas de arriba comprueban las piezas. Estas comprueban que la puerta
// las USA: se puede tener la mejor cerradura del mundo y dejarla sin poner.

describe('la puerta /api/traducir', () => {

  /* Un pedido como el que manda la app. */
  function pedido(planEnviado) {
    return { method: 'POST', headers: {}, body: { plan: planEnviado, idioma: 'en' } };
  }

  /* Una respuesta de Anthropic como las de verdad. */
  function genioDice(planDevuelto) {
    return [['api.anthropic.com', { cuerpo: { content: [{ type: 'text', text: JSON.stringify(planDevuelto) }] } }]];
  }

  /* Un `res` de mentira que apunta con qué contestó la puerta. */
  function respuesta() {
    const r = { codigo: 0, cuerpo: null, cabeceras: {} };
    r.status = c => { r.codigo = c; return r; };
    r.json = c => { r.cuerpo = c; return r; };
    r.setHeader = (k, v) => { r.cabeceras[k] = v; };
    return r;
  }

  const original = plan([[ej('Sentadilla', '3 x 12'), ej('Plancha', '3 x 30 s')]]);

  test('una traducción buena se devuelve traducida', async () => {
    process.env.ANTHROPIC_API_KEY = 'llave_de_mentira';
    const net = fingirInternet(genioDice(plan([[ej('Squat', '3 x 12'), ej('Plank', '3 x 30 s')]])));
    const res = respuesta();
    try { await traducir(pedido(original), res); } finally { net.restaurar(); }

    assert.equal(res.codigo, 200);
    assert.equal(res.cuerpo.plan.dias[0].ejercicios[0].nombre, 'Squat');
    assert.equal(res.cuerpo.plan.dias[0].ejercicios[0].series, '3 x 12');
  });

  test('🔒 una traducción que se come un ejercicio NO llega a la persona', async () => {
    // Esta es la prueba que de verdad protege el progreso: aunque el modelo se
    // equivoque, la puerta tiene que negarse a devolverlo.
    process.env.ANTHROPIC_API_KEY = 'llave_de_mentira';
    const net = fingirInternet(genioDice(plan([[ej('Squat', '3 x 12')]])));
    const res = respuesta();
    try { await traducir(pedido(original), res); } finally { net.restaurar(); }

    assert.equal(res.codigo, 422, 'se devolvió un plan con distinta forma');
    assert.ok(!res.cuerpo.plan, 'no debería venir ningún plan');
  });

  test('🔒 una traducción que cambia las repeticiones NO llega a la persona', async () => {
    process.env.ANTHROPIC_API_KEY = 'llave_de_mentira';
    const net = fingirInternet(genioDice(plan([[ej('Squat', '3 x 10'), ej('Plank', '3 x 30 s')]])));
    const res = respuesta();
    try { await traducir(pedido(original), res); } finally { net.restaurar(); }

    assert.equal(res.codigo, 422, 'se le cambió el entrenamiento a la persona');
  });

  test('si el genio contesta basura, se dice y no se rompe nada', async () => {
    process.env.ANTHROPIC_API_KEY = 'llave_de_mentira';
    const net = fingirInternet([['api.anthropic.com', { cuerpo: { content: [{ type: 'text', text: 'Claro, aquí tienes:' }] } }]]);
    const res = respuesta();
    try { await traducir(pedido(original), res); } finally { net.restaurar(); }

    assert.equal(res.codigo, 422);
    assert.ok(res.cuerpo.error, 'tiene que explicar qué pasó');
  });

  test('🔒 sin plan no se llama a la IA (una llamada de balde cuesta dinero)', async () => {
    process.env.ANTHROPIC_API_KEY = 'llave_de_mentira';
    const net = fingirInternet(genioDice(original));
    const res = respuesta();
    try {
      await traducir({ method: 'POST', headers: {}, body: { idioma: 'en' } }, res);
    } finally { net.restaurar(); }

    assert.equal(res.codigo, 400);
    assert.equal(net.seLlamoA('anthropic'), false, 'se gastó una llamada de IA sin plan que traducir');
  });

  test('🔒 una web ajena no puede gastar nuestra cuenta de IA', async () => {
    process.env.ANTHROPIC_API_KEY = 'llave_de_mentira';
    const net = fingirInternet(genioDice(original));
    const res = respuesta();
    const deOtraWeb = { method: 'POST', headers: { origin: 'https://sitio-ajeno.com', host: 'gymgenio.vercel.app' }, body: { plan: original, idioma: 'en' } };
    try { await traducir(deOtraWeb, res); } finally { net.restaurar(); }

    assert.equal(res.codigo, 403);
    assert.equal(net.seLlamoA('anthropic'), false, 'una web ajena logró gastar nuestra cuenta');
  });
});
