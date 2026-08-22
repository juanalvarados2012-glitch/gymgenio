/* 📣 META PIXEL DE FACEBOOK
   Carga el pixel de Meta para poder medir de verdad los anuncios pagados.
   El número del pixel NO vive aquí: lo guarda Vercel (META_PIXEL_ID) y este
   archivo se lo pide a /api/config, igual que ya hacemos con Supabase.

   🔒 NADA DE ESTO PASA SIN PERMISO. Antes el pixel se cargaba siempre, para
   todo el mundo, desde el primer segundo. En California y en Europa eso es
   compartir la actividad de una persona con una red publicitaria sin haberle
   preguntado — y en una app de salud pesa el doble. Ahora este archivo no
   contacta a Facebook hasta que consentimiento.js dice que sí. Si la persona
   dice que no, si cierra el aviso, o si su navegador manda la señal Global
   Privacy Control, aquí no se carga nada y los eventos se quedan sin mandar.
   Si consentimiento.js no está en la página, tampoco se carga: al no saber si
   hay permiso, se asume que no.

   Eventos que mandamos:
     · PageView             -> automático, en cada página
     · CompleteRegistration -> cuando alguien termina el onboarding gratis
     · InitiateCheckout     -> automático, al tocar cualquier botón de pago
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
  // Este vive en sessionStorage (se borra al cerrar la pestaña), no en el otro:
  // querer pagar hoy y querer pagar mañana son dos intentos distintos.
  var K_CHECKOUT = 'gg_fb_checkout';

  function leer(k) {
    try { return localStorage.getItem(k) || ''; } catch (e) { return ''; }
  }
  function escribir(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  // ---------- Código base estándar del Meta Pixel (fbevents.js) ----------
  // Deja listo window.fbq y va guardando los eventos hasta que carga el script.
  // Si YA existe un fbq (otro pixel o Tag Manager), no lo tocamos: solo lo usamos.
  //
  // ⚠️ Esto ya NO corre al cargar la página. Corre dentro de encender(), o sea
  // solo después de que la persona aceptó. Traer fbevents.js desde Facebook ya
  // es, por sí solo, contactar a Facebook y darle la IP de quien visita.
  function cargarLibreriaDeFacebook() {
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

  // ¿Tenemos permiso para medir? La respuesta la da consentimiento.js. Si ese
  // archivo no está cargado, la respuesta es NO: preferimos medir de menos que
  // rastrear a alguien que nunca dijo que sí.
  function hayPermiso() {
    return !!(window.ggConsent && window.ggConsent.tiene('ads'));
  }

  // Cola propia: si alguien pide un evento antes de tener el número del pixel,
  // lo guardamos y lo mandamos apenas el pixel esté encendido.
  var encendido = false;
  var pendientes = [];

  function track(evento, datos) {
    // Sin permiso no se guarda ni se manda nada. Si la persona acepta después,
    // consentimiento.js nos llama y a partir de ahí sí se mide.
    if (!hayPermiso()) return;
    if (!encendido) { pendientes.push([evento, datos]); return; }
    try {
      if (datos) window.fbq('track', evento, datos);
      else window.fbq('track', evento);
    } catch (e) {}
  }

  function encender(pixelId) {
    if (encendido || !pixelId) return;
    try {
      cargarLibreriaDeFacebook();
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

  // Tocó un botón de pago: empezó el camino de la compra. ESTE es el evento que
  // de verdad alimenta a Meta: para aprender a quién mostrar el anuncio necesita
  // ~50 conversiones por semana, y compras de $14.99 nunca van a ser 50 al
  // principio. Clics al checkout sí. Sin esta señal el anuncio gasta a ciegas.
  //
  // Se manda UNA vez por visita (sessionStorage), no una por página: el camino
  // normal de alguien que llega del anuncio es
  //     precios → login → Stripe
  // y las tres son la MISMA intención de compra. Si contáramos cada clic, una
  // sola persona parecerían tres y Meta aprendería de un número inflado.
  // Cerrar la pestaña y volver mañana sí cuenta como intento nuevo: lo es.
  function checkout() {
    try {
      if (sessionStorage.getItem(K_CHECKOUT)) return;
      sessionStorage.setItem(K_CHECKOUT, '1');
    } catch (e) {} // modo incógnito o storage bloqueado: mejor medir de más
    track('InitiateCheckout', { value: PRECIO_PRO_USD, currency: MONEDA_PRO });
  }

  window.ggPixel = { track: track, registro: registro, compra: compra, checkout: checkout };

  // 🎯 Un solo vigilante para TODOS los botones de pago de todas las páginas.
  // Los botones de pago se arman en varios lugares (index, login, y dentro de
  // app.html se dibujan con innerHTML cuando aparece la ruta o el upsell). Poner
  // el evento en cada uno sería olvidarse de alguno tarde o temprano; en cambio
  // escuchamos el clic aquí arriba y preguntamos a dónde iba.
  //
  // Contamos dos casos, porque los dos son "quiero pagar":
  //   · un enlace directo a Stripe (quien ya inició sesión), y
  //   · un botón marcado con data-gg-pago (quien NO ha iniciado sesión y por eso
  //     pasa primero por /login.html). Este segundo es la mayoría de la gente
  //     que llega desde un anuncio, así que sin él no mediríamos casi nada.
  document.addEventListener('click', function (ev) {
    var destino = ev.target && ev.target.closest && ev.target.closest('a[href], [data-gg-pago]');
    if (!destino) return;
    if (destino.hasAttribute('data-gg-pago') ||
        String(destino.href || '').indexOf('buy.stripe.com') !== -1) checkout();
  }, true);

  // ---------- Buscar el número del pixel en Vercel (solo con permiso) ----------
  // ggConsent.cuando(fn) llama a fn ahora si ya hay permiso, o el día que la
  // persona lo dé. Si dice que no, fn no se llama nunca y aquí no pasa nada.
  function arrancar() {
    fetch('/api/config')
      .then(function (r) { return r.json(); })
      .then(function (cfg) { encender(cfg && cfg.metaPixelId); })
      .catch(function () {});
  }

  if (window.ggConsent && window.ggConsent.cuando) {
    window.ggConsent.cuando(arrancar);
  } else {
    // consentimiento.js todavía no ha cargado (orden de los <script>). Esperamos
    // su aviso; si nunca llega, nunca se enciende, que es lo correcto.
    window.addEventListener('gg-consent', function (ev) {
      if (ev && ev.detail && ev.detail.ads) arrancar();
    });
  }
})();
