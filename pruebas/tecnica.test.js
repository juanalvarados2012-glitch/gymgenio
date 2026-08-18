// 🏋️ PRUEBAS DE LA BIBLIOTECA DE TÉCNICA
//
// Qué cuidan:
//  1. Que el ejercicio que el genio inventó ENCUENTRE su ficha. Si la búsqueda
//     falla, la app le pide al genio una ficha que ya teníamos escrita: paga
//     una llamada de IA por algo gratis, y encima tarda.
//  2. Que "plancha lateral" no caiga en la ficha de "plancha". Son ejercicios
//     distintos y decirle a alguien la técnica equivocada es peor que no decirle
//     nada.
//  3. Que ninguna ficha se salte el límite de salud: técnica, nunca diagnóstico.
//
// Cada prueba se comprobó rompiendo tecnica.js a propósito.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarFicha, normalizarNombre, fichaEnVoz, CUANTAS_FICHAS, DIBUJOS } from '../tecnica.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ─────────────────────────────────────────────────────────────
// Encontrar la ficha aunque el nombre venga de mil maneras
// ─────────────────────────────────────────────────────────────

test('el mismo ejercicio escrito de varias formas cae en la misma ficha', () => {
  const formas = ['Sentadilla', 'Sentadillas', 'sentadillas', 'SENTADILLAS', 'Sentadilla con peso corporal'];
  for (const f of formas) {
    const ficha = buscarFicha(f, 'es');
    assert.ok(ficha, 'no encontró: ' + f);
    assert.equal(ficha.nombre, 'Sentadilla', 'cayó en otra ficha: ' + f);
  }
});

test('los acentos no rompen la búsqueda', () => {
  assert.ok(buscarFicha('Flexión de brazos', 'es'), 'no encontró "Flexión"');
  assert.ok(buscarFicha('Elevación de talones', 'es'), 'no encontró "Elevación"');
  assert.equal(normalizarNombre('Flexión'), 'flexion');
});

test('en inglés también encuentra', () => {
  assert.equal(buscarFicha('Squats', 'en').nombre, 'Squat');
  assert.equal(buscarFicha('Push-ups', 'en').nombre, 'Push-ups');
  assert.equal(buscarFicha('Plank', 'en').nombre, 'Plank');
});

test('una variante encuentra su ejercicio base', () => {
  // El genio escribe cosas como "Sentadilla con salto" o "Zancadas alternas".
  assert.equal(buscarFicha('Sentadilla con salto', 'es').nombre, 'Sentadilla');
  assert.equal(buscarFicha('Zancadas alternas', 'es').nombre, 'Zancadas');
});

test('🔒 "plancha lateral" NO cae en la ficha de "plancha"', () => {
  // Son ejercicios distintos. Dar la técnica equivocada es peor que no dar nada.
  assert.equal(buscarFicha('Plancha lateral', 'es').nombre, 'Plancha lateral');
  assert.equal(buscarFicha('Plancha', 'es').nombre, 'Plancha');
  assert.equal(buscarFicha('Side plank', 'en').nombre, 'Side plank');
});

test('lo que no está en la biblioteca devuelve null, no una ficha al azar', () => {
  // Devolver null es lo correcto: la app se la pide al genio. Devolver una ficha
  // parecida sería explicarle a alguien un ejercicio que no está haciendo.
  assert.equal(buscarFicha('Nado sincronizado', 'es'), null);
  assert.equal(buscarFicha('', 'es'), null);
  assert.equal(buscarFicha(null, 'es'), null);
  assert.equal(buscarFicha('   ', 'es'), null);
});

// ─────────────────────────────────────────────────────────────
// Que las fichas estén completas y digan lo que deben decir
// ─────────────────────────────────────────────────────────────

test('todas las fichas están completas en los dos idiomas', () => {
  const nombres = ['Sentadilla', 'Flexiones', 'Plancha', 'Puente de glúteo', 'Zancadas',
                   'Remo', 'Press de hombro', 'Curl de bíceps', 'Abdominales', 'Escaladores',
                   'Saltos de tijera', 'Burpees', 'Peso muerto', 'Superman',
                   'Sentadilla búlgara', 'Fondos de tríceps', 'Plancha lateral',
                   'Elevaciones laterales', 'Elevación de talones', 'Bird dog',
                   'Dominadas', 'Giro ruso'];
  assert.equal(nombres.length, CUANTAS_FICHAS, 'la lista de la prueba no cubre todas las fichas');

  for (const n of nombres) {
    for (const idioma of ['es', 'en']) {
      const f = buscarFicha(n, idioma);
      assert.ok(f, 'sin ficha (' + idioma + '): ' + n);
      assert.ok(f.nombre, 'sin nombre: ' + n + ' / ' + idioma);
      assert.ok(f.pasos.length >= 3, 'pocos pasos: ' + n + ' / ' + idioma);
      assert.equal(f.errores.length, 3, 'deben ser exactamente 3 errores: ' + n + ' / ' + idioma);
      assert.ok(f.sientes, 'sin "dónde lo sientes": ' + n + ' / ' + idioma);
      assert.ok(f.facil, 'sin versión fácil: ' + n + ' / ' + idioma);
      // La línea de "en pocas palabras" va en los DOS idiomas. Si falta en uno,
      // ese idioma se ve a medias sin que nada dé error.
      assert.ok(f.resumen, 'sin "en pocas palabras": ' + n + ' / ' + idioma);
    }
  }
});

test('🔒 ninguna ficha diagnostica ni receta nada', () => {
  // El genio comenta técnica. Nunca dice qué lesión tienes ni cómo tratarla.
  // Si alguien mete una palabra de estas en una ficha nueva, esta prueba lo para.
  const prohibidas = /\b(lesion|lesión|lesionado|tendinitis|hernia|desgarro|esguince|artrosis|diagnos|receta|medicamento|antiinflamatorio|injury|injured|tendinitis|herniat|sprain|diagnos|prescri|medication|painkiller)\w*/i;
  const nombres = ['Sentadilla', 'Flexiones', 'Plancha', 'Puente de glúteo', 'Zancadas',
                   'Remo', 'Press de hombro', 'Curl de bíceps', 'Abdominales', 'Escaladores',
                   'Saltos de tijera', 'Burpees', 'Peso muerto', 'Superman',
                   'Sentadilla búlgara', 'Fondos de tríceps', 'Plancha lateral',
                   'Elevaciones laterales', 'Elevación de talones', 'Bird dog',
                   'Dominadas', 'Giro ruso'];

  for (const n of nombres) {
    for (const idioma of ['es', 'en']) {
      const f = buscarFicha(n, idioma);
      const todo = [f.nombre, f.sientes, f.facil, ...f.pasos, ...f.errores].join(' ');
      const m = todo.match(prohibidas);
      assert.equal(m, null, 'la ficha "' + n + '" (' + idioma + ') usa "' + (m && m[0]) + '"');
    }
  }
});

test('cada ficha dice dónde NO se debe sentir, no solo dónde sí', () => {
  // "Lo siento en la espalda baja" es la señal más útil de que algo va mal.
  // Al menos las fichas de riesgo de espalda tienen que avisar.
  for (const n of ['Sentadilla', 'Peso muerto', 'Plancha', 'Puente de glúteo']) {
    const f = buscarFicha(n, 'es');
    assert.match(f.sientes, /no |nunca /i, 'la ficha de ' + n + ' no dice dónde NO sentirlo');
  }
});

// ─────────────────────────────────────────────────────────────
// La voz
// ─────────────────────────────────────────────────────────────

test('el texto para la voz incluye pasos y errores, y no lleva etiquetas', () => {
  const f = buscarFicha('Sentadilla', 'es');
  const texto = fichaEnVoz(f, 'es');

  assert.ok(texto.includes(f.pasos[0]), 'no incluye el primer paso');
  assert.ok(texto.includes(f.errores[0]), 'no incluye el primer error');
  assert.ok(texto.includes('Errores comunes'), 'no anuncia los errores');
  assert.equal(/[<>]/.test(texto), false, 'se coló HTML en lo que se lee en voz alta');
});

test('el texto para la voz cambia de idioma', () => {
  assert.ok(fichaEnVoz(buscarFicha('Squat', 'en'), 'en').includes('Common mistakes'));
  assert.equal(fichaEnVoz(null, 'es'), '');
});

// ─────────────────────────────────────────────────────────────
// Los dibujos de los ejercicios
// ─────────────────────────────────────────────────────────────

test('🔒 dos ejercicios distintos nunca comparten el mismo dibujo', () => {
  // El nombre del archivo sale de la primera clave de la ficha. Si dos fichas
  // acabaran con el mismo nombre, a alguien se le enseñaría el dibujo de otro
  // ejercicio mientras lee la técnica del suyo — y todo se vería normal.
  const repetidas = DIBUJOS.filter((f, i) => DIBUJOS.indexOf(f) !== i);
  assert.deepEqual(repetidas, [], 'estos dibujos están repetidos: ' + repetidas.join(', '));
  assert.equal(DIBUJOS.length, CUANTAS_FICHAS);
});

test('los nombres de archivo de los dibujos son seguros para una URL', () => {
  // Van dentro de un src="dibujos/….svg". Un espacio o un acento ahí da un 404
  // silencioso: el dibujo simplemente no aparece y nadie sabe por qué.
  for (const f of DIBUJOS) {
    assert.match(f, /^[a-z0-9-]+$/, 'nombre de dibujo no válido: "' + f + '"');
  }
});

test('el mismo ejercicio en los dos idiomas pide el MISMO dibujo', () => {
  // Un dibujo por movimiento, no uno por idioma.
  for (const [es, en] of [['Sentadilla', 'Squat'], ['Flexiones', 'Push-ups'], ['Peso muerto', 'Deadlift']]) {
    assert.equal(buscarFicha(es, 'es').dibujo, buscarFicha(en, 'en').dibujo, es + ' / ' + en);
  }
});

test('🔒 todo dibujo que exista tiene que poder pintarse', () => {
  // Un SVG mal formado NO da ningún error: el navegador simplemente no pinta
  // nada y la app se ve como si el dibujo no existiera. Pasó de verdad —
  // repetir un atributo (dos `stroke-width` en la misma línea) dejó 6 dibujos
  // en blanco y no había ni un aviso en la consola. Por eso se revisan aquí.
  const dir = path.join(RAIZ, 'dibujos');
  const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
  assert.ok(archivos.length, 'no hay ningún dibujo que revisar');

  for (const archivo of archivos) {
    const svg = fs.readFileSync(path.join(dir, archivo), 'utf8');

    // 1. Las etiquetas abren y cierran.
    const abre = (svg.match(/<(?!\/)(?!!)[a-zA-Z]/g) || []).length;
    const cierra = (svg.match(/<\/[a-zA-Z]/g) || []).length + (svg.match(/\/>/g) || []).length;
    assert.equal(abre, cierra, archivo + ': hay etiquetas sin cerrar');

    // 2. Ningún atributo repetido dentro de una misma etiqueta.
    for (const etiqueta of svg.match(/<[a-zA-Z][^>]*>/g) || []) {
      const nombres = (etiqueta.match(/[a-zA-Z-]+\s*=/g) || []).map(a => a.replace(/\s*=$/, ''));
      const repes = nombres.filter((a, i) => nombres.indexOf(a) !== i);
      assert.deepEqual(repes, [], archivo + ': atributo repetido "' + repes[0] + '" (el dibujo no se pintaría)');
    }

    // 3. Lo mínimo para que la app lo pueda escalar.
    assert.match(svg, /<svg[^>]*viewBox=/, archivo + ': sin viewBox, la app no sabe escalarlo');
    assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, archivo + ': sin xmlns no se pinta como imagen');

    // 4. Sin texto: la app es bilingüe y una etiqueta en un idioma se vería
    //    en la ficha del otro.
    assert.equal(/<text[\s>]/.test(svg), false, archivo + ': lleva texto dentro, y no se puede traducir');
  }
});

test('🔒 la lista de dibujos del LEEME cuadra con la de verdad', () => {
  // dibujos/LEEME.md es lo que se mira para saber cómo nombrar cada archivo. Si
  // se queda vieja, se guarda un dibujo con el nombre equivocado y no aparece —
  // sin ningún error que lo explique.
  const leeme = fs.readFileSync(path.join(RAIZ, 'dibujos', 'LEEME.md'), 'utf8');
  const enElLeeme = (leeme.match(/`([a-z0-9-]+)\.svg`/g) || [])
    .map(s => s.replace(/[`]/g, '').replace('.svg', ''));

  for (const f of DIBUJOS) {
    assert.ok(enElLeeme.includes(f), 'falta "' + f + '.svg" en dibujos/LEEME.md');
  }
  for (const f of enElLeeme) {
    assert.ok(DIBUJOS.includes(f), 'dibujos/LEEME.md nombra "' + f + '.svg", que ya no existe');
  }
});
