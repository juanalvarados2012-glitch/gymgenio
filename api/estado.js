// 🧞 ¿QUIÉN ERES Y QUÉ PLAN TIENES?
// El navegador manda el token de la cuenta (Supabase) y este archivo responde:
//   { email: "...", pro: true/false }
// Sirve para que la barra de arriba diga "Pro" o "Gratis" en TODAS las páginas.

const limitesEstado = new Map();
const VENTANA_ESTADO_MS = 15 * 60 * 1000;

async function fetchConTiempo(url, opciones, milisegundos = 10000) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), milisegundos);
  try {
    return await fetch(url, { ...(opciones || {}), signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

function origenPermitido(req) {
  const origen = req.headers && req.headers.origin;
  if (!origen) return true;
  if (origen === 'null') return false;
  const hosts = [req.headers.host, req.headers['x-forwarded-host']]
    .filter(Boolean)
    .flatMap(h => String(h).split(',').map(x => x.trim()))
    .filter(Boolean);
  return hosts.some(host => origen === 'https://' + host || origen === 'http://' + host);
}

function revisarLimite(email) {
  const clave = String(email || '').trim().toLowerCase();
  const ahora = Date.now();
  let cubeta = limitesEstado.get(clave);
  if (!cubeta || ahora - cubeta.inicio >= VENTANA_ESTADO_MS) cubeta = { inicio: ahora, cantidad: 0 };
  cubeta.cantidad++;
  limitesEstado.set(clave, cubeta);
  if (limitesEstado.size > 2000) {
    for (const [viejaClave, viejoValor] of limitesEstado) {
      if (ahora - viejoValor.inicio >= VENTANA_ESTADO_MS) limitesEstado.delete(viejaClave);
    }
  }
  return {
    permitido: cubeta.cantidad <= 60,
    espera: Math.max(1, Math.ceil((VENTANA_ESTADO_MS - (ahora - cubeta.inicio)) / 1000))
  };
}

// Saca el correo del usuario a partir de su token de Supabase.
async function emailDelToken(auth) {
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
    return u && u.email ? u.email : '';
  } catch (e) {
    return '';
  }
}

// Le pregunta a Stripe si ese correo tiene una suscripción ACTIVA.
// Stripe es la fuente de la verdad: si cancela, deja de ser Pro solito.
async function tieneSuscripcion(email) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk || !email) return false;
  try {
    const c = await fetchConTiempo(
      'https://api.stripe.com/v1/customers?limit=1&email=' + encodeURIComponent(email),
      { headers: { Authorization: 'Bearer ' + sk } }
    );
    if (!c.ok) return false;
    const lista = await c.json();
    for (const cliente of (lista.data || [])) {
      for (const estado of ['active', 'trialing']) {
        const s = await fetchConTiempo(
          'https://api.stripe.com/v1/subscriptions?limit=1&status=' + estado + '&customer=' + encodeURIComponent(cliente.id),
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  if (!origenPermitido(req)) return res.status(403).json({ error: 'Origen no permitido.' });

  const email = (await emailDelToken(req.headers.authorization || '')).trim().toLowerCase();
  if (!email) return res.status(200).json({ email: '', pro: false });

  const limite = revisarLimite(email);
  if (!limite.permitido) {
    res.setHeader('Retry-After', String(limite.espera));
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' });
  }

  const pro = await tieneSuscripcion(email);
  return res.status(200).json({ email, pro });
}
