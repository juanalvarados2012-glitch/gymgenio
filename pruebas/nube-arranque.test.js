// ☁️ PRUEBAS DE ARRANQUE DE LA NUBE
//
// nube.test.js prueba la lógica de fusionar por separado. Esta prueba es otra
// cosa: carga el módulo DE VERDAD de app.html dentro de un navegador de mentira
// y comprueba que el pegamento está bien puesto — que al entrar con cuenta se
// baja lo que hay en el servidor, que lo del teléfono se sube, y que si la
// tabla todavía no existe la app no se rompe.
//
// El navegador falso usa un Proxy: cualquier función del DOM que app.html use
// en el futuro se responde sola sin romper esta prueba. Una prueba que falla
// por razones equivocadas es una prueba que se acaba ignorando.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as nubeReal from '../nube.js';
import * as tecnicaReal from '../tecnica.js';
import * as videoReal from '../video.js';

// Los módulos locales que app.html importa. Si mañana se agrega otro, se añade
// aquí y ya: el reemplazo de abajo es genérico y no hay que tocarlo.
const MODULOS = { './nube.js': nubeReal, './tecnica.js': tecnicaReal, './video.js': videoReal };

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(RAIZ, 'app.html'), 'utf8');
const bloque = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(bloque, 'no se encontró el <script type="module"> de app.html');

// Los imports del navegador se cambian por cosas que existen aquí.
const importadosLocales = [];
const CODIGO = bloque[1]
  .replace(/import\s*\{[^}]*\}\s*from\s*'https:\/\/esm\.sh[^']*';?/, 'const createClient = () => __sb;')
  .replace(/import\s*\{([^}]*)\}\s*from\s*'(\.\/[^']+)';?/g, (_, nombres, ruta) => {
    assert.ok(MODULOS[ruta], 'app.html importa ' + ruta + ' y esta prueba no lo conoce: agrégalo a MODULOS');
    importadosLocales.push(ruta);
    return `const {${nombres}} = __mods[${JSON.stringify(ruta)}];`;
  });

test('🔒 el service worker guarda TODOS los módulos que app.html importa', () => {
  // Si falta uno, alguien sin señal abre la app, el import falla, y NO se
  // ejecuta nada del resto: pantalla en blanco. Es peor que no tener la función.
  // Este fallo no se ve nunca en el escritorio, solo en un móvil sin datos.
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const lista = sw.slice(sw.indexOf('const BASICS'), sw.indexOf(']', sw.indexOf('const BASICS')));
  for (const ruta of importadosLocales) {
    const archivo = ruta.replace('./', '/');
    assert.ok(lista.includes("'" + archivo + "'"),
      'app.html importa ' + ruta + ' pero sw.js no lo guarda: sin señal la app se queda en blanco');
  }
});

test('la prueba conoce todos los módulos que app.html importa', () => {
  // Si alguien agrega un import a app.html y olvida enseñárselo a esta prueba,
  // el resto de las pruebas fallaría con un error confuso. Mejor decirlo claro.
  assert.ok(importadosLocales.length > 0, 'no se detectó ningún import local en app.html');
  assert.equal(/(^|\n)\s*import\s/.test(CODIGO), false, 'quedó un import sin reemplazar');
});

const USUARIO = 'usuario-de-prueba-0001';
const CLAVE = k => k + ':account:' + USUARIO;

/* Un elemento del DOM que responde a lo que sea sin quejarse. */
function elemento(){
  const base = {
    value:'', textContent:'', innerHTML:'', placeholder:'', href:'', disabled:false, checked:false,
    dataset:{}, style:{}, files:[], parentElement:null, id:'',
    classList:{ add(){}, remove(){}, toggle(){ return false; }, contains(){ return false; } },
    querySelector: () => elemento(),
    querySelectorAll: () => [],
    getContext: () => new Proxy({}, { get: () => () => {} }),
    getAttribute: () => null,
  };
  return new Proxy(base, {
    get(obj, prop){
      if (prop in obj) return obj[prop];
      if (typeof prop === 'symbol') return undefined;
      return () => {};              // cualquier método nuevo: no hace nada
    },
    set(obj, prop, v){ obj[prop] = v; return true; }
  });
}

/* Arranca app.html con un servidor y un almacenamiento dados.
 * Devuelve qué quedó en el teléfono y qué se subió al servidor. */
async function arrancar({ filaServidor = null, local = {}, tablaExiste = true, idioma = 'es-EC' } = {}) {
  const almacen = new Map(Object.entries(local));
  const subidas = [];
  let fila = filaServidor;

  const consulta = () => ({
    select(){ return this; },
    eq(){ return this; },
    async maybeSingle(){
      if (!tablaExiste) return { data:null, error:{ message:'relation "public.planes" does not exist' } };
      return { data: fila ? { datos: fila } : null, error: null };
    },
    async upsert(f){
      if (!tablaExiste) return { error:{ message:'no existe' } };
      subidas.push(f); fila = f.datos; return { error: null };
    }
  });

  const sb = {
    auth: {
      getSession: async () => ({ data:{ session:{ access_token:'tok', user:{ id: USUARIO, email:'juan@ejemplo.com' } } } }),
      onAuthStateChange(){}, signOut: async () => {}
    },
    from(tabla){
      assert.equal(tabla, 'planes', 'la app pidió una tabla que no es planes');
      return consulta();
    }
  };

  const ctx = {
    console:{ log(){}, warn(){}, error(){} },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Date, Math, JSON, URL, URLSearchParams, Set, Map, Promise, Error,
    Number, String, Array, Object, Boolean, isNaN, parseInt, parseFloat,
    encodeURIComponent, decodeURIComponent, TextEncoder,
    localStorage:{
      getItem: k => almacen.has(k) ? almacen.get(k) : null,
      setItem: (k,v) => almacen.set(k, String(v)),
      removeItem: k => almacen.delete(k)
    },
    document: new Proxy({
      documentElement: elemento(), body: elemento(), title:'GymGenio',
      getElementById: () => elemento(),
      querySelector: () => elemento(),
      querySelectorAll: () => [],
      createElement: () => elemento()
    }, { get:(o,p) => p in o ? o[p] : () => {} }),
    navigator:{ language: idioma, languages:[idioma], serviceWorker:{ register: async () => {} } },
    location:{ search:'', hash:'', pathname:'/app.html', href:'https://gymgenio.vercel.app/app.html', reload(){} },
    history:{ replaceState(){} },
    fetch: async u => {
      const d = String(u);
      if (d.includes('/api/config')) return { ok:true, json: async () => ({ url:'https://x.supabase.co', key:'anon' }) };
      if (d.includes('/api/estado')) return { ok:true, json: async () => ({ email:'juan@ejemplo.com', pro:false }) };
      if (d.includes('/api/comida')) return { ok:true, json: async () => ({ hoy:null }) };
      return { ok:false, json: async () => ({}) };
    },
    addEventListener(){},
    matchMedia: () => ({ matches:false, addEventListener(){} }),
    AudioContext: function(){ return new Proxy({ currentTime:0, destination:{} }, { get:(o,p) => p in o ? o[p] : () => new Proxy({}, { get:() => () => {} }) }); },
    __sb: sb, __mods: MODULOS
  };
  // La puerta de pruebas: app.html nos pasa sus funciones internas.
  let interno = null;
  ctx.__ggTest = api => { interno = api; };

  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);

  await vm.runInContext(`(async () => { ${CODIGO} })()`, ctx, { timeout: 20000 });

  const leer = k => almacen.has(k) ? JSON.parse(almacen.get(k)) : null;
  return {
    almacen, subidas, interno,
    plan: leer(CLAVE('gg_plan')),
    prog: leer(CLAVE('gg_prog')),
    pesos: leer(CLAVE('gg_peso')),
    idiomaElegido: almacen.get('gg_lang') || null,
    ultimaSubida: subidas.length ? subidas[subidas.length - 1].datos : null
  };
}

const PLAN_NUBE = {
  plan:{ titulo:'Plan de la nube', dias:[{ejercicios:[]},{ejercicios:[]},{ejercicios:[]}] },
  esPro:false, datos:{ objetivo:'bajar' }, creado:'2026-08-01'
};

// ─────────────────────────────────────────────────────────────

test('🌐 la app abre en español si el navegador está en español', async () => {
  const r = await arrancar({ idioma:'es-EC' });
  assert.equal(r.idiomaElegido, 'es');
});

test('🌐 y en inglés si el navegador está en inglés', async () => {
  const r = await arrancar({ idioma:'en-US' });
  assert.equal(r.idiomaElegido, 'en');
});

test('🌐 la elección de la persona manda sobre el navegador', async () => {
  const r = await arrancar({ idioma:'es-EC', local:{ gg_lang:'en' } });
  assert.equal(r.idiomaElegido, 'en', 'el navegador pisó lo que la persona eligió');
});

test('☁️ teléfono nuevo: el progreso de la cuenta baja del servidor', async () => {
  // Este es EL caso: te cambias de teléfono y no pierdes tu ruta.
  const r = await arrancar({
    filaServidor:{
      v:1, ts:5000, plan:PLAN_NUBE, meta:null, metaNo:false,
      prog:{ ej:{ '0-0':true }, dias:{}, sesiones:['2026-08-02','2026-08-04'] },
      pesos:[{ f:'2026-08-02', kg:80 }]
    }
  });

  assert.ok(r.plan, 'no bajó el plan');
  assert.equal(r.plan.plan.titulo, 'Plan de la nube');
  assert.deepEqual(r.prog.sesiones, ['2026-08-02','2026-08-04']);
  assert.equal(r.pesos.length, 1, 'no bajó el historial de peso');
});

test('☁️ lo que hizo este teléfono sube, sin borrar lo de la cuenta', async () => {
  const r = await arrancar({
    filaServidor:{
      v:1, ts:1000, plan:PLAN_NUBE, meta:null, metaNo:false,
      prog:{ ej:{}, dias:{}, sesiones:['2026-08-02'] }, pesos:[]
    },
    local:{
      [CLAVE('gg_plan')]: JSON.stringify(PLAN_NUBE),
      [CLAVE('gg_prog')]: JSON.stringify({ ej:{}, dias:{}, sesiones:['2026-08-09'] }),
      [CLAVE('gg_ts')]: '9000'
    }
  });

  assert.ok(r.ultimaSubida, 'no se subió nada al servidor');
  assert.ok(r.ultimaSubida.prog.sesiones.includes('2026-08-09'), 'no subió el entreno nuevo');
  assert.ok(r.ultimaSubida.prog.sesiones.includes('2026-08-02'), 'borró el entreno que ya estaba en la cuenta');
});

test('☁️ sin nada en ningún lado no se ensucia el servidor', async () => {
  const r = await arrancar({});
  assert.equal(r.subidas.length, 0);
});

test('☁️ marcar algo DESPUÉS de abrir la app también sube', async () => {
  // Lo de arriba prueba el arranque. Esto prueba el resto del día: la persona
  // marca un ejercicio a las 7 de la tarde y eso tiene que llegar a su cuenta.
  // Sin esta prueba, cortar el aviso dentro de guardar() no lo notaba nadie.
  const r = await arrancar({
    filaServidor:{
      v:1, ts:1000, plan:PLAN_NUBE, meta:null, metaNo:false,
      prog:{ ej:{}, dias:{}, sesiones:[] }, pesos:[]
    }
  });
  assert.ok(r.interno, 'app.html no abrió la puerta de pruebas');

  const antes = r.subidas.length;
  r.interno.guardar(r.interno.K_PESO, [{ f:'2026-08-17', kg:76 }]);

  // La subida espera un momento a propósito, para no mandar 20 veces seguidas
  // mientras alguien marca ejercicios rápido.
  await new Promise(res => setTimeout(res, 1800));

  assert.ok(r.subidas.length > antes, 'el cambio nunca subió a la cuenta');
  const ultimo = r.subidas[r.subidas.length - 1].datos;
  assert.equal(ultimo.pesos[0].kg, 76);
});

test('🔒 si la tabla todavía no existe, la app arranca igual y no pierde nada', async () => {
  // Mientras papá no corra el SQL de SETUP-NUBE-PAPA.md, todo debe seguir
  // funcionando exactamente como antes. Esto no es opcional.
  const local = { [CLAVE('gg_plan')]: JSON.stringify(PLAN_NUBE) };
  const r = await arrancar({ tablaExiste:false, local });

  assert.ok(r.plan, 'se perdió el plan del teléfono al fallar el servidor');
  assert.equal(r.plan.plan.titulo, 'Plan de la nube');
  assert.equal(r.subidas.length, 0);
});
