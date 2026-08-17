// 🎥 PRUEBAS DE LAS DECISIONES DEL VIDEO
//
// Qué cuidan: la factura y la calidad del consejo.
//
// Si `medidas` deja de achicar, cada revisión pasa de costar ~2 centavos a
// costar bastante más, y nadie se entera hasta que llega el recibo — la app se
// ve exactamente igual. Si `momentos` toma mal los cuadros, se ve media
// repetición y el genio da un consejo equivocado sobre un movimiento que no vio
// entero.
//
// Cada prueba se comprobó rompiendo video.js a propósito.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { momentos, medidas, CUADROS, LADO_MAX } from '../video.js';

// ─────────────────────────────────────────────────────────────
// Qué momentos del video se miran
// ─────────────────────────────────────────────────────────────

test('de un video de 10 s salen 6 momentos, en orden y dentro del video', () => {
  const m = momentos(10);
  assert.equal(m.length, CUADROS);
  for (let i = 1; i < m.length; i++) assert.ok(m[i] > m[i - 1], 'los momentos no van en orden');
  assert.ok(m[0] >= 0, 'un momento antes de que empiece el video');
  assert.ok(m[m.length - 1] < 10, 'un momento después de que acabe el video');
});

test('no se toman todos del principio ni todos del final', () => {
  // Seis fotos del mismo instante no enseñan un movimiento.
  const m = momentos(10);
  const recorrido = m[m.length - 1] - m[0];
  assert.ok(recorrido > 10 * 0.5, 'los cuadros están amontonados: solo cubren ' + recorrido.toFixed(1) + ' s');
});

test('se deja fuera el principio y el final del video', () => {
  // Al principio la persona se está colocando; al final ya va a parar de grabar.
  const m = momentos(10);
  assert.ok(m[0] > 0.2, 'el primer cuadro sale demasiado al principio');
  assert.ok(m[m.length - 1] < 9.8, 'el último cuadro sale demasiado al final');
});

test('un video muy corto no se queda sin cuadros', () => {
  const m = momentos(1.5);
  assert.equal(m.length, CUADROS);
  m.forEach(t => assert.ok(t >= 0 && t < 1.5, 'cuadro fuera del video: ' + t));
});

test('nunca se pide el último fotograma exacto', () => {
  // Varios navegadores no entregan el fotograma final y la foto sale en negro.
  const m = momentos(4);
  assert.ok(m[m.length - 1] <= 4 - 0.05);
});

test('una duración imposible no rompe nada', () => {
  assert.deepEqual(momentos(0), []);
  assert.deepEqual(momentos(-3), []);
  assert.deepEqual(momentos(NaN), []);
  assert.deepEqual(momentos(undefined), []);
});

test('no se piden más de 12 cuadros aunque se pidan 500', () => {
  assert.ok(momentos(10, 500).length <= 12, 'sin tope, una llamada podría costar muchísimo');
});

// ─────────────────────────────────────────────────────────────
// A qué tamaño se manda cada foto (esto es la factura)
// ─────────────────────────────────────────────────────────────

test('🔒 un video grande SIEMPRE se achica antes de mandarlo', () => {
  // Si esto deja de pasar, la revisión cuesta varias veces más y la app se ve
  // igual: el único aviso llega en el recibo.
  for (const [a, h] of [[1920, 1080], [1080, 1920], [4032, 3024], [2560, 1440]]) {
    const m = medidas(a, h);
    assert.ok(Math.max(m.ancho, m.alto) <= LADO_MAX,
      `${a}x${h} salió a ${m.ancho}x${m.alto}: no se achicó`);
  }
});

test('achicar no deforma la imagen', () => {
  const m = medidas(1920, 1080);
  const antes = 1920 / 1080;
  const ahora = m.ancho / m.alto;
  assert.ok(Math.abs(antes - ahora) < 0.02, 'la foto salió estirada: ' + antes + ' vs ' + ahora);
});

test('un video vertical también se achica por su lado largo', () => {
  const m = medidas(720, 1280);
  assert.equal(m.alto, LADO_MAX);
  assert.ok(m.ancho < m.alto);
});

test('un video que ya es pequeño no se agranda', () => {
  // Agrandarlo no añade ni un detalle y sí añade peso.
  assert.deepEqual(medidas(320, 240), { ancho: 320, alto: 240 });
  assert.deepEqual(medidas(768, 432), { ancho: 768, alto: 432 });
});

test('medidas imposibles devuelven null en vez de romper el dibujo', () => {
  assert.equal(medidas(0, 100), null);
  assert.equal(medidas(100, 0), null);
  assert.equal(medidas(NaN, 100), null);
  assert.equal(medidas(undefined, undefined), null);
});
