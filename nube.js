/* ☁️ NUBE — fusionar lo que hay en el teléfono con lo que hay en el servidor.
 *
 * Por qué existe este archivo:
 * El plan, las marcas, la racha y los pesos vivían SOLO en el navegador. Alguien
 * que perdía el teléfono en la semana 6 de su ruta perdía las seis semanas. Se
 * vende un plan de 8 semanas; el guardado tiene que aguantar 8 semanas.
 *
 * La parte difícil no es subir los datos: es qué hacer cuando el teléfono y el
 * servidor NO dicen lo mismo. Pasa siempre — entrenas en el gimnasio con el
 * teléfono sin señal, y en la casa abres la tablet.
 *
 * La regla fácil sería "gana el último que escribió". Está mal: te borra
 * entrenos. Si el lunes marcas una sesión en la tablet y el martes marcas otra
 * en el teléfono (que traía datos viejos), el teléfono pisa a la tablet y el
 * lunes desaparece. Por eso aquí hay DOS reglas distintas:
 *
 *   - Lo que se REEMPLAZA (el plan, la meta): gana el más reciente. Solo puede
 *     haber un plan a la vez, así que elegir el más nuevo es lo correcto.
 *   - Lo que solo CRECE (sesiones hechas, pesos anotados): se juntan los dos.
 *     Un entreno que pasó, pasó. Ningún dispositivo tiene derecho a borrarlo.
 *
 * Este archivo no toca el navegador ni la red a propósito: son funciones puras
 * para poder probarlas de verdad en pruebas/nube.test.js.
 */

export const VERSION_NUBE = 1;

const esObj = v => v && typeof v === 'object' && !Array.isArray(v);
const esFecha = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/* Un check-in: lo que la persona contó al terminar una sesión.
 *   f        fecha       dia      número del día del plan
 *   esfuerzo 1 a 5       dificil  nombre del ejercicio que costó
 *   minutos  cuánto duró de verdad */
const esCheckin = v => esObj(v) && esFecha(v.f) && Number.isFinite(Number(v.dia));
function limpiarCheckin(c) {
  const entero = (v, min, max) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const salida = { f: c.f, dia: entero(c.dia, 0, 60) };
  const esf = entero(c.esfuerzo, 1, 5);
  if (esf !== null) salida.esfuerzo = esf;
  const min = entero(c.minutos, 1, 600);
  if (min !== null) salida.minutos = min;
  if (typeof c.dificil === 'string' && c.dificil.trim()) salida.dificil = c.dificil.trim().slice(0, 80);
  return salida;
}
const claveCheckin = c => c.f + '#' + c.dia;

/* Deja un paquete con la forma correcta, venga de donde venga.
 * Los datos del servidor llegan por internet: nunca se confía en su forma. */
export function normalizar(x) {
  const p = esObj(x) ? x : {};
  const prog = esObj(p.prog) ? p.prog : {};
  const ts = Number(p.ts);
  return {
    v: VERSION_NUBE,
    ts: Number.isFinite(ts) && ts > 0 ? ts : 0,
    plan: esObj(p.plan) ? p.plan : null,
    meta: esObj(p.meta) ? p.meta : null,
    metaNo: p.metaNo === true,
    prog: {
      ej: esObj(prog.ej) ? prog.ej : {},
      dias: esObj(prog.dias) ? prog.dias : {},
      sesiones: Array.isArray(prog.sesiones) ? prog.sesiones.filter(esFecha) : [],
      // Lo que la persona contó al terminar cada sesión. Es historia: solo crece.
      checkins: Array.isArray(prog.checkins) ? prog.checkins.filter(esCheckin).map(limpiarCheckin) : []
    },
    pesos: Array.isArray(p.pesos)
      ? p.pesos.filter(w => esObj(w) && esFecha(w.f) && Number.isFinite(Number(w.kg)))
               .map(w => ({ f: w.f, kg: Number(w.kg) }))
      : []
  };
}

/* ¿Los dos paquetes hablan del MISMO plan?
 *
 * Importa para las marcas de ejercicios: "día 2, ejercicio 3" solo significa lo
 * mismo si el plan es el mismo. Si el plan cambió, esas marcas son de otro plan
 * y juntarlas marcaría ejercicios que la persona nunca hizo. */
export function mismoPlan(a, b) {
  if (!a || !b) return false;
  if (a.creado !== b.creado) return false;
  const da = a.plan && Array.isArray(a.plan.dias) ? a.plan.dias : null;
  const db = b.plan && Array.isArray(b.plan.dias) ? b.plan.dias : null;
  if (!da || !db || da.length !== db.length) return false;
  const tit = x => (x.plan && typeof x.plan.titulo === 'string') ? x.plan.titulo : '';
  return tit(a) === tit(b);
}

/* Junta dos listas de fechas sin repetir y en orden. */
function unirFechas(a, b) {
  return [...new Set([...a, ...b])].sort();
}

/* Junta dos listas de pesos. Una fecha = un peso: si los dos anotaron algo el
 * mismo día, se queda el del paquete más reciente. */
function unirPesos(nuevo, viejo) {
  const porFecha = new Map();
  viejo.forEach(w => porFecha.set(w.f, w));
  nuevo.forEach(w => porFecha.set(w.f, w));   // el nuevo pisa al viejo, a propósito
  return [...porFecha.values()].sort((x, y) => x.f < y.f ? -1 : x.f > y.f ? 1 : 0);
}

/* Junta dos listas de check-ins. Uno por día del plan y fecha: si los dos
 * dispositivos guardaron algo del mismo día, se queda el del paquete más
 * reciente (la persona pudo corregir lo que puso). */
function unirCheckins(nuevo, viejo) {
  const porClave = new Map();
  viejo.forEach(c => porClave.set(claveCheckin(c), c));
  nuevo.forEach(c => porClave.set(claveCheckin(c), c));
  return [...porClave.values()].sort((a, b) =>
    a.f < b.f ? -1 : a.f > b.f ? 1 : a.dia - b.dia
  );
}

/* Junta las marcas de ejercicios/días de un MISMO plan.
 * Marcado gana sobre no marcado: si un dispositivo lo vio hecho, se hizo. */
function unirMarcas(a, b) {
  const r = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    r[k] = a[k] || b[k];
  }
  return r;
}

/* Fusiona dos paquetes. El orden en que se pasen no cambia el resultado. */
export function fusionar(uno, otro) {
  const a = normalizar(uno);
  const b = normalizar(otro);

  // Paquete vacío = nunca se guardó nada. No compite: gana el que sí tiene algo.
  const vacio = p => !p.plan && !p.meta && !p.pesos.length && !p.prog.sesiones.length && !p.prog.checkins.length;
  if (vacio(a)) return b;
  if (vacio(b)) return a;

  const nuevo = a.ts >= b.ts ? a : b;
  const viejo = nuevo === a ? b : a;

  // Las marcas solo se juntan si los dos hablan del mismo plan.
  const juntarMarcas = mismoPlan(nuevo.plan, viejo.plan);

  return {
    v: VERSION_NUBE,
    ts: Math.max(a.ts, b.ts),
    plan: nuevo.plan,
    meta: nuevo.meta,
    metaNo: nuevo.metaNo,
    prog: {
      ej:   juntarMarcas ? unirMarcas(nuevo.prog.ej, viejo.prog.ej)     : nuevo.prog.ej,
      dias: juntarMarcas ? unirMarcas(nuevo.prog.dias, viejo.prog.dias) : nuevo.prog.dias,
      // La racha NUNCA se pisa: un entreno que pasó, pasó, sea cual sea el plan.
      sesiones: unirFechas(nuevo.prog.sesiones, viejo.prog.sesiones),
      // Los check-ins tampoco: es lo que la persona contó, y es la materia prima
      // con la que el genio adapta el plan. Perderlos sería perder la memoria.
      checkins: unirCheckins(nuevo.prog.checkins, viejo.prog.checkins)
    },
    // El peso tampoco: es historia del cuerpo, no del plan.
    pesos: unirPesos(nuevo.pesos, viejo.pesos)
  };
}

/* ¿Vale la pena subir esto? Evita escribir en el servidor por nada. */
export function hayAlgoQueGuardar(p) {
  const n = normalizar(p);
  return !!(n.plan || n.meta || n.pesos.length || n.prog.sesiones.length || n.prog.checkins.length);
}
