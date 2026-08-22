/* 📄 EL INTERRUPTOR DE IDIOMA DE LAS PÁGINAS LEGALES
 *
 * En el resto de la app cada frase vive en un diccionario. Aquí no: un documento
 * legal se lee entero, y traducir frase por frase invita a que una versión quede
 * con una cláusula que la otra no tiene. Por eso cada página trae los DOS
 * documentos completos, uno dentro de <section data-lang="en"> y otro dentro de
 * <section data-lang="es">, y esto solo enseña el que toca.
 *
 * Ambas versiones dicen lo mismo. Si algún día no coincidieran, manda la
 * versión en inglés (así lo dice cada documento).
 */
(function () {
  'use strict';

  function guardado() {
    try { return localStorage.getItem('gg_lang') || ''; } catch (e) { return ''; }
  }
  function guardar(l) {
    try { localStorage.setItem('gg_lang', l); } catch (e) {}
  }

  // Qué idioma toca: 1) el que la persona ya eligió en la app, 2) ?lang=es,
  // 3) el del navegador, 4) inglés.
  function idiomaInicial() {
    var url = '';
    try { url = new URLSearchParams(location.search).get('lang') || ''; } catch (e) {}
    if (url === 'es' || url === 'en') return url;
    var g = guardado();
    if (g === 'es' || g === 'en') return g;
    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return nav === 'es' ? 'es' : 'en';
  }

  function pintar(lang) {
    document.documentElement.lang = lang;
    // Ojo: SOLO las <section> del documento. Los botones EN/ES también llevan
    // data-lang, y esconderlos dejaba a la persona sin poder cambiar de idioma.
    var bloques = document.querySelectorAll('section[data-lang]');
    for (var i = 0; i < bloques.length; i++) {
      bloques[i].hidden = bloques[i].getAttribute('data-lang') !== lang;
    }
    var botones = document.querySelectorAll('#lang button');
    for (var j = 0; j < botones.length; j++) {
      botones[j].classList.toggle('on', botones[j].getAttribute('data-lang') === lang);
    }
  }

  function iniciar() {
    var lang = idiomaInicial();
    pintar(lang);
    var botones = document.querySelectorAll('#lang button');
    for (var i = 0; i < botones.length; i++) {
      botones[i].addEventListener('click', function () {
        var l = this.getAttribute('data-lang');
        guardar(l);
        pintar(l);
      });
    }
    // Si la dirección trae #algo (un enlace directo a una sección), llevamos
    // la pantalla ahí DESPUÉS de enseñar el idioma correcto: si no, el
    // navegador busca un ancla que todavía estaba escondida y no se mueve.
    if (location.hash) {
      var destino = document.getElementById(location.hash.slice(1));
      if (destino) destino.scrollIntoView();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
