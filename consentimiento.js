/* 🍪 EL PERMISO PARA MEDIR ANUNCIOS
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * El pixel de Meta se cargaba siempre, para todo el mundo, desde el primer
 * segundo. Eso, en California (CCPA/CPRA) y en Europa, es exactamente el tipo de
 * cosa por la que llegan las cartas de abogados: se está compartiendo actividad
 * de una persona con una red publicitaria sin haberle preguntado. Y en una app
 * de salud pesa el doble.
 *
 * A partir de aquí el pixel NO se enciende hasta que la persona diga que sí.
 * Si dice que no, o cierra el aviso, o su navegador manda la señal Global
 * Privacy Control, el pixel no se carga nunca. Todo lo demás de la app
 * (tu sesión, tu idioma, tu plan sin internet) sigue igual: eso es almacenamiento
 * necesario, no publicidad, y no se pregunta por ello.
 *
 * Cómo lo usa el resto del código:
 *   ggConsent.tiene('ads')      -> true / false
 *   ggConsent.cuando(fn)        -> llama a fn cuando haya (o ya haya) permiso
 *   ggConsent.abrir()           -> vuelve a enseñar el aviso ("Tus opciones")
 *   ggConsent.guardar(true)     -> lo que hacen los botones del aviso
 *
 * Cualquier enlace con  data-gg-privacidad  abre el aviso otra vez. Ese enlace
 * está en el pie de todas las páginas porque la ley de California pide que
 * "Tus opciones de privacidad" esté siempre a un clic.
 */
(function () {
  'use strict';

  var raiz = typeof window !== 'undefined' ? window : globalThis;
  var LLAVE = 'gg_consent';
  var VERSION = 1;

  /* ---------- guardar y leer la decisión ---------- */
  function leerGuardado() {
    try {
      var crudo = localStorage.getItem(LLAVE);
      if (!crudo) return null;
      var dato = JSON.parse(crudo);
      if (!dato || dato.v !== VERSION) return null;   // versión vieja: preguntar otra vez
      return dato;
    } catch (e) { return null; }
  }

  function escribirGuardado(dato) {
    try { localStorage.setItem(LLAVE, JSON.stringify(dato)); } catch (e) {}
  }

  /* ---------- ¿el navegador ya dijo que no? ----------
     Global Privacy Control es una señal que el navegador manda solo. En
     California y en varios estados más vale como un "no vendas ni compartas mis
     datos" legalmente vinculante: si viene, no se pregunta nada, se respeta. */
  function señalGPC(nav) {
    try {
      var n = nav || (typeof navigator !== 'undefined' ? navigator : null);
      return !!(n && n.globalPrivacyControl === true);
    } catch (e) { return false; }
  }

  /* ---------- LA DECISIÓN, EN UNA FUNCIÓN PURA ----------
     Sin DOM y sin navegador: así se puede probar de verdad en pruebas/.
       guardado : lo que haya en localStorage (o null)
       gpc      : true si el navegador manda la señal
     Devuelve qué permisos hay y si toca enseñar el aviso. */
  function decidir(guardado, gpc) {
    if (gpc) return { ads: false, mostrar: false, motivo: 'gpc' };
    if (!guardado) return { ads: false, mostrar: true, motivo: 'sin-respuesta' };
    return { ads: guardado.ads === true, mostrar: false, motivo: 'guardado' };
  }

  /* ---------- estado en memoria ---------- */
  var estado = { ads: false, motivo: 'sin-respuesta' };
  var enEspera = [];

  function avisarATodos() {
    while (enEspera.length) {
      var fn = enEspera.shift();
      try { fn(estado.ads); } catch (e) {}
    }
    try {
      if (raiz.dispatchEvent && typeof CustomEvent === 'function') {
        raiz.dispatchEvent(new CustomEvent('gg-consent', { detail: { ads: estado.ads } }));
      }
    } catch (e) {}
  }

  var api = {
    tiene: function (categoria) {
      if (categoria === 'ads' || categoria === 'publicidad') return estado.ads === true;
      return true;   // lo necesario siempre está permitido
    },
    // Llama a fn ahora si ya hay permiso; si no, cuando lo haya. Si la persona
    // dice que no, fn no se llama nunca. Así el pixel no se puede colar.
    cuando: function (fn) {
      if (typeof fn !== 'function') return;
      if (estado.ads) { try { fn(true); } catch (e) {} return; }
      enEspera.push(fn);
    },
    guardar: function (aceptaAds) {
      estado.ads = aceptaAds === true;
      estado.motivo = 'guardado';
      escribirGuardado({ v: VERSION, ads: estado.ads, ts: Date.now() });
      esconderAviso();
      if (estado.ads) avisarATodos();
    },
    abrir: function () { mostrarAviso(true); },
    // Expuesto solo para las pruebas automáticas.
    _decidir: decidir,
    _estado: function () { return { ads: estado.ads, motivo: estado.motivo }; }
  };
  raiz.ggConsent = api;

  /* ---------- el aviso en pantalla ---------- */
  var caja = null;

  function esEspañol() {
    try {
      var g = localStorage.getItem('gg_lang');
      if (g === 'es' || g === 'en') return g === 'es';
    } catch (e) {}
    var doc = (typeof document !== 'undefined' && document.documentElement &&
               document.documentElement.lang) || '';
    if (doc) return doc.slice(0, 2).toLowerCase() === 'es';
    var nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
    return nav.slice(0, 2).toLowerCase() === 'es';
  }

  var TXT = {
    es: {
      titulo: 'Cookies de publicidad',
      cuerpo: 'Usamos lo mínimo para que la app funcione (tu sesión, tu idioma, tu plan sin ' +
              'internet). Aparte de eso, ¿nos dejas medir si nuestros anuncios funcionan con el ' +
              'pixel de Meta? Tus datos de salud, tu peso y tus fotos nunca se mandan a ' +
              'publicidad, digas lo que digas.',
      si: 'Aceptar',
      no: 'No, gracias',
      mas: 'Política de Privacidad'
    },
    en: {
      titulo: 'Advertising cookies',
      cuerpo: 'We use the minimum for the app to work (your session, your language, your plan ' +
              'offline). Beyond that, may we measure whether our ads work, using the Meta pixel? ' +
              'Your health data, your weight and your photos are never sent to advertising, ' +
              'whatever you choose.',
      si: 'Accept',
      no: 'No thanks',
      mas: 'Privacy Policy'
    }
  };

  function estilos() {
    if (document.getElementById('ggConsentCss')) return;
    var s = document.createElement('style');
    s.id = 'ggConsentCss';
    s.textContent =
      '#ggConsent{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:560px;' +
      'margin:0 auto;background:#121215;color:#F3F3F1;border:1px solid #28282F;border-radius:14px;' +
      'padding:16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.55);' +
      'font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:.9rem;line-height:1.55}' +
      '#ggConsent b{display:block;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;' +
      'color:#8B8B95;margin-bottom:6px}' +
      '#ggConsent p{margin:0 0 12px}' +
      '#ggConsent a{color:#CCFF00}' +
      '#ggConsent .fila{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
      '#ggConsent button{cursor:pointer;border:none;font:inherit;font-weight:700;font-size:.85rem;' +
      'padding:.7em 1.2em;border-radius:4px;min-height:40px}' +
      '#ggConsent .si{background:#CCFF00;color:#0A0A0B}' +
      '#ggConsent .no{background:transparent;color:#F3F3F1;border:1px solid #28282F}' +
      '@media print{#ggConsent{display:none}}';
    document.head.appendChild(s);
  }

  function mostrarAviso() {
    if (typeof document === 'undefined' || !document.body) return;
    if (caja) { caja.style.display = 'block'; return; }
    estilos();
    var t = esEspañol() ? TXT.es : TXT.en;
    caja = document.createElement('div');
    caja.id = 'ggConsent';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-live', 'polite');
    caja.innerHTML =
      '<b></b><p></p><div class="fila">' +
      '<button type="button" class="si"></button>' +
      '<button type="button" class="no"></button>' +
      '<a href="/privacidad.html"></a></div>';
    // Los textos se ponen como texto, no como HTML: nada de lo de arriba se
    // arma con datos de nadie, y así sigue siendo imposible que se cuele algo.
    caja.querySelector('b').textContent = t.titulo;
    caja.querySelector('p').textContent = t.cuerpo;
    caja.querySelector('.si').textContent = t.si;
    caja.querySelector('.no').textContent = t.no;
    caja.querySelector('a').textContent = t.mas;
    caja.querySelector('.si').onclick = function () { api.guardar(true); };
    caja.querySelector('.no').onclick = function () { api.guardar(false); };
    document.body.appendChild(caja);
  }

  function esconderAviso() {
    if (caja) caja.style.display = 'none';
  }

  /* ---------- arranque ---------- */
  function iniciar() {
    var gpc = señalGPC();
    var d = decidir(leerGuardado(), gpc);
    estado.ads = d.ads;
    estado.motivo = d.motivo;

    // Si el navegador mandó GPC, dejamos constancia de que se respetó y no
    // molestamos con el aviso: la respuesta ya la dio el navegador.
    if (gpc) escribirGuardado({ v: VERSION, ads: false, ts: Date.now(), gpc: true });

    if (estado.ads) avisarATodos();
    if (d.mostrar) mostrarAviso();

    // "Tus opciones de privacidad" — en el pie de todas las páginas.
    if (typeof document !== 'undefined' && document.querySelectorAll) {
      var enlaces = document.querySelectorAll('[data-gg-privacidad]');
      for (var i = 0; i < enlaces.length; i++) {
        enlaces[i].addEventListener('click', function (ev) {
          ev.preventDefault();
          api.abrir();
        });
      }
    }
  }

  if (typeof document === 'undefined') return;   // corriendo en pruebas, sin navegador
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
