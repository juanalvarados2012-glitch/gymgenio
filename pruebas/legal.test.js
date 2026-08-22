// ⚖️ PRUEBAS DE LO LEGAL
//
// Estas pruebas no cuidan que la app funcione: cuidan que la app no nos meta en
// un pleito. Son cosas que, si se rompen, nadie se entera mirando la pantalla —
// se entera el día que llega una carta.
//
// Las tres cosas que vigilan:
//   1. Que las páginas legales existan y sigan diciendo lo que tienen que decir.
//   2. Que TODAS las páginas de la app lleven sus enlaces (una página sin el
//      enlace a la privacidad es, para California, una página sin política).
//   3. Que el pixel de Meta no se pueda volver a cargar sin permiso, que es
//      exactamente el error que había antes.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = ruta => readFileSync(new URL('../' + ruta, import.meta.url), 'utf8');

const PAGINAS_APP = ['index.html', 'app.html', 'login.html'];
const PAGINAS_LEGALES = ['privacidad.html', 'terminos.html', 'salud.html'];

describe('Las páginas legales existen y dicen lo que deben', () => {

  test('las tres páginas están, en inglés y en español', () => {
    for (const pagina of PAGINAS_LEGALES) {
      const html = leer(pagina);
      assert.match(html, /data-lang="en"/, pagina + ' debe traer la versión en inglés');
      assert.match(html, /data-lang="es"/, pagina + ' debe traer la versión en español');
    }
  });

  test('la privacidad cubre lo que exige cada ley', () => {
    const html = leer('privacidad.html');
    const obligatorio = [
      'Consumer Health Data',      // Washington My Health My Data
      'salud-datos',               // el ancla del enlace de datos de salud
      'Global Privacy Control',    // la señal que hay que respetar
      'CCPA',                      // California
      'sensitive personal',        // información sensible (CPRA)
      'under 13',                  // COPPA
      '22581',                     // borrado para menores en California
      'Standard Contractual',      // transferencias internacionales
      'biometric'                  // Illinois / Texas / Washington
    ];
    for (const trozo of obligatorio) {
      assert.ok(html.includes(trozo), 'La política de privacidad debe hablar de: ' + trozo);
    }
  });

  test('los términos traen los tres escudos: riesgo, límite y arbitraje', () => {
    const html = leer('terminos.html');
    const obligatorio = [
      'assume all risks',          // asunción de riesgo
      '1542',                      // renuncia del Código Civil de California
      'Limitation of liability',   // límite de responsabilidad
      'US$100',                    // el tope
      'arbitration',               // arbitraje
      'class',                     // renuncia a la demanda colectiva
      'opt out',                   // ...con salida, que es lo que la hace válida
      'Indemnification',
      'medical advice',           // decir que NO lo es
      '1789.3',                    // aviso obligatorio a consumidores de California
      'renews by itself'           // renovación automática, dicha claro
    ];
    for (const trozo of obligatorio) {
      assert.ok(html.includes(trozo), 'Los términos deben incluir: ' + trozo);
    }
  });

  test('el aviso de salud manda a un humano cuando hace falta', () => {
    const html = leer('salud.html');
    assert.ok(html.includes('911'), 'Debe decir a quién llamar en una emergencia.');
    assert.ok(html.includes('988'), 'Debe traer la línea de crisis.');
    assert.ok(html.includes('1-800-931-2237'), 'Debe traer la línea de trastornos alimenticios.');
  });
});

describe('Los enlaces legales están en TODAS las páginas', () => {

  for (const pagina of PAGINAS_APP) {
    test(pagina + ' enlaza privacidad, términos, salud y "tus opciones"', () => {
      const html = leer(pagina);
      assert.ok(html.includes('/privacidad.html'), pagina + ' sin enlace a la privacidad');
      assert.ok(html.includes('/terminos.html'), pagina + ' sin enlace a los términos');
      assert.ok(html.includes('/salud.html'), pagina + ' sin enlace al aviso de salud');
      assert.ok(html.includes('data-gg-privacidad'),
        pagina + ' sin el enlace "Tus opciones de privacidad" (lo pide California)');
      assert.ok(html.includes('privacidad.html#salud-datos'),
        pagina + ' sin el enlace de datos de salud (lo pide Washington)');
    });
  }

  test('crear cuenta obliga a aceptar, y se guarda cuándo se aceptó', () => {
    const html = leer('login.html');
    assert.ok(html.includes('id="acepto"'), 'Debe existir la casilla de aceptación.');
    assert.ok(html.includes('!acepto.checked'), 'Sin marcar la casilla no se debe crear la cuenta.');
    assert.ok(html.includes('legal_accepted_at'),
      'Hay que guardar CUÁNDO aceptó: sin eso no se puede demostrar que aceptó.');
  });

  test('el botón de borrar mis datos existe y llama al servidor', () => {
    const html = leer('login.html');
    assert.ok(html.includes('/api/borrar-datos'),
      'La política promete el borrado desde la app: tiene que llamar al servidor.');
  });
});

describe('El pixel de Meta no se enciende sin permiso', () => {

  test('pixel.js no contacta a Facebook por su cuenta', () => {
    const js = leer('pixel.js');
    // La librería de Facebook solo se puede pedir desde dentro de la función
    // que se llama DESPUÉS del permiso.
    assert.ok(js.includes('function cargarLibreriaDeFacebook'),
      'La carga de fbevents.js debe estar dentro de una función, no suelta.');
    assert.ok(js.includes('hayPermiso'), 'track() debe preguntar si hay permiso.');
    assert.ok(js.includes('ggConsent'), 'Debe apoyarse en consentimiento.js.');
  });

  test('ninguna página trae el pixel sin JavaScript (el <noscript> viejo)', () => {
    for (const pagina of PAGINAS_APP) {
      const html = leer(pagina);
      assert.ok(!html.includes('/api/px'),
        pagina + ': el pixel de <noscript> cargaba Facebook sin preguntar. No debe volver.');
    }
  });

  test('todas las páginas cargan consentimiento.js ANTES que pixel.js', () => {
    for (const pagina of [...PAGINAS_APP, ...PAGINAS_LEGALES]) {
      const html = leer(pagina);
      assert.ok(html.includes('/consentimiento.js'), pagina + ' no carga el consentimiento.');
      if (html.includes('/pixel.js')) {
        assert.ok(html.indexOf('/consentimiento.js') < html.indexOf('/pixel.js'),
          pagina + ': el consentimiento debe cargarse primero.');
      }
    }
  });
});

describe('La decisión del consentimiento (la lógica pura)', () => {
  // consentimiento.js está hecho para el navegador, así que aquí se lee el
  // archivo y se saca solo la función que decide. Sin DOM, sin navegador.
  const fuente = leer('consentimiento.js');
  const cuerpo = fuente.match(/function decidir\(guardado, gpc\) \{[\s\S]*?\n  \}/);
  assert.ok(cuerpo, 'No se encontró la función decidir() dentro de consentimiento.js');
  const decidir = new Function('return ' + cuerpo[0].trim())();

  test('nadie ha contestado todavía → sin publicidad y se pregunta', () => {
    const d = decidir(null, false);
    assert.equal(d.ads, false, 'Por defecto NO hay publicidad. Este era el error viejo.');
    assert.equal(d.mostrar, true);
  });

  test('dijo que sí → hay publicidad y no se vuelve a preguntar', () => {
    const d = decidir({ v: 1, ads: true }, false);
    assert.equal(d.ads, true);
    assert.equal(d.mostrar, false);
  });

  test('dijo que no → no hay publicidad y no se insiste', () => {
    const d = decidir({ v: 1, ads: false }, false);
    assert.equal(d.ads, false);
    assert.equal(d.mostrar, false);
  });

  test('el navegador manda GPC → manda el navegador, aunque hubiera dicho que sí', () => {
    const d = decidir({ v: 1, ads: true }, true);
    assert.equal(d.ads, false, 'El Global Privacy Control es vinculante en California.');
    assert.equal(d.mostrar, false, 'Y no se le molesta con el aviso: ya contestó su navegador.');
  });
});

describe('Los menores de 13 no pasan (COPPA)', () => {

  test('el formulario no deja poner menos de 13', () => {
    const html = leer('app.html');
    assert.ok(html.includes('id="edad" type="number" min="13"'),
      'La edad mínima del formulario debe ser 13.');
  });

  test('el servidor tampoco: la app no es la única defensa', () => {
    const js = leer('api/plan.js');
    assert.ok(js.includes('numeroOpcional(cuerpo.edad, 13, 99, true)'),
      'El servidor debe rechazar edades menores de 13 aunque alguien toque la página.');
  });
});
