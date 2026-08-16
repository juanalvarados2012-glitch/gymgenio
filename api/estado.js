// 🧞 ¿QUIÉN ERES Y QUÉ PLAN TIENES?
// El navegador manda el token de la cuenta (Supabase) y este archivo responde:
//   { email: "...", pro: true/false }
// Sirve para que la barra de arriba diga "Pro" o "Gratis" en TODAS las páginas.

import { origenPermitido, crearLimitador, emailDelToken, tieneSuscripcion } from './_comun.js';

const freno = crearLimitador({ ventanaMs: 15 * 60 * 1000, maximo: 60 });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  if (!origenPermitido(req)) return res.status(403).json({ error: 'Origen no permitido.' });

  const email = await emailDelToken(req.headers.authorization || '');
  if (!email) return res.status(200).json({ email: '', pro: false });

  const limite = freno.revisar('user:' + email);
  if (!limite.permitido) {
    res.setHeader('Retry-After', String(limite.espera));
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' });
  }

  return res.status(200).json({ email, pro: await tieneSuscripcion(email) });
}
