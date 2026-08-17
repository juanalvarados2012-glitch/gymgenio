/* 🎥 DECISIONES DEL VIDEO
 *
 * Del video que graba la persona solo salen 6 fotos. Estas dos funciones deciden
 * CUÁLES y DE QUÉ TAMAÑO, y las dos cosas mandan directamente sobre lo que
 * cuesta cada revisión:
 *
 *   - Cuántas fotos y de dónde: si se toman todas del final, se ve media
 *     repetición y el consejo sale mal.
 *   - A qué tamaño: una foto a tamaño completo puede gastar 6 veces más que una
 *     achicada, sin que se vea mejor la rodilla. Achicar en el teléfono ANTES de
 *     mandar es lo que mantiene la revisión en menos de dos centavos.
 *
 * Están aquí, separadas del navegador, para poder probarlas de verdad en
 * pruebas/video.test.js.
 */

export const CUADROS = 6;
export const LADO_MAX = 768;      // el lado largo, en píxeles
export const CALIDAD = 0.72;      // JPEG: por encima de esto solo pesa más

/* En qué segundos cortar el video.
 *
 * Se dejan fuera el principio y el final: en los primeros instantes la persona
 * todavía se está colocando y en los últimos ya está yendo a parar la grabación.
 * Lo que interesa está en medio. */
export function momentos(duracion, cuantos = CUADROS) {
  const d = Number(duracion);
  const n = Math.max(1, Math.min(Math.round(cuantos) || CUADROS, 12));
  if (!Number.isFinite(d) || d <= 0) return [];

  // Videos muy cortos: no hay margen que recortar, se reparte todo.
  const margen = d > 2 ? Math.min(0.6, d * 0.12) : 0;
  const ini = margen;
  const fin = Math.max(ini, d - margen);

  if (n === 1) return [Number(((ini + fin) / 2).toFixed(3))];

  const paso = (fin - ini) / (n - 1);
  const lista = [];
  for (let i = 0; i < n; i++) {
    // Nunca justo en el último fotograma: algunos navegadores no lo entregan.
    const t = Math.min(ini + paso * i, Math.max(0, d - 0.05));
    lista.push(Number(t.toFixed(3)));
  }
  return lista;
}

/* A qué tamaño guardar cada foto: el lado largo baja a `lado` como mucho, sin
 * deformar la imagen y sin agrandar un video que ya venía pequeño. */
export function medidas(ancho, alto, lado = LADO_MAX) {
  const a = Math.round(Number(ancho));
  const h = Math.round(Number(alto));
  if (!Number.isFinite(a) || !Number.isFinite(h) || a <= 0 || h <= 0) return null;

  const mayor = Math.max(a, h);
  if (mayor <= lado) return { ancho: a, alto: h };

  const factor = lado / mayor;
  return {
    ancho: Math.max(1, Math.round(a * factor)),
    alto: Math.max(1, Math.round(h * factor))
  };
}
