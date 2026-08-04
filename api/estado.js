// 🧞 ¿QUIÉN ERES Y QUÉ PLAN TIENES?
// El navegador manda el token de la cuenta (Supabase) y este archivo responde:
//   { email: "...", pro: true/false }
// Sirve para que la barra de arriba diga "Pro" o "Gratis" en TODAS las páginas.

// Saca el correo del usuario a partir de su token de Supabase.
async function emailDelToken(auth) {
  if (!auth || auth.indexOf('Bearer ') !== 0) return '';
  const token = auth.slice(7).trim();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (!token || !url) return '';
  try {
    const r = await fetch(url + '/auth/v1/user', {
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
    const c = await fetch(
      'https://api.stripe.com/v1/customers?limit=10&email=' + encodeURIComponent(email),
      { headers: { Authorization: 'Bearer ' + sk } }
    );
    if (!c.ok) return false;
    const lista = await c.json();
    for (const cliente of (lista.data || [])) {
      for (const estado of ['active', 'trialing']) {
        const s = await fetch(
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
  const email = await emailDelToken(req.headers.authorization || '');
  if (!email) {
    return res.status(200).json({ email: '', pro: false });
  }
  const pro = await tieneSuscripcion(email);
  return res.status(200).json({
    email,
    pro,
    // Si falta la llave de Stripe, nadie puede salir Pro. Sirve para saberlo.
    llaveStripe: !!process.env.STRIPE_SECRET_KEY
  });
}
