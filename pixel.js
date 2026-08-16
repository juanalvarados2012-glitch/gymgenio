/* 📣 META PIXEL DE FACEBOOK
   Carga el pixel de Meta para poder medir de verdad los anuncios pagados.
   El número del pixel NO vive aquí: lo guarda Vercel (META_PIXEL_ID) y este
   archivo se lo pide a /api/config, igual que ya hacemos con Supabase.

   Eventos que mandamos:
     · PageView             -> automático, en cada página
     · CompleteRegistration -> cuando alguien termina el onboarding gratis
     · Purchase             -> cuando Stripe confirma el pago de Pro

   Para usarlo desde cualquier página:
     window.ggPixel.registro();   // CompleteRegistration (una sola vez)
     window.ggPixel.compra(id);   // Purchase (una sola vez por pago)
*/
(function () {
  'use strict';

  // 💵 Precio de Pro en un solo lugar. Si algún día sube, se cambia AQUÍ.
  var PRECIO_PRO_USD = 14.99;
  var MONEDA_PRO = 'USD';
  window.GG_PRO_PRECIO_USD = PRECIO_PRO_USD;
  window.GG_PRO_MONEDA = MONEDA_PRO;

  // Llaves para no repetir eventos aunque el usuario recargue la página.
  var K_REGISTRO = 'gg_fb_registro';
  var K_COMPRA = 'gg_fb_compra';

  function leer(k) {
    try { return localStorage.getItem(k) || ''; } catch (e) { return ''; }
  }
  function escribir(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  // ---------- Código base estándar del Meta Pixel (fbevents.js) ----------
  // Deja listo window.fbq y va guardando los eventos hasta que carga el script.
  // Si YA existe un fbq (otro pixel o Tag Manager), no lo tocamos: solo lo usamos.
  var yaHabiaPixel = !!window.fbq;
  if (!yaHabiaPixel) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  // Cola propia: si alguien pide un evento antes de tener el número del pixel,
  // lo guardamos y lo mandamos apenas el pixel esté encendido.
  var encendido = false;
  var pendientes = [];

  function track(evento, datos) {
    if (!encendido) { pendientes.push([evento, datos]); return; }
    try {
      if (datos) window.fbq('track', evento, datos);
      else window.fbq('track', evento);
    } catch (e) {}
  }

  function encender(pixelId) {
    if (encendido || !pixelId) return;
    try {
      window.fbq('init', String(pixelId));
      encendido = true;
      // 👇 PageView automático. Solo una vez por carga de página, y solo si
      // ningún otro pixel/analítica lo mandó ya (revisado: no hay otro).
      if (!window.__ggPageViewEnviado) {
        window.__ggPageViewEnviado = true;
        window.fbq('track', 'PageView');
      }
      while (pendientes.length) {
        var p = pendientes.shift();
        track(p[0], p[1]);
      }
    } catch (e) {}
  }

  // ---------- Eventos de conversión ----------

  // Terminó el onboarding gratis (ya tiene su primer plan). Una sola vez.
  function registro() {
    if (leer(K_REGISTRO)) return;
    escribir(K_REGISTRO, '1');
    track('CompleteRegistration', { currency: MONEDA_PRO, value: 0 });
  }

  // Stripe confirmó el pago de Pro. Una sola vez por sesión de pago.
  function compra(idPago) {
    var marca = String(idPago || '') || '1';
    if (leer(K_COMPRA) === marca) return;
    escribir(K_COMPRA, marca);
    track('Purchase', { value: PRECIO_PRO_USD, currency: MONEDA_PRO });
  }

  window.ggPixel = { track: track, registro: registro, compra: compra };

  // ---------- Buscar el número del pixel en Vercel ----------
  fetch('/api/config')
    .then(function (r) { return r.json(); })
    .then(function (cfg) { encender(cfg && cfg.metaPixelId); })
    .catch(function () {});
})();
