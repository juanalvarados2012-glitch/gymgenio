// 🧰 LA CAJA DE HERRAMIENTAS COMPARTIDA
//
// Antes cada archivo de /api tenía su propia copia del guardia (¿quién eres?
// ¿pagaste?). Eso es peligroso: si arreglas el guardia en un archivo y te
// olvidas del otro, queda una puerta abierta — y eso ya nos pasó una vez.
//
// Ahora el guardia vive AQUÍ, una sola vez. Todos los endpoints lo usan.
// Arreglas algo aquí = arreglado en toda la app.
//
// ⚠️ El nombre empieza con "_" a propósito: Vercel NO convierte en endpoint
// los archivos de /api que empiezan con guion bajo. Este archivo es ayudante,
// no es una puerta a la que alguien pueda tocar desde internet.

/* ============ INTERNET CON RELOJ ============ */
// Nunca esperamos para siempre: si algo no contesta, cortamos.
export async function fetchConTiempo(url, opciones, milisegundos = 10000) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), milisegundos);
  try {
    return await fetch(url, { ...(opciones || {}), signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

/* ============ LIMPIEZA DE DATOS ============ */
export function textoSeguro(valor, max) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

export function emailSeguro(valor) {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
}

export function numeroOpcional(valor, min, max, entero) {
  if (valor === '' || valor === null || valor === undefined) return '';
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min || n > max || (entero && !Number.isInteger(n))) return '';
  return n;
}

/* ============ ¿DE DÓNDE VIENE LA LLAMADA? ============ */
// Solo aceptamos llamadas hechas desde nuestra propia página. Así otra web no
// puede poner un botón que gaste NUESTRA cuenta de IA.
export function origenPermitido(req) {
  const origen = req.headers && req.headers.origin;
  if (!origen) return true; // llamadas de servidor a servidor no llevan Origin
  if (origen === 'null') return false;
  const hosts = [req.headers.host, req.headers['x-forwarded-host']]
    .filter(Boolean)
    .flatMap(h => String(h).split(',').map(x => x.trim()))
    .filter(Boolean);
  return hosts.some(host => origen === 'https://' + host || origen === 'http://' + host);
}

export function ipCliente(req) {
  const reenviado = req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip']);
  return String(reenviado || 'unknown').split(',')[0].trim().slice(0, 100) || 'unknown';
}

/* ============ EL FRENO (LÍMITE DE PETICIONES) ============ */
// Cuenta cuántas veces pide algo la misma persona (o la misma IP) en un rato.
// Vive en la memoria de la función: se reinicia si Vercel la duerme, pero corta
// en seco un bucle de robot. Es gratis y no necesita base de datos.
//
//   const freno = crearLimitador({ ventanaMs: 60000, maximo: 6 });
//   freno.revisar('ip:1.2.3.4')  ->  { permitido:true, espera:41 }
export function crearLimitador({ ventanaMs, maximo, maximoRegistros = 2000 }) {
  const cubetas = new Map();
  return {
    revisar(identidad, maximoPropio) {
      const ahora = Date.now();
      // Ojo: un tope de 0 es válido ("no dejes pasar nada"), por eso no vale
      // con `maximoPropio || maximo` — el 0 se colaría como "no me dijeron nada".
      const tope = Number.isFinite(maximoPropio) ? maximoPropio : maximo;
      let cubeta = cubetas.get(identidad);
      if (!cubeta || ahora - cubeta.inicio >= ventanaMs) cubeta = { inicio: ahora, cantidad: 0 };
      cubeta.cantidad++;
      cubetas.set(identidad, cubeta);
      // Limpieza: no dejamos que la memoria crezca sin control.
      if (cubetas.size > maximoRegistros) {
        for (const [clave, valor] of cubetas) {
          if (ahora - valor.inicio >= ventanaMs) cubetas.delete(clave);
        }
        if (cubetas.size > maximoRegistros) cubetas.clear();
      }
      return {
        permitido: cubeta.cantidad <= tope,
        espera: Math.max(1, Math.ceil((ventanaMs - (ahora - cubeta.inicio)) / 1000))
      };
    }
  };
}

/* ============ ¿QUIÉN ERES? ============ */
// Saca el correo del usuario a partir de su token de Supabase.
export async function emailDelToken(auth) {
  if (!auth || auth.indexOf('Bearer ') !== 0) return '';
  const token = auth.slice(7).trim();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (!token || !url) return '';
  try {
    const r = await fetchConTiempo(url + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + token, apikey: key }
    });
    if (!r.ok) return '';
    const u = await r.json();
    return emailSeguro(u && u.email);
  } catch (e) {
    return '';
  }
}

/* ============ PRO DE CORTESÍA (SIN PAGAR) ============ */
// A veces queremos regalar Pro a alguien sin cobrarle: un creador que va a
// probar la app un mes y enseñarla a su público, un familiar, nosotros mismos
// para hacer pruebas. En vez de tocar el código cada vez, los correos viven en
// una variable de Vercel: CORREOS_PRO = "ana@correo.com, luis@correo.com".
//
// Si la variable está vacía (lo normal), esto siempre dice "no" y la app se
// comporta EXACTAMENTE igual que antes: Pro solo con pago de Stripe.
export function enListaPro(email) {
  const correo = emailSeguro(email);
  if (!correo) return false;
  return (process.env.CORREOS_PRO || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(correo);
}

/* ============ ¿PAGASTE? ============ */
// Le pregunta a Stripe si ese correo tiene una suscripción ACTIVA.
// Stripe es la fuente de la verdad: si cancela, deja de ser Pro solito.
export async function tieneSuscripcion(email) {
  const sk = process.env.STRIPE_SECRET_KEY;
  const correo = emailSeguro(email);
  if (!sk || !correo) return false;
  try {
    const c = await fetchConTiempo(
      'https://api.stripe.com/v1/customers?limit=10&email=' + encodeURIComponent(correo),
      { headers: { Authorization: 'Bearer ' + sk } }
    );
    if (!c.ok) return false;
    const lista = await c.json();
    for (const cliente of (lista.data || [])) {
      for (const estado of ['active', 'trialing']) {
        const s = await fetchConTiempo(
          'https://api.stripe.com/v1/subscriptions?limit=1&status=' + estado +
          '&customer=' + encodeURIComponent(cliente.id),
          { headers: { Authorization: 'Bearer ' + sk } }
        );
        if (!s.ok) continue;
        const subs = await s.json();
        if ((subs.data || []).length > 0) return true;
      }
    }
  } catch (e) {
    console.error('No se pudo revisar Stripe:', e);
  }
  return false;
}

// Plan B: acaba de pagar y viene de Stripe con ?session_id=...
//
// 🔒 EL BOLETO SOLO VALE SI ES TUYO. Un session_id no es secreto: viaja en la
// URL, queda en el historial, se puede compartir por WhatsApp. Si aceptáramos
// cualquiera, UNA sola persona que pagó le daría Pro gratis a medio internet.
// Por eso exigimos que el correo del recibo sea el mismo de la cuenta que pide.
export async function pagoRecienHecho(sessionId, emailCuenta) {
  const sk = process.env.STRIPE_SECRET_KEY;
  const cuenta = emailSeguro(emailCuenta);
  if (!sk || !sessionId || !cuenta) return false;
  if (!/^cs_[A-Za-z0-9_]+$/.test(String(sessionId))) return false;
  try {
    const ver = await fetchConTiempo(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      { headers: { Authorization: 'Bearer ' + sk } }
    );
    if (!ver.ok) return false;
    const sesion = await ver.json();
    const emailPago = emailSeguro(
      (sesion.customer_details && sesion.customer_details.email) || sesion.customer_email
    );
    if (!emailPago || emailPago !== cuenta) return false;
    return sesion.status === 'complete' && sesion.payment_status === 'paid';
  } catch (e) {
    console.error('No se pudo verificar el pago:', e);
    return false;
  }
}

// El guardia completo en una sola línea: ¿esta persona es Pro, sí o no?
export async function esProDeVerdad(email, sessionId) {
  if (enListaPro(email)) return true;            // Pro de cortesía (sin pagar)
  if (await tieneSuscripcion(email)) return true;
  return pagoRecienHecho(sessionId, email);
}

/* ============ EL DÍA DE HOY, DONDE ESTÁ LA PERSONA ============ */
// El servidor vive en horario universal (UTC). Alguien en México que cena a las
// 8 de la noche ya es "mañana" para el servidor: su cena se guardaría en el día
// equivocado y el total de hoy saldría en cero.
//
// Por eso el navegador nos manda su desfase horario (lo que da
// getTimezoneOffset: minutos que hay que sumarle a la hora local para llegar a
// UTC) y aquí calculamos SU fecha, no la nuestra.
export function fechaLocal(desfaseMinutos) {
  const off = Number(desfaseMinutos);
  // Las zonas horarias reales van de -14 h a +14 h. Fuera de ahí, no le creemos.
  const seguro = Number.isFinite(off) && Math.abs(off) <= 840 ? Math.round(off) : 0;
  return new Date(Date.now() - seguro * 60000).toISOString().slice(0, 10);
}

/* ============ LEER LO QUE MANDÓ LA IA ============ */
// Las IA a veces envuelven el JSON en ```json ... ``` o le ponen un "¡Claro!"
// adelante. Esto se queda solo con lo que está entre la primera { y la última }.
export function jsonDeLaIA(texto) {
  let limpio = String(texto || '').replace(/```(?:json)?/gi, '').trim();
  const ini = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (ini !== -1 && fin !== -1) limpio = limpio.slice(ini, fin + 1);
  try {
    return JSON.parse(limpio);
  } catch (e) {
    return null;
  }
}
